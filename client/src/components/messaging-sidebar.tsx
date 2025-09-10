import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Hash, MessageCircle, Search, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MessagingSidebarProps {
  userId: string;
  selectedChannelId: string | null;
  selectedConversationId: string | null;
  onChannelSelect: (channelId: string) => void;
  onConversationSelect: (conversationId: string) => void;
}

export function MessagingSidebar({
  userId,
  selectedChannelId,
  selectedConversationId,
  onChannelSelect,
  onConversationSelect
}: MessagingSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateChannelOpen, setIsCreateChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "private">("public");
  const [newChannelGroupId, setNewChannelGroupId] = useState<string>("");
  const { toast } = useToast();

  // Fetch user's channels
  const { data: channels = [], refetch: refetchChannels } = useQuery({
    queryKey: ["/api/channels/user", userId],
  });

  // Fetch user's conversations
  const { data: conversations = [], refetch: refetchConversations } = useQuery({
    queryKey: ["/api/conversations/user", userId],
  });

  // Fetch user's groups for channel creation
  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/groups/user", userId],
  });

  // Create new channel
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest("/api/channels", "POST", {
        name: newChannelName,
        type: newChannelType,
        groupId: newChannelGroupId || null,
      });

      toast({
        title: "Success",
        description: "Channel created successfully",
      });

      setNewChannelName("");
      setNewChannelGroupId("");
      setIsCreateChannelOpen(false);
      refetchChannels();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive",
      });
    }
  };

  // Filter channels and conversations based on search
  const filteredChannels = Array.isArray(channels) ? channels.filter((channel: any) =>
    channel.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const filteredConversations = Array.isArray(conversations) ? conversations.filter((conversation: any) =>
    conversation.otherUser?.username?.toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
          <Dialog open={isCreateChannelOpen} onOpenChange={setIsCreateChannelOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" data-testid="button-create-channel">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="channel-name">Channel Name</Label>
                  <Input
                    id="channel-name"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="Enter channel name"
                    data-testid="input-channel-name"
                  />
                </div>
                <div>
                  <Label htmlFor="channel-type">Channel Type</Label>
                  <Select value={newChannelType} onValueChange={(value: "public" | "private") => setNewChannelType(value)}>
                    <SelectTrigger data-testid="select-channel-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="channel-group">Connect to Group (Optional)</Label>
                  <Select value={newChannelGroupId} onValueChange={setNewChannelGroupId}>
                    <SelectTrigger data-testid="select-channel-group">
                      <SelectValue placeholder="Select a group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No group</SelectItem>
                      {Array.isArray(userGroups) && userGroups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateChannelOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateChannel} data-testid="button-create-channel-submit">
                    Create Channel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search channels and messages"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            data-testid="input-search-messages"
          />
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Channels Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <Hash className="h-4 w-4 mr-1" />
                Channels
              </h3>
              <Badge variant="secondary" className="text-xs">
                {filteredChannels.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {filteredChannels.map((channel: any) => (
                <Button
                  key={channel.id}
                  variant={selectedChannelId === channel.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => {
                    onChannelSelect(channel.id);
                    onConversationSelect("");
                  }}
                  data-testid={`button-channel-${channel.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <div className="flex-shrink-0">
                      {channel.type === "private" ? (
                        <div className="w-6 h-6 rounded bg-orange-100 flex items-center justify-center">
                          <Hash className="h-3 w-3 text-orange-600" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded bg-green-100 flex items-center justify-center">
                          <Hash className="h-3 w-3 text-green-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{channel.name}</div>
                      {channel.group && (
                        <div className="text-xs text-gray-500 flex items-center">
                          <Users className="h-3 w-3 mr-1" />
                          {channel.group.name}
                        </div>
                      )}
                    </div>
                    {channel.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {channel.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Direct Messages Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center">
                <MessageCircle className="h-4 w-4 mr-1" />
                Direct Messages
              </h3>
              <Badge variant="secondary" className="text-xs">
                {filteredConversations.length}
              </Badge>
            </div>
            <div className="space-y-1">
              {filteredConversations.map((conversation: any) => (
                <Button
                  key={conversation.id}
                  variant={selectedConversationId === conversation.id ? "secondary" : "ghost"}
                  className="w-full justify-start h-auto p-3"
                  onClick={() => {
                    onConversationSelect(conversation.id);
                    onChannelSelect("");
                  }}
                  data-testid={`button-conversation-${conversation.id}`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={conversation.otherUser?.profileImageUrl} />
                      <AvatarFallback>
                        {conversation.otherUser?.firstName?.charAt(0) || 
                         conversation.otherUser?.username?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">
                        {conversation.otherUser?.firstName && conversation.otherUser?.lastName
                          ? `${conversation.otherUser.firstName} ${conversation.otherUser.lastName}`
                          : conversation.otherUser?.username || "Unknown User"}
                      </div>
                      {conversation.lastMessage && (
                        <div className="text-xs text-gray-500 truncate">
                          {conversation.lastMessage.content}
                        </div>
                      )}
                    </div>
                    {conversation.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {conversation.unreadCount}
                      </Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}