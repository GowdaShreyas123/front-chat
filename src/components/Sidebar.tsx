
import { useState } from 'react';
import { useChats, useCreateChat, useDeleteChat, useUpdateChatTitle, useLogout, useUser } from '../api/hooks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { PlusCircle, MessageSquare, Trash2, LogOut, Pencil } from 'lucide-react';

export function Sidebar({ selectedChatId, onSelectChat }: { selectedChatId: string | null; onSelectChat: (id: string) => void }) {
  const { data: chats, isLoading } = useChats();
  const createChatMutation = useCreateChat();
  const deleteChatMutation = useDeleteChat();
  const updateChatTitleMutation = useUpdateChatTitle();
  const logoutMutation = useLogout();
  const { data: user } = useUser();
  const [editingChat, setEditingChat] = useState<{ id: string, title: string } | null>(null);

  const handleCreateChat = async () => {
    const newChat = await createChatMutation.mutateAsync('New Chat');
    if (newChat && newChat._id) {
      onSelectChat(newChat._id);
    }
  };

  const handleDelete = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    await deleteChatMutation.mutateAsync(chatId);
    if (selectedChatId === chatId) {
      onSelectChat('');
    }
  };

  return (
    <div className="w-64 border-r border-border bg-card flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-border">
        <Button 
          onClick={handleCreateChat} 
          className="w-full justify-start gap-2 h-12 shadow-sm transition-all"
          disabled={createChatMutation.isPending}
        >
          <PlusCircle className="h-5 w-5" />
          {createChatMutation.isPending ? 'Creating...' : 'New chat'}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground animate-pulse">Loading chats...</div>
        ) : chats?.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No chats yet</div>
        ) : (
          chats?.map((chat: any) => (
            <div
              key={chat._id}
              onClick={() => onSelectChat(chat._id)}
              className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all ${
                selectedChatId === chat._id 
                  ? 'bg-primary/10 text-primary font-medium' 
                  : 'hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">{chat.title || 'New Chat'}</span>
              </div>
              <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingChat({ id: chat._id, title: chat.title || 'New Chat' });
                  }}
                  className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  title="Edit title"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => handleDelete(e, chat._id)}
                  className={`p-1.5 text-muted-foreground hover:text-destructive transition-colors ${
                    deleteChatMutation.isPending ? 'opacity-50 pointer-events-none' : ''
                  }`}
                  title="Delete chat"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-border flex flex-col gap-3 bg-muted/20">
        <div className="flex items-center gap-3 px-2">
          <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="text-sm font-medium truncate flex-1">{user?.name || 'User'}</span>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10" 
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      {editingChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-full max-w-sm animate-in zoom-in-95">
             <h3 className="text-lg font-semibold mb-4">Edit Chat Title</h3>
             <form onSubmit={async (e) => {
                e.preventDefault();
                await updateChatTitleMutation.mutateAsync({ chatId: editingChat.id, title: editingChat.title });
                setEditingChat(null);
             }}>
               <Input 
                 value={editingChat.title} 
                 onChange={(e) => setEditingChat({ ...editingChat, title: e.target.value })}
                 className="mb-6 h-12"
                 autoFocus
                 placeholder="Enter a new title..."
               />
               <div className="flex justify-end gap-3">
                 <Button type="button" variant="ghost" onClick={() => setEditingChat(null)}>Cancel</Button>
                 <Button type="submit" disabled={!editingChat.title.trim() || updateChatTitleMutation.isPending}>
                   {updateChatTitleMutation.isPending ? 'Saving...' : 'Save'}
                 </Button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
