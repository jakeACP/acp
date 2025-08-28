import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { ConversationList } from "@/components/messaging/conversation-list";
import { ChatInterface } from "@/components/messaging/chat-interface";
import type { User } from "@shared/schema";

export default function MessagesPage() {
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");
  const [selectedPartnerName, setSelectedPartnerName] = useState<string>("");

  // Get current user for message alignment
  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/user"],
  });

  const handleSelectConversation = (partnerId: string, partnerName: string) => {
    setSelectedPartnerId(partnerId);
    setSelectedPartnerName(partnerName);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <ConversationList 
              onSelectConversation={handleSelectConversation}
              selectedPartnerId={selectedPartnerId}
            />
          </div>

          {/* Chat Interface */}
          <ChatInterface 
            partnerId={selectedPartnerId}
            partnerName={selectedPartnerName}
            currentUserId={currentUser?.id}
          />
        </div>
      </div>
    </div>
  );
}