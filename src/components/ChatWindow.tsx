import { useState, useRef, useEffect } from 'react';
import { useChatDetails, useSendMessage, useChatMessages } from '../api/hooks';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Send, User, Bot, Loader2, Paperclip, X, Mic, MicOff, Volume2, AlertCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from './ui/avatar';
import { MessageSquare } from 'lucide-react';

export function ChatWindow({ chatId }: { chatId: string | null }) {
  const { data: chatData, isLoading: isChatLoading } = useChatDetails(chatId);
  const { data: messagesData, isLoading: isMessagesLoading } = useChatMessages(chatId);
  const sendMessageMutation = useSendMessage(chatId || '');
  const [input, setInput] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const messages = messagesData || chatData?.messages || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isPending]);

  // Clear errors and input when switching to a different chat
  useEffect(() => {
    sendMessageMutation.reset();
    setInput('');
    setImageBase64(null);
  }, [chatId]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        
        if (finalTranscript) {
          setInput(prev => {
            const separator = prev && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalTranscript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      window.speechSynthesis.cancel();
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start listening', e);
      }
    }
  };

  const speakText = (text: string) => {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = '';
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageBase64) || !chatId) return;
    
    if (isListening) toggleListening();

    const content = input.trim() || (imageBase64 ? 'Sent an image' : '');
    const currentImage = imageBase64;
    
    setInput('');
    setImageBase64(null);
    
    try {
      await sendMessageMutation.mutateAsync({ content, imageUrl: currentImage || undefined });
    } catch (error) {
      // Restore the user's input so they don't lose it if the message fails
      if (content !== 'Sent an image') {
        setInput(content);
      }
      setImageBase64(currentImage);
    }
  };

  if (!chatId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 text-muted-foreground">
        <Bot className="h-16 w-16 mb-4 text-muted-foreground/30" />
        <h2 className="text-2xl font-semibold mb-2 text-foreground">Chatty AI</h2>
        <p>Select a chat from the sidebar or start a new conversation.</p>
      </div>
    );
  }

  if (isChatLoading || isMessagesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 text-muted-foreground/30" />
            <p>Start the conversation by typing a message below.</p>
          </div>
        ) : (
          messages.map((msg: any, idx: number) => {
            const isUser = msg.role === 'user';
            const isStreaming = !isUser && idx === messages.length - 1 && sendMessageMutation.isPending;
            
            return (
              <div key={idx} className={`flex gap-4 w-full animate-fade-in ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                <Avatar className={`h-8 w-8 shrink-0 ${isUser ? 'bg-primary/20' : 'bg-secondary'} ${isStreaming ? 'animate-pulse ring-2 ring-primary/30 ring-offset-2 ring-offset-background' : ''}`}>
                  {isUser ? (
                    <AvatarFallback className="bg-primary/20 text-primary"><User className="h-4 w-4" /></AvatarFallback>
                  ) : (
                    <AvatarFallback className="bg-accent/20 text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                  )}
                </Avatar>
                
                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} max-w-[90%] md:max-w-[75%]`}>
                  <div 
                    className={`relative px-4 py-3 rounded-2xl transition-all duration-300 ${
                      isUser 
                        ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                        : 'bg-card border border-border shadow-sm rounded-tl-sm text-card-foreground'
                    } ${isStreaming ? 'ring-1 ring-primary/40 shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)]' : ''}`}
                  >
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
                      {msg.content}
                      {isStreaming && (
                        <span className="inline-block w-2 h-[1em] ml-1 bg-primary align-middle animate-[pulse_0.8s_ease-in-out_infinite]" />
                      )}
                    </p>
                    {msg.imageUrl && (
                      <img src={msg.imageUrl} alt="Attachment" className="mt-3 rounded-lg max-w-full h-auto max-h-64 object-cover ring-1 ring-border/50" />
                    )}
                  </div>
                  <div className="flex items-center mt-1 mx-1 gap-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    {!isUser && (
                      <button 
                        onClick={() => speakText(msg.content)}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                        title="Read aloud"
                      >
                        <Volume2 className="h-3 w-3" /> Listen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        
        {sendMessageMutation.isPending && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex gap-4 w-full flex-row animate-fade-in">
            <Avatar className="h-8 w-8 shrink-0 bg-secondary">
              <AvatarFallback className="bg-accent/20 text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
            </Avatar>
            <div className="bg-card border border-border shadow-sm rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:px-8 pb-6 bg-background">
        <div className="w-full flex flex-col gap-2">
          {sendMessageMutation.isError && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <p>
                {(() => {
                  const errorMsg = (sendMessageMutation.error as any)?.response?.data?.message || sendMessageMutation.error?.message || '';
                  const lowerError = errorMsg.toLowerCase();
                  
                  if (lowerError.includes('500') || lowerError.includes('503') || lowerError.includes('demand')) {
                    return "The AI is currently experiencing high demand. Your message wasn't sent, please try again.";
                  }
                  if (lowerError.includes('429') || lowerError.includes('too many requests') || lowerError.includes('rate limit')) {
                    return "You're sending messages a bit too fast! Please wait a moment and try again.";
                  }
                  if (lowerError.includes('failed to fetch') || lowerError.includes('network')) {
                    return "Network error. Please check your internet connection and try again.";
                  }
                  
                  return "We encountered an unexpected issue while sending your message. Please try again.";
                })()}
              </p>
            </div>
          )}

          {imageBase64 && (
            <div className="relative self-start inline-block">
              <img src={imageBase64} alt="Upload preview" className="h-20 w-auto rounded-md object-cover border border-border shadow-sm" />
              <button 
                type="button" 
                onClick={() => setImageBase64(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <form onSubmit={handleSend} className="relative flex items-end gap-2">
            <div className="relative flex-1 flex items-center bg-card border border-border shadow-sm rounded-2xl focus-within:ring-1 focus-within:ring-primary transition-shadow">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="ml-2 p-2 text-muted-foreground hover:text-primary transition-colors rounded-full hover:bg-muted"
                disabled={sendMessageMutation.isPending}
                title="Attach image"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input 
                type="file" 
                accept="image/*" 
                className="hidden" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
              />
              
              <button
                type="button"
                onClick={toggleListening}
                className={`p-2 transition-colors rounded-full ${isListening ? 'text-destructive bg-destructive/10 animate-pulse' : 'text-muted-foreground hover:text-primary hover:bg-muted'}`}
                disabled={sendMessageMutation.isPending || !recognitionRef.current}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Message Chatty AI..."}
                className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-2 py-6 text-[15px] shadow-none"
                disabled={sendMessageMutation.isPending}
              />
            </div>
            <Button 
              type="submit" 
              size="icon" 
              className="h-[52px] w-[52px] shrink-0 rounded-xl shadow-md transition-transform active:scale-95"
              disabled={(!input.trim() && !imageBase64) || sendMessageMutation.isPending}
            >
              {sendMessageMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  );
}
