import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { ChatWindow } from '../components/ChatWindow';

export default function Chat() {
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      <Sidebar selectedChatId={selectedChatId} onSelectChat={setSelectedChatId} />
      <ChatWindow chatId={selectedChatId} />
    </div>
  );
}
