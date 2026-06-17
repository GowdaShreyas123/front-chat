import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from './client';

// Auth Endpoints
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/auth/me');
      return data.data.user;
    },
    retry: false,
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: any) => {
      const { data } = await apiClient.post('/api/v1/auth/login', credentials);
      return data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['user'], data.user);
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credentials: any) => {
      const { data } = await apiClient.post('/api/v1/auth/register', credentials);
      return data.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      queryClient.setQueryData(['user'], data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await apiClient.post('/api/v1/auth/logout');
    },
    onSettled: () => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
      window.location.href = '/login';
    },
  });
};

// Chat Endpoints
export const useChats = () => {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => {
      const { data } = await apiClient.get('/api/v1/chats/');
      return data.data.chats;
    },
  });
};

export const useChatDetails = (chatId: string | null) => {
  return useQuery({
    queryKey: ['chat', chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data } = await apiClient.get(`/api/v1/chats/${chatId}`);
      return data.data.chat;
    },
    enabled: !!chatId,
  });
};

export const useCreateChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (title?: string) => {
      const { data } = await apiClient.post('/api/v1/chats/', { title });
      return data.data.chat;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useDeleteChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (chatId: string) => {
      await apiClient.delete(`/api/v1/chats/${chatId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

export const useUpdateChatTitle = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ chatId, title }: { chatId: string, title: string }) => {
      await apiClient.patch(`/api/v1/chats/${chatId}`, { title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chats'] });
    },
  });
};

// Message Endpoints
export const useChatMessages = (chatId: string | null) => {
  return useQuery({
    queryKey: ['messages', chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data } = await apiClient.get(`/api/v1/messages/${chatId}`);
      return data.data.messages;
    },
    enabled: !!chatId,
  });
};

export const useSendMessage = (chatId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ content, imageUrl }: { content: string; imageUrl?: string }) => {
      const token = localStorage.getItem('accessToken');
      const baseURL = apiClient.defaults.baseURL || 'http://localhost:5000';
      const response = await fetch(`${baseURL}/api/v1/messages/${chatId}?stream=true`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content, imageUrl })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      
      let aiMessageContent = '';
      const aiMessageId = Math.random().toString();
      
      queryClient.setQueryData(['messages', chatId], (old: any) => {
        return [...(old || []), {
           _id: aiMessageId,
           role: 'assistant',
           content: '',
           createdAt: new Date().toISOString()
        }];
      });

      while (!done) {
        const { value, done: readerDone } = await reader!.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let messageEndIndex;
          while ((messageEndIndex = buffer.indexOf('\n\n')) >= 0) {
            const message = buffer.slice(0, messageEndIndex);
            buffer = buffer.slice(messageEndIndex + 2);
            
            const lines = message.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                if (!jsonStr.trim()) continue;
                try {
                  const data = JSON.parse(jsonStr);
                  if (data.error) throw new Error(data.error);
                  if (data.done) return data.result;
                  if (data.text) {
                    aiMessageContent += data.text;
                    queryClient.setQueryData(['messages', chatId], (old: any) => {
                       return old.map((msg: any) => msg._id === aiMessageId ? { ...msg, content: aiMessageContent } : msg);
                    });
                  }
                } catch (e: any) {
                  if (!e.message.includes('JSON')) {
                     throw e;
                  }
                }
              }
            }
          }
        }
      }
      return null;
    },
    onMutate: async ({ content, imageUrl }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['messages', chatId] });

      // Snapshot the previous value
      const previousMessages = queryClient.getQueryData(['messages', chatId]);

      // Optimistically update to the new value
      const optimisticMessage = {
        _id: Math.random().toString(),
        content,
        imageUrl,
        role: 'user',
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(['messages', chatId], (old: any) => {
        return old ? [...old, optimisticMessage] : [optimisticMessage];
      });

      // Return a context with the previous data
      return { previousMessages };
    },
    onError: (_err, _variables, context: any) => {
      // Rollback to the previous value if mutation fails
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', chatId], context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', chatId] });
      queryClient.invalidateQueries({ queryKey: ['messages', chatId] });
    },
  });
};
