import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Hash, Plus } from "lucide-react";

interface ChannelsModuleProps {
  onSelectChannel: (channelId: string, channelName: string) => void;
  selectedChannelId?: string;
}

export function ChannelsModule({ onSelectChannel, selectedChannelId }: ChannelsModuleProps) {
  const [showCreateChannelDialog, setShowCreateChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelType, setNewChannelType] = useState<"public" | "private">("public");
  const [newChannelGroupId, setNewChannelGroupId] = useState<string>("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user channels
  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["/api/channels/user"],
    refetchInterval: 30000,
  });

  // Fetch user groups for channel creation
  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/groups/user"],
    enabled: showCreateChannelDialog,
  });

  // Create channel mutation
  const createChannelMutation = useMutation({
    mutationFn: async (channelData: { name: string; type: "public" | "private"; groupId?: string }) => {
      return apiRequest("/api/channels", "POST", channelData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/channels/user"] });
      setShowCreateChannelDialog(false);
      setNewChannelName("");
      setNewChannelGroupId("");
      toast({
        title: "Success",
        description: "Channel created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create channel",
        variant: "destructive",
      });
    },
  });

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) {
      toast({
        title: "Error",
        description: "Channel name is required",
        variant: "destructive",
      });
      return;
    }

    createChannelMutation.mutate({
      name: newChannelName,
      type: newChannelType,
      groupId: newChannelGroupId === "no-group" ? undefined : newChannelGroupId || undefined,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Channels
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
            <Hash className="h-5 w-5" />
            Channels
          </CardTitle>
          
          <Dialog open={showCreateChannelDialog} onOpenChange={setShowCreateChannelDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-add-channel">
                <Plus className="h-4 w-4 mr-1" />
                Add Channel
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Channel</DialogTitle>
                <DialogDescription>
                  Create a channel for group discussions
                </DialogDescription>
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
                      <SelectItem value="no-group">No group</SelectItem>
                      {Array.isArray(userGroups) && userGroups.map((group: any) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowCreateChannelDialog(false)}>
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
        <CardDescription>
          Join channels to participate in group discussions
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {channels.length === 0 ? (
          <div className="p-6 text-center">
            <Hash className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">No channels yet</p>
            <Button 
              size="sm" 
              onClick={() => setShowCreateChannelDialog(true)}
              data-testid="button-create-first-channel"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create a channel
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {channels.map((channel: any) => (
              <div
                key={channel.id}
                className={`p-4 hover:bg-muted cursor-pointer border-l-4 transition-colors ${
                  selectedChannelId === channel.id 
                    ? 'border-primary bg-muted/50' 
                    : 'border-transparent'
                }`}
                onClick={() => onSelectChannel(channel.id, `#${channel.name}`)}
                data-testid={`channel-item-${channel.id}`}
              >
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-foreground">
                        #{channel.name}
                      </p>
                      {channel.type === "private" && (
                        <Badge variant="outline" className="text-xs">Private</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {channel.type === "private" ? "Private" : "Public"} channel
                      {channel.group && ` • ${channel.group.name}`}
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