import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Send, MessageCircle } from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import type { Message } from "@shared/schema";

interface ChatInterfaceProps {
  partnerId: string;
  partnerName: string;
  currentUserId?: string;
}

export function ChatInterface({ partnerId, partnerName, currentUserId }: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/conversations", partnerId],
    refetchInterval: 5000, // Refresh every 5 seconds for real-time feel
    enabled: !!partnerId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      setIsTyping(true);
      return apiRequest("/api/messages", "POST", {
        recipientId: partnerId,
        content: content.trim(),
      });
    },
    onSuccess: () => {
      setNewMessage("");
      setIsTyping(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", partnerId] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
      
      // Scroll to bottom after new message
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    },
    onError: (error: any) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      return apiRequest(`/api/messages/${messageId}/read`, "PATCH");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages/unread-count"] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Mark unread messages as read when viewing conversation
    const unreadMessages = messages.filter(
      msg => !msg.isRead && msg.recipientId === currentUserId
    );
    
    unreadMessages.forEach(msg => {
      markAsReadMutation.mutate(msg.id);
    });
  }, [messages, currentUserId]);

  const handleSendMessage = () => {
    const content = newMessage.trim();
    
    if (!content) {
      toast({
        title: "Error",
        description: "Message cannot be empty",
        variant: "destructive",
      });
      return;
    }

    if (content.length > 2000) {
      toast({
        title: "Error",
        description: "Message too long. Maximum 2000 characters.",
        variant: "destructive",
      });
      return;
    }

    sendMessageMutation.mutate(content);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM dd, HH:mm');
    }
  };

  const getMessageAlignment = (senderId: string) => {
    return senderId === currentUserId ? 'flex-row-reverse' : 'flex-row';
  };

  const getMessageBubbleClass = (senderId: string) => {
    return senderId === currentUserId
      ? 'bg-primary text-primary-foreground ml-12'
      : 'bg-muted mr-12';
  };

  if (!partnerId) {
    return (
      <Card className="lg:col-span-2 flex items-center justify-center min-h-96">
        <div className="text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Select a conversation to start messaging</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-2 flex flex-col h-[600px]">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {partnerName.split(' ').map(n => n[0]).join('').toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{partnerName}</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="h-8 w-8 bg-muted rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages
              .slice()
              .reverse()
              .map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${getMessageAlignment(message.senderId)}`}
                  data-testid={`message-${message.id}`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback>
                      {message.senderId === currentUserId ? 'Me' : partnerName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col space-y-1 max-w-xs lg:max-w-md">
                    <div className={`p-3 rounded-lg ${getMessageBubbleClass(message.senderId)}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {message.content}
                      </p>
                    </div>
                    <div className={`text-xs text-muted-foreground ${
                      message.senderId === currentUserId ? 'text-right' : 'text-left'
                    }`}>
                      {formatMessageTime(message.createdAt || new Date().toISOString())}
                      {message.senderId === currentUserId && (
                        <span className="ml-1">
                          {message.isRead ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
          )}
          
          {isTyping && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
              <span className="text-sm">Sending...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={`Message ${partnerName}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sendMessageMutation.isPending}
              maxLength={2000}
              className="flex-1"
              data-testid="input-new-message"
            />
            <Button
              onClick={handleSendMessage}
              disabled={sendMessageMutation.isPending || !newMessage.trim()}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <div className="text-xs text-muted-foreground">
              {newMessage.length}/2000 characters
            </div>
            {sendMessageMutation.error && (
              <div className="text-xs text-destructive">
                Failed to send message
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}