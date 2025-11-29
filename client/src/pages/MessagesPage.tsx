import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MessagingSidebar } from "@/components/messaging-sidebar";
import { ChatInterface } from "@/components/chat-interface";

export default function MessagesPage() {
  const { user } = useAuth();
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  if (!user) {
    return <div>Please log in to access messages.</div>;
  }

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border bg-card">
        <MessagingSidebar
          userId={user.id}
          selectedChannelId={selectedChannelId}
          selectedConversationId={selectedConversationId}
          onChannelSelect={setSelectedChannelId}
          onConversationSelect={setSelectedConversationId}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1">
        {selectedChannelId || selectedConversationId ? (
          <ChatInterface
            channelId={selectedChannelId}
            conversationId={selectedConversationId}
            userId={user.id}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2 text-foreground">Welcome to Messages</h3>
              <p>Select a channel or conversation to start messaging</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}