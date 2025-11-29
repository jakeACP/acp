import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

interface Friend {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
}

interface Channel {
  id: string;
  name: string;
  memberCount: number;
}

interface ShareToMessagesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent: string;
}

export function ShareToMessagesModal({ open, onOpenChange, postId, postContent }: ShareToMessagesModalProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState('friends');

  // Get recent friends
  const { data: recentFriends = [] } = useQuery<Friend[]>({
    queryKey: ['/api/friends/recent'],
    enabled: open && tabValue === 'friends',
  });

  // Get user's channels
  const { data: channels = [] } = useQuery<Channel[]>({
    queryKey: ['/api/channels/my-channels'],
    enabled: open && tabValue === 'channels',
  });

  // Share to friend
  const shareToFriendMutation = useMutation({
    mutationFn: async (friendId: string) => {
      return await apiRequest('/api/messages/share', 'POST', {
        postId,
        recipientId: friendId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Shared!',
        description: 'Post has been sent to your friend.',
      });
      onOpenChange(false);
      setSelectedId(null);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share post',
        variant: 'destructive',
      });
    },
  });

  // Share to channel
  const shareToChannelMutation = useMutation({
    mutationFn: async (channelId: string) => {
      return await apiRequest('/api/channel-messages/share', 'POST', {
        postId,
        channelId,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Shared!',
        description: 'Post has been shared to the channel.',
      });
      onOpenChange(false);
      setSelectedId(null);
      setSearchQuery('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share post',
        variant: 'destructive',
      });
    },
  });

  // Filter friends based on search
  const filteredFriends = useMemo(() => {
    if (!searchQuery) return recentFriends;
    const query = searchQuery.toLowerCase();
    return recentFriends.filter(friend =>
      friend.username.toLowerCase().includes(query) ||
      friend.firstName?.toLowerCase().includes(query) ||
      friend.lastName?.toLowerCase().includes(query)
    );
  }, [recentFriends, searchQuery]);

  // Filter channels based on search
  const filteredChannels = useMemo(() => {
    if (!searchQuery) return channels;
    const query = searchQuery.toLowerCase();
    return channels.filter(channel =>
      channel.name.toLowerCase().includes(query)
    );
  }, [channels, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Input
            placeholder="Search friends or channels..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
            data-testid="input-share-search"
          />

          <Tabs value={tabValue} onValueChange={setTabValue} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="friends">Friends</TabsTrigger>
              <TabsTrigger value="channels">Channels</TabsTrigger>
            </TabsList>

            <TabsContent value="friends" className="space-y-2 max-h-96 overflow-y-auto">
              {recentFriends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No recent friends to share with
                </p>
              ) : filteredFriends.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No friends match your search
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredFriends.map((friend) => (
                    <div
                      key={friend.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedId === friend.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent border-border'
                      }`}
                      onClick={() => setSelectedId(friend.id)}
                      data-testid={`friend-${friend.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={friend.avatar} alt={friend.username} />
                          <AvatarFallback>
                            {friend.username.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">
                            {friend.firstName && friend.lastName
                              ? `${friend.firstName} ${friend.lastName}`
                              : friend.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            @{friend.username}
                          </p>
                        </div>
                      </div>
                      {selectedId === friend.id && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareToFriendMutation.mutate(friend.id);
                          }}
                          disabled={shareToFriendMutation.isPending}
                          data-testid={`button-share-friend-${friend.id}`}
                        >
                          {shareToFriendMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="channels" className="space-y-2 max-h-96 overflow-y-auto">
              {channels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  You haven't joined any channels yet
                </p>
              ) : filteredChannels.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No channels match your search
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedId === channel.id
                          ? 'bg-primary/10 border-primary'
                          : 'hover:bg-accent border-border'
                      }`}
                      onClick={() => setSelectedId(channel.id)}
                      data-testid={`channel-${channel.id}`}
                    >
                      <div>
                        <p className="text-sm font-medium">#{channel.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {channel.memberCount} members
                        </p>
                      </div>
                      {selectedId === channel.id && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            shareToChannelMutation.mutate(channel.id);
                          }}
                          disabled={shareToChannelMutation.isPending}
                          data-testid={`button-share-channel-${channel.id}`}
                        >
                          {shareToChannelMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
