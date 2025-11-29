import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Hash, MessageCircle, Users, Video, Phone } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { VideoChat } from "@/components/video-chat";

interface ChatInterfaceProps {
  channelId: string | null;
  conversationId: string | null;
  userId: string;
}

export function ChatInterface({ channelId, conversationId, userId }: ChatInterfaceProps) {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isVideoCallOpen, setIsVideoCallOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // WebSocket connection
  const { isConnected, sendMessage: sendWebSocketMessage } = useWebSocket(userId);

  // Fetch channel details if channelId is provided
  const { data: channel } = useQuery({
    queryKey: ["/api/channels", channelId],
    enabled: !!channelId,
  }) as { data?: any };

  // Fetch conversation details if conversationId is provided
  const { data: conversation } = useQuery({
    queryKey: ["/api/conversations", conversationId],
    enabled: !!conversationId,
  }) as { data?: any };

  // Fetch messages for channel or conversation
  const { data: messages = [], refetch: refetchMessages } = useQuery({
    queryKey: channelId 
      ? ["/api/channels", channelId, "messages"] 
      : ["/api/conversations", conversationId, "messages"],
    enabled: !!(channelId || conversationId),
  }) as { data?: any[], refetch: () => void };

  // Check if user has premium subscription for video features
  const { data: user } = useQuery({
    queryKey: ["/api/user"],
  }) as { data?: { subscriptionStatus?: string } };

  const isUserPremium = user?.subscriptionStatus === "premium";

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (channelId) {
        return apiRequest(`/api/channels/${channelId}/messages`, "POST", { content });
      } else if (conversationId) {
        return apiRequest(`/api/conversations/${conversationId}/messages`, "POST", { content });
      }
    },
    onSuccess: (data) => {
      setMessage("");
      refetchMessages();
      
      // Send WebSocket message for real-time updates
      if (channelId && isConnected) {
        sendWebSocketMessage({
          type: "channel_message",
          channelId,
          message: data,
        });
      } else if (conversationId && isConnected) {
        sendWebSocketMessage({
          type: "direct_message",
          recipientId: conversation?.otherUser?.id,
          message: data,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Handle message sending
  const handleSendMessage = () => {
    if (!message.trim()) return;
    sendMessageMutation.mutate(message);
  };

  // Handle typing indicator
  const handleTyping = (isCurrentlyTyping: boolean) => {
    if (isCurrentlyTyping !== isTyping) {
      setIsTyping(isCurrentlyTyping);
      
      if (channelId && isConnected) {
        sendWebSocketMessage({
          type: "typing",
          channelId,
          isTyping: isCurrentlyTyping,
        });
      }
    }
  };

  // Handle key press for sending messages
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Start video call (premium feature)
  const handleVideoCall = () => {
    setIsVideoCallOpen(true);
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle WebSocket message events
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case "new_channel_message":
          if (data.channelId === channelId) {
            refetchMessages();
          }
          break;
        case "new_direct_message":
          if (data.senderId === conversation?.otherUser?.id) {
            refetchMessages();
          }
          break;
        case "user_typing":
          if (data.channelId === channelId && data.userId !== userId) {
            setTypingUsers(prev => 
              data.isTyping 
                ? [...prev.filter(id => id !== data.userId), data.userId]
                : prev.filter(id => id !== data.userId)
            );
            
            // Clear typing indicator after 3 seconds
            if (data.isTyping) {
              setTimeout(() => {
                setTypingUsers(prev => prev.filter(id => id !== data.userId));
              }, 3000);
            }
          }
          break;
      }
    };

    // Add WebSocket event listener if connected
    if (isConnected && window.websocket) {
      window.websocket.addEventListener("message", handleWebSocketMessage);
      
      return () => {
        window.websocket?.removeEventListener("message", handleWebSocketMessage);
      };
    }
  }, [isConnected, channelId, conversationId, userId, refetchMessages]);

  if (!channelId && !conversationId) {
    return null;
  }

  const chatTitle = channel?.name || 
    (conversation?.otherUser?.firstName && conversation?.otherUser?.lastName
      ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
      : conversation?.otherUser?.username || "Unknown User");

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {channelId ? (
              <div className="flex items-center space-x-2">
                <Hash className="h-5 w-5 text-gray-500" />
                <h1 className="text-lg font-semibold">{chatTitle}</h1>
                {channel?.type === "private" && (
                  <Badge variant="secondary">Private</Badge>
                )}
                {channel?.group && (
                  <Badge variant="outline" className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {channel.group.name}
                  </Badge>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={conversation?.otherUser?.profileImageUrl} />
                  <AvatarFallback>
                    {conversation?.otherUser?.firstName?.charAt(0) || 
                     conversation?.otherUser?.username?.charAt(0) || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-lg font-semibold">{chatTitle}</h1>
                  <MessageCircle className="h-4 w-4 text-gray-500 inline" />
                </div>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          {conversationId && (
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleVideoCall}
                data-testid="button-video-call"
                disabled={!isUserPremium}
                className={!isUserPremium ? "opacity-50" : ""}
              >
                <Video className="h-4 w-4 mr-1" />
                Video
                {!isUserPremium && <Badge variant="outline" className="ml-1 text-xs">Premium</Badge>}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {Array.isArray(messages) && messages.map((msg: any) => (
            <div key={msg.id} className="flex space-x-3" data-testid={`message-${msg.id}`}>
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={msg.author?.profileImageUrl} />
                <AvatarFallback>
                  {msg.author?.firstName?.charAt(0) || 
                   msg.author?.username?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-sm">
                    {msg.author?.firstName && msg.author?.lastName
                      ? `${msg.author.firstName} ${msg.author.lastName}`
                      : msg.author?.username || "Unknown User"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm text-foreground break-words">
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                <div className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
              </div>
              <span>
                {typingUsers.length === 1 
                  ? "Someone is typing..." 
                  : `${typingUsers.length} people are typing...`}
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping(e.target.value.length > 0);
            }}
            onKeyPress={handleKeyPress}
            placeholder={channelId ? `Message #${channel?.name || "channel"}` : `Message ${chatTitle}`}
            className="flex-1"
            data-testid="input-message"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Video Chat Component */}
      {conversationId && (
        <VideoChat
          isOpen={isVideoCallOpen}
          onClose={() => setIsVideoCallOpen(false)}
          recipientName={
            conversation?.otherUser?.firstName && conversation?.otherUser?.lastName
              ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
              : conversation?.otherUser?.username || "Unknown User"
          }
          recipientId={conversation?.otherUser?.id || ""}
          currentUserId={userId}
          isUserPremium={isUserPremium}
        />
      )}
    </div>
  );
}