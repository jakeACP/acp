import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  UserPlus, 
  UserX, 
  Search, 
  Plus, 
  MoreHorizontal, 
  Facebook, 
  Twitter, 
  Linkedin, 
  Globe,
  Settings,
  Filter,
  MessageCircle,
  Eye
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Navigation } from "@/components/navigation";

interface Friend {
  id: string;
  userId?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  status: 'accepted' | 'pending' | 'blocked';
  mutualFriends?: number;
  lastSeen?: string;
}

interface FriendGroup {
  id: string;
  name: string;
  description?: string;
  color: string;
  memberCount: number;
}

interface SearchedUser {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  role?: string;
}

export default function FriendsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupColor, setNewGroupColor] = useState("#3b82f6");
  const [showUserSearch, setShowUserSearch] = useState(false);

  // Fetch user's friends
  const { data: friends = [], isLoading: friendsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends"],
    enabled: !!user?.id,
  });

  // Fetch friend groups
  const { data: friendGroups = [], isLoading: groupsLoading } = useQuery<FriendGroup[]>({
    queryKey: ["/api/friend-groups"],
    enabled: !!user?.id,
  });

  // Fetch friend requests (incoming)
  const { data: friendRequests = [], isLoading: requestsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends/requests"],
    enabled: !!user?.id,
  });

  // Fetch sent friend requests (outgoing)
  const { data: sentRequests = [], isLoading: sentRequestsLoading } = useQuery<Friend[]>({
    queryKey: ["/api/friends/requests/sent"],
    enabled: !!user?.id,
  });

  // Search users by email/username
  const { data: searchedUsers = [], isLoading: searchLoading, refetch: searchUsers } = useQuery<SearchedUser[]>({
    queryKey: ["/api/users/search", userSearchTerm],
    queryFn: async () => {
      if (!userSearchTerm || userSearchTerm.length < 2) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearchTerm)}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
    enabled: userSearchTerm.length >= 2 && showUserSearch,
  });

  // Create friend group mutation
  const createGroupMutation = useMutation({
    mutationFn: async (data: { name: string; color: string; description?: string }) => {
      return apiRequest("/api/friend-groups", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-groups"] });
      setNewGroupName("");
      setNewGroupColor("#3b82f6");
      toast({
        title: "Group created",
        description: "Your friend group has been created successfully.",
      });
    },
  });

  // Accept friend request mutation
  const acceptFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/accept`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request accepted",
        description: "You are now friends!",
      });
    },
  });

  // Reject friend request mutation
  const rejectFriendMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/reject`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
      toast({
        title: "Friend request rejected",
        description: "The friend request has been rejected.",
      });
    },
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/block`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "User blocked",
        description: "The user has been blocked.",
      });
    },
  });

  // Send friend request mutation
  const sendFriendRequestMutation = useMutation({
    mutationFn: async (recipientId: string) => {
      return apiRequest("/api/friendships/request", "POST", { addresseeId: recipientId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/search", userSearchTerm] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      toast({
        title: "Friend request sent",
        description: "Your friend request has been sent.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  // Cancel friend request mutation
  const cancelRequestMutation = useMutation({
    mutationFn: async (friendshipId: string) => {
      return apiRequest(`/api/friendships/${friendshipId}/cancel`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/requests/sent"] });
      toast({
        title: "Request cancelled",
        description: "Your friend request has been cancelled.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel friend request",
        variant: "destructive",
      });
    },
  });

  // Unfriend mutation
  const unfriendMutation = useMutation({
    mutationFn: async (userId: string) => {
      return apiRequest(`/api/friends/${userId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({
        title: "Friend removed",
        description: "You are no longer friends with this user.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove friend",
        variant: "destructive",
      });
    },
  });

  const filteredFriends = friends.filter(friend => {
    const username = friend.username || '';
    const fullName = `${friend.firstName || ''} ${friend.lastName || ''}`.trim();
    const matchesSearch = !searchTerm || 
      username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = selectedGroup === "all" || selectedGroup === friend.status;
    return matchesSearch && matchesGroup;
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    createGroupMutation.mutate({
      name: newGroupName,
      color: newGroupColor,
    });
  };

  const handleSocialMediaSearch = (platform: string) => {
    toast({
      title: `Find friends on ${platform}`,
      description: "Feature coming soon! We'll help you connect with friends from social media.",
    });
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 lg:px-6 xl:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Friends</h1>
          <p className="text-slate-600">Manage your connections and build your network within the ACP community.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  Find Friends
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Search by email/username/phone */}
                <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start"
                      data-testid="button-search-by-email"
                    >
                      <Search className="h-4 w-4 mr-2 text-primary" />
                      Search by Email/Phone/Username
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Find Friends</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="userSearch">Search by email, phone number, username, or name</Label>
                        <div className="relative">
                          <Input
                            id="userSearch"
                            value={userSearchTerm}
                            onChange={(e) => setUserSearchTerm(e.target.value)}
                            placeholder="Enter email, phone, or username..."
                            className="mt-1"
                            data-testid="input-user-search"
                          />
                          {searchLoading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Phone numbers must have privacy settings enabled to appear in search
                        </p>
                      </div>
                      
                      {userSearchTerm.length >= 2 && (
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {searchedUsers.length === 0 && !searchLoading && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No users found
                            </p>
                          )}
                          {searchedUsers.map((searchUser) => (
                            <div 
                              key={searchUser.id} 
                              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              data-testid={`search-result-${searchUser.id}`}
                            >
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={searchUser.avatar} />
                                  <AvatarFallback>
                                    {searchUser.firstName?.[0] || searchUser.username?.[0] || "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">
                                    {searchUser.firstName} {searchUser.lastName}
                                  </p>
                                  <p className="text-xs text-muted-foreground">@{searchUser.username}</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => sendFriendRequestMutation.mutate(searchUser.id)}
                                disabled={sendFriendRequestMutation.isPending}
                                data-testid={`button-add-friend-${searchUser.id}`}
                              >
                                <UserPlus className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button 
                  onClick={() => handleSocialMediaSearch("Facebook")}
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-find-facebook-friends"
                >
                  <Facebook className="h-4 w-4 mr-2 text-blue-600" />
                  Find on Facebook
                </Button>
                <Button 
                  onClick={() => handleSocialMediaSearch("Twitter")}
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-find-twitter-friends"
                >
                  <Twitter className="h-4 w-4 mr-2 text-blue-400" />
                  Find on Twitter
                </Button>
                <Button 
                  onClick={() => handleSocialMediaSearch("LinkedIn")}
                  variant="outline" 
                  className="w-full justify-start"
                  data-testid="button-find-linkedin-friends"
                >
                  <Linkedin className="h-4 w-4 mr-2 text-blue-700" />
                  Find on LinkedIn
                </Button>
              </CardContent>
            </Card>

            {/* Friend Groups */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Friend Groups</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline" data-testid="button-create-group">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Friend Group</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="groupName">Group Name</Label>
                          <Input
                            id="groupName"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            placeholder="Enter group name"
                            data-testid="input-group-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="groupColor">Color</Label>
                          <Input
                            id="groupColor"
                            type="color"
                            value={newGroupColor}
                            onChange={(e) => setNewGroupColor(e.target.value)}
                            data-testid="input-group-color"
                          />
                        </div>
                        <Button 
                          onClick={handleCreateGroup}
                          disabled={createGroupMutation.isPending}
                          className="w-full"
                          data-testid="button-save-group"
                        >
                          {createGroupMutation.isPending ? "Creating..." : "Create Group"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button
                    variant={selectedGroup === "all" ? "default" : "ghost"}
                    onClick={() => setSelectedGroup("all")}
                    className="w-full justify-start"
                    data-testid="filter-all-friends"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    All Friends ({friends.length})
                  </Button>
                  
                  {friendGroups.map((group) => (
                    <Button
                      key={group.id}
                      variant={selectedGroup === group.id ? "default" : "ghost"}
                      onClick={() => setSelectedGroup(group.id)}
                      className="w-full justify-start"
                      data-testid={`filter-group-${group.id}`}
                    >
                      <div 
                        className="w-3 h-3 rounded-full mr-2" 
                        style={{ backgroundColor: group.color }}
                      />
                      {group.name} ({group.memberCount})
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-slate-900">{friends.length}</p>
                  <p className="text-sm text-slate-600">Total Friends</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="friends" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="friends" data-testid="tab-friends">
                  Friends ({friends.length})
                </TabsTrigger>
                <TabsTrigger value="requests" data-testid="tab-requests">
                  Incoming ({friendRequests.length})
                </TabsTrigger>
                <TabsTrigger value="sent" data-testid="tab-sent">
                  Sent ({sentRequests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-6">
                {/* Search and Filter */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          placeholder="Search friends..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                          data-testid="input-search-friends"
                        />
                      </div>
                      <Button variant="outline" size="icon">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Friends List */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {friendsLoading ? (
                    <div className="col-span-full text-center py-8">Loading friends...</div>
                  ) : filteredFriends.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No friends found</p>
                    </div>
                  ) : (
                    filteredFriends.map((friend) => (
                      <Card key={friend.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <Link 
                              href={`/profile/${friend.userId || friend.id}`}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                              data-testid={`link-friend-profile-${friend.id}`}
                            >
                              <Avatar>
                                <AvatarImage src={friend.avatar} />
                                <AvatarFallback>
                                  {friend.firstName?.[0]}{friend.lastName?.[0] || friend.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 hover:underline">
                                  {friend.firstName ? `${friend.firstName} ${friend.lastName}` : friend.username}
                                </p>
                                <p className="text-sm text-slate-600">@{friend.username}</p>
                              </div>
                            </Link>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {friend.mutualFriends && (
                            <p className="text-xs text-slate-500 mb-3">
                              {friend.mutualFriends} mutual friends
                            </p>
                          )}
                          
                          <div className="flex flex-col gap-2 mt-3">
                            <Link href={`/profile/${friend.userId || friend.id}`}>
                              <Button variant="outline" size="sm" className="w-full justify-center">
                                <Eye className="h-4 w-4 mr-2" />
                                View Profile
                              </Button>
                            </Link>
                            <Link href={`/messages?user=${friend.userId || friend.id}`}>
                              <Button size="sm" className="w-full justify-center bg-primary hover:bg-primary/90 text-primary-foreground">
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Send Message
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="requests" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Incoming Requests</h3>
                  {requestsLoading ? (
                    <div className="text-center py-8">Loading friend requests...</div>
                  ) : friendRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No pending friend requests</p>
                    </div>
                  ) : (
                    friendRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Link 
                              href={`/profile/${request.userId || request.id}`}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                              data-testid={`link-request-profile-${request.id}`}
                            >
                              <Avatar>
                                <AvatarImage src={request.avatar} />
                                <AvatarFallback>
                                  {request.firstName?.[0]}{request.lastName?.[0] || request.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 hover:underline">
                                  {request.firstName ? `${request.firstName} ${request.lastName}` : request.username}
                                </p>
                                <p className="text-sm text-slate-600">@{request.username}</p>
                                {request.mutualFriends && (
                                  <p className="text-xs text-slate-500">
                                    {request.mutualFriends} mutual friends
                                  </p>
                                )}
                              </div>
                            </Link>
                            <div className="flex gap-2">
                              <Button 
                                onClick={() => acceptFriendMutation.mutate(request.id)}
                                disabled={acceptFriendMutation.isPending}
                                data-testid={`button-accept-${request.id}`}
                              >
                                Accept
                              </Button>
                              <Button 
                                variant="outline"
                                onClick={() => rejectFriendMutation.mutate(request.id)}
                                disabled={rejectFriendMutation.isPending}
                                data-testid={`button-reject-${request.id}`}
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="sent" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Sent Requests</h3>
                  {sentRequestsLoading ? (
                    <div className="text-center py-8">Loading sent requests...</div>
                  ) : sentRequests.length === 0 ? (
                    <div className="text-center py-8">
                      <UserPlus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <p className="text-slate-600">No sent friend requests</p>
                      <p className="text-sm text-slate-500 mt-2">
                        Use the "Search by Email/Username" button to find friends
                      </p>
                    </div>
                  ) : (
                    sentRequests.map((request) => (
                      <Card key={request.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <Link 
                              href={`/profile/${request.userId || request.id}`}
                              className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                              data-testid={`link-sent-profile-${request.id}`}
                            >
                              <Avatar>
                                <AvatarImage src={request.avatar} />
                                <AvatarFallback>
                                  {request.firstName?.[0]}{request.lastName?.[0] || request.username?.[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium text-slate-900 hover:underline">
                                  {request.firstName ? `${request.firstName} ${request.lastName}` : request.username}
                                </p>
                                <p className="text-sm text-slate-600">@{request.username}</p>
                                <p className="text-xs text-amber-600">Request pending</p>
                              </div>
                            </Link>
                            <Button 
                              variant="outline"
                              onClick={() => cancelRequestMutation.mutate(request.id)}
                              disabled={cancelRequestMutation.isPending}
                              data-testid={`button-cancel-${request.id}`}
                            >
                              Cancel Request
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}