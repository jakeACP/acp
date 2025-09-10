import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Plus, Search, Users } from "lucide-react";
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns";
import type { User } from "@shared/schema";

interface ConversationListProps {
  onSelectConversation: (partnerId: string, partnerName: string) => void;
  selectedPartnerId?: string;
}

interface Conversation {
  partnerId: string;
  lastMessageContent: string;
  lastMessageTime: string;
  isRead: boolean;
  lastSenderId: string;
  partner: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function ConversationList({ onSelectConversation, selectedPartnerId }: ConversationListProps) {
  const [showNewMessageDialog, setShowNewMessageDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/messaging"],
    enabled: showNewMessageDialog,
  });

  const { data: unreadCountData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    refetchInterval: 10000, // Check unread count every 10 seconds
  });

  const unreadCount = unreadCountData?.count ?? 0;

  const startConversationMutation = useMutation({
    mutationFn: async ({ recipientId, content }: { recipientId: string; content: string }) => {
      return apiRequest("/api/messages", "POST", { recipientId, content });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      setShowNewMessageDialog(false);
      
      // Find the user to get their name
      const recipient = users.find(u => u.id === variables.recipientId);
      const recipientName = recipient ? `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.username : 'Unknown';
      
      onSelectConversation(variables.recipientId, recipientName);
      
      toast({
        title: "Success",
        description: "Message sent successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const searchLower = searchQuery.toLowerCase();
    return (
      user.username.toLowerCase().includes(searchLower) ||
      fullName.toLowerCase().includes(searchLower)
    );
  });

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Yesterday';
    } else {
      return formatDistanceToNow(date, { addSuffix: false });
    }
  };

  const getDisplayName = (partner: Conversation['partner']) => {
    const fullName = `${partner.firstName || ''} ${partner.lastName || ''}`.trim();
    return fullName || partner.username;
  };

  const getInitials = (partner: Conversation['partner']) => {
    const firstName = partner.firstName || partner.username.charAt(0);
    const lastName = partner.lastName || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleStartConversation = (recipientId: string, initialMessage: string = "Hello!") => {
    if (!initialMessage.trim()) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }
    
    startConversationMutation.mutate({ recipientId, content: initialMessage.trim() });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          
          <Dialog open={showNewMessageDialog} onOpenChange={setShowNewMessageDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-new-message">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
                <DialogDescription>
                  Start a conversation with a community member
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-users"
                  />
                </div>
                
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted cursor-pointer"
                        onClick={() => handleStartConversation(user.id)}
                        data-testid={`user-item-${user.id}`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {`${user.firstName?.charAt(0) || user.username.charAt(0)}${user.lastName?.charAt(0) || ''}`.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                          </p>
                          <p className="text-xs text-muted-foreground">@{user.username}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Direct conversations with community members
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {conversations.length === 0 ? (
          <div className="p-6 text-center">
            <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No conversations yet</p>
            <Button 
              size="sm" 
              onClick={() => setShowNewMessageDialog(true)}
              data-testid="button-start-first-conversation"
            >
              <Plus className="h-4 w-4 mr-2" />
              Start a conversation
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <div
                key={conversation.partnerId}
                className={`p-4 hover:bg-muted cursor-pointer border-l-4 transition-colors ${
                  selectedPartnerId === conversation.partnerId 
                    ? 'border-primary bg-muted/50' 
                    : 'border-transparent'
                }`}
                onClick={() => onSelectConversation(
                  conversation.partnerId, 
                  getDisplayName(conversation.partner)
                )}
                data-testid={`conversation-item-${conversation.partnerId}`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials(conversation.partner)}
                      </AvatarFallback>
                    </Avatar>
                    {!conversation.isRead && conversation.lastSenderId !== conversation.partnerId && (
                      <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground truncate">
                        {getDisplayName(conversation.partner)}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        {formatMessageTime(conversation.lastMessageTime)}
                      </div>
                    </div>
                    <p className={`text-sm truncate ${
                      !conversation.isRead && conversation.lastSenderId !== conversation.partnerId
                        ? 'text-foreground font-medium' 
                        : 'text-muted-foreground'
                    }`}>
                      {conversation.lastMessageContent}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}