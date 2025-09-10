import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { ConversationList } from "@/components/messaging/conversation-list";
import { ChannelsModule } from "@/components/messaging/channels-module";
import { ChatInterface } from "@/components/messaging/chat-interface";
import type { User } from "@shared/schema";

export default function MessagesPage() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");
  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [selectedChannelName, setSelectedChannelName] = useState<string>("");

  // Get current user for message alignment
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const handleSelectConversation = (partnerId: string, partnerName: string) => {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerName(partnerName);
    // Clear channel selection when selecting a conversation
    setSelectedChannelId("");
    setSelectedChannelName("");
  };

  const handleSelectChannel = (channelId: string, channelName: string) => {
    setSelectedChannelId(channelId);
    setSelectedChannelName(channelName);
    // Clear conversation selection when selecting a channel
    setSelectedPartnerId("");
    setSelectedPartnerName("");
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Messages and Channels */}
          <div className="lg:col-span-1 space-y-6">
            {/* Messages Module */}
            <ConversationList 
              onSelectConversation={handleSelectConversation}
              selectedPartnerId={selectedPartnerId}
            />
            
            {/* Channels Module */}
            <ChannelsModule 
              onSelectChannel={handleSelectChannel}
              selectedChannelId={selectedChannelId}
            />
          </div>

          {/* Chat Interface */}
          <ChatInterface 
            partnerId={selectedPartnerId || selectedChannelId}
            partnerName={selectedPartnerName || selectedChannelName}
            currentUserId={currentUser?.id}
          />
        </div>
      </div>
    </div>
  );
}