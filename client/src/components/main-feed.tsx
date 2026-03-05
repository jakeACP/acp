import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PostCard } from "@/components/post-card";
import { PollCard } from "@/components/poll-card";
import { EnhancedPollCard } from "@/components/enhanced-poll-card";
import { RankedChoicePoll } from "@/components/ranked-choice-poll";
import { CharityCard } from "@/components/charity-card";

import { CreatePostForm } from "@/components/create-post-form";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PostWithAuthor, Poll, Event, Charity, User, Group } from "@shared/schema";
import { 
  Loader2, 
  MessageSquare, 
  BarChart3, 
  Shield, 
  Newspaper, 
  Users, 
  Calendar, 
  Heart, 
  MessageCircleReply,
  Globe,
  Ban,
  FileText,
  ScrollText,
  Building2,
  UserPlus,
  Leaf,
  GraduationCap,
  Scale,
  Landmark,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";
import { useFeedView, type FeedType } from "@/contexts/feed-view-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Simple EventFeedCard component
function EventFeedCard({ event }: { event: Event }) {
  return (
    <Card className="floating-card w-full bg-card border border-border dark:border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground">{event.title}</h3>
            {event.description && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{event.description}</p>
            )}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-muted-foreground">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{format(new Date(event.startDate), 'PPP p')}</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">{event.city}, {event.state}</span>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple PetitionFeedCard component
function PetitionFeedCard({ petition }: { petition: any }) {
  const { toast } = useToast();
  const progressPercentage = petition.targetSignatures ? 
    Math.min((petition.currentSignatures / petition.targetSignatures) * 100, 100) : 0;

  const signPetitionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/petitions/${petition.id}/sign`, "POST", { isAnonymous: false });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully signed this petition.",
      });
      // Invalidate petitions to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/petitions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to sign petition. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="floating-card w-full bg-card border border-border dark:border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <ScrollText className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground">{petition.title}</h3>
            <p className="text-sm font-medium text-muted-foreground mb-3">Objective: {petition.objective}</p>
            {petition.description && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{petition.description}</p>
            )}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{petition.currentSignatures || 0} signatures</span>
                <span>Goal: {petition.targetSignatures || 1000}</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm text-muted-foreground">
                {petition.isActive ? '🟢 Active' : '🔴 Expired'}
              </span>
              <button 
                onClick={() => signPetitionMutation.mutate()}
                disabled={signPetitionMutation.isPending}
                className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                data-testid={`button-sign-petition-${petition.id}`}
              >
                {signPetitionMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing...
                  </div>
                ) : (
                  "e-Sign Petition"
                )}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple UnionFeedCard component
function UnionFeedCard({ union }: { union: any }) {
  const { toast } = useToast();

  const joinUnionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/unions/${union.id}/join`, "POST");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You have successfully joined this union.",
      });
      // Invalidate unions to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/unions"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join union. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="floating-card w-full bg-card border border-border dark:border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground flex items-center gap-2">
              {union.name}
              {union.isVerified && <Shield className="h-4 w-4 text-blue-500" />}
            </h3>
            {union.industry && (
              <p className="text-sm text-muted-foreground mb-2">{union.industry}</p>
            )}
            {union.description && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{union.description}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                👥 {union.memberCount || 0} members (private membership)
              </span>
              <button 
                onClick={() => joinUnionMutation.mutate()}
                disabled={joinUnionMutation.isPending}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
                data-testid={`button-join-union-${union.id}`}
              >
                {joinUnionMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Joining...
                  </div>
                ) : (
                  "Join Union"
                )}
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Simple BoycottFeedCard and InitiativeFeedCard components
function BoycottFeedCard({ boycott }: { boycott: any }) {
  return (
    <Card className="floating-card w-full bg-card border border-border dark:border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-xl flex items-center justify-center">
              <Ban className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground">{boycott.title}</h3>
            {boycott.targetCompany && (
              <p className="text-sm text-muted-foreground mb-2">Target: {boycott.targetCompany}</p>
            )}
            {boycott.description && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{boycott.description}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                👥 {boycott.subscriberCount || 0} participating
              </span>
              <button 
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                data-testid={`button-join-boycott-${boycott.id}`}
              >
                Join Boycott
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function InitiativeFeedCard({ initiative }: { initiative: any }) {
  return (
    <Card className="floating-card w-full bg-card border border-border dark:border-border">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-foreground">{initiative.title}</h3>
            {(initiative.jurisdictionLevel || initiative.status) && (
              <p className="text-sm text-muted-foreground mb-2">
                {initiative.jurisdictionLevel} {initiative.status && `• ${initiative.status}`}
              </p>
            )}
            {initiative.summary && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{initiative.summary}</p>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-sm text-muted-foreground">
                📝 {initiative.type || 'Initiative'}
              </span>
              <button 
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                data-testid={`button-support-initiative-${initiative.id}`}
              >
                Support Initiative
              </button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Friends View Component
function FriendsView() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: followers = [], isLoading: isLoadingFollowers } = useQuery<User[]>({
    queryKey: ["/api/user/followers"],
    enabled: !!user,
  });

  const { data: following = [], isLoading: isLoadingFollowing } = useQuery<User[]>({
    queryKey: ["/api/user/following"],
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/user/follow/${userId}`, "POST");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/friends/count"] });
      toast({
        title: "Success",
        description: "You are now following this user.",
      });
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await apiRequest(`/api/user/unfollow/${userId}`, "DELETE");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/friends/count"] });
      toast({
        title: "Success",
        description: "You have unfollowed this user.",
      });
    },
  });

  const isLoading = isLoadingFollowers || isLoadingFollowing;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Combine and deduplicate friends
  const allFriends = new Map<string, User>();
  [...followers, ...following].forEach(friend => {
    allFriends.set(friend.id, friend);
  });
  const friends = Array.from(allFriends.values());

  return (
    <div className="space-y-4">
      <Card className="floating-card bg-card border border-border">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-foreground">My Friends</h2>
          {friends.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You don't have any friends yet. Start following people to build your network!
            </p>
          ) : (
            <div className="space-y-4">
              {friends.map((friend) => (
                <div 
                  key={friend.id} 
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`friend-item-${friend.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.avatar || ""} />
                      <AvatarFallback>
                        {friend.firstName?.[0]}{friend.lastName?.[0] || friend.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {friend.firstName ? `${friend.firstName} ${friend.lastName}` : friend.username}
                      </p>
                      {friend.location && (
                        <p className="text-sm text-muted-foreground">{friend.location}</p>
                      )}
                    </div>
                  </div>
                  {following.some(f => f.id === friend.id) ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unfollowMutation.mutate(friend.id)}
                      disabled={unfollowMutation.isPending}
                      data-testid={`button-unfollow-${friend.id}`}
                    >
                      Unfollow
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => followMutation.mutate(friend.id)}
                      disabled={followMutation.isPending}
                      data-testid={`button-follow-${friend.id}`}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      Follow
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Groups View Component
function GroupsView() {
  const { user } = useAuth();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user,
  });

  const getGroupIcon = (category: string | null) => {
    switch (category) {
      case "climate": return <Leaf className="h-6 w-6 text-white" />;
      case "education": return <GraduationCap className="h-6 w-6 text-white" />;
      case "corruption": return <Scale className="h-6 w-6 text-white" />;
      default: return <Users className="h-6 w-6 text-white" />;
    }
  };

  const getGroupColor = (category: string | null) => {
    switch (category) {
      case "climate": return "bg-green-500";
      case "education": return "bg-blue-500";
      case "corruption": return "bg-red-500";
      default: return "bg-slate-500";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="floating-card bg-card border border-border">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-foreground">My Groups</h2>
          {groups.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You haven't joined any groups yet. Explore groups to connect with like-minded people!
            </p>
          ) : (
            <div className="grid gap-4">
              {groups.map((group) => (
                <div 
                  key={group.id}
                  className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`group-item-${group.id}`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${getGroupColor(group.category)}`}>
                    {getGroupIcon(group.category)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-foreground">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-muted-foreground mt-1">{group.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{group.memberCount} members</span>
                      {group.category && (
                        <Badge variant="secondary" className="capitalize">
                          {group.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Votes View Component
function VotesView() {
  const { user } = useAuth();

  const { data: polls = [], isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: !!user,
  });

  // Filter to show only polls the user has voted on
  // For now, we'll show all polls since we don't have a voted status
  const votedPolls = polls;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="floating-card bg-card border border-border">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-4 text-foreground">My Votes</h2>
          {votedPolls.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You haven't cast any votes yet. Participate in polls to make your voice heard!
            </p>
          ) : (
            <div className="space-y-4">
              {votedPolls.map((poll) => (
                <div 
                  key={poll.id}
                  className="p-4 rounded-lg bg-muted/50"
                  data-testid={`vote-item-${poll.id}`}
                >
                  <h3 className="font-semibold text-foreground mb-2">{poll.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    <span>{poll.totalVotes || 0} votes</span>
                    {poll.votingType && (
                      <Badge variant="secondary" className="ml-2">
                        {poll.votingType === "ranked_choice" ? "Ranked Choice" : 
                         poll.votingType === "blockchain" ? "Blockchain" : "Simple"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

export function MainFeed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { activeView, setActiveView, activeFeed, setActiveFeed } = useFeedView();
  const [showBlockchain, setShowBlockchain] = useState(false);
  const [showMobileCreatePost, setShowMobileCreatePost] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Three-tier feed system queries
  // NOTE: All hooks must be called BEFORE any conditional returns to maintain React's Rules of Hooks
  const { data: allFeedPosts = [], isLoading: isLoadingAll } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feeds/all"],
    enabled: activeFeed === 'all',
  });

  const { data: followingFeedPosts = [], isLoading: isLoadingFollowing } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feeds/following"],
    enabled: activeFeed === 'following' && !!user,
  });

  const { data: newsFeedPosts = [], isLoading: isLoadingNews } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feeds/news"],
    enabled: activeFeed === 'news',
  });

  // Legacy content queries for other tabs
  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
    enabled: activeFeed === 'polls',
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
    enabled: activeFeed === 'events',
  });

  const { data: charities = [] } = useQuery<Charity[]>({
    queryKey: ["/api/charities"],
    enabled: activeFeed === 'charities',
  });

  const { data: boycotts = [] } = useQuery<any[]>({
    queryKey: ["/api/boycotts"],
    enabled: activeFeed === 'boycotts',
  });

  const { data: initiatives = [] } = useQuery<any[]>({
    queryKey: ["/api/initiatives"],
    enabled: activeFeed === 'initiatives',
  });

  const { data: petitions = [] } = useQuery<any[]>({
    queryKey: ["/api/petitions"],
    enabled: activeFeed === 'petitions',
  });

  const { data: unions = [] } = useQuery<any[]>({
    queryKey: ["/api/unions"],
    enabled: activeFeed === 'unions',
  });

  const { data: myRepsPosts = [], isLoading: isLoadingMyReps } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feeds/my-reps"],
    enabled: activeFeed === 'my-reps' && !!user,
  });

  const { data: myCandidatesPosts = [], isLoading: isLoadingMyCandidates } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/feeds/my-candidates"],
    enabled: activeFeed === 'my-candidates' && !!user,
  });

  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id && (activeFeed === 'debates' || activeFeed === 'charities'),
  });

  const isLoading = isLoadingAll || isLoadingFollowing || isLoadingNews || isLoadingMyReps || isLoadingMyCandidates;

  // Get current feed posts based on active feed
  const getCurrentFeedPosts = () => {
    switch (activeFeed) {
      case 'all':       return allFeedPosts;
      case 'following': return followingFeedPosts;
      case 'news':      return newsFeedPosts;
      case 'my-reps':   return myRepsPosts;
      case 'my-candidates': return myCandidatesPosts;
      default:          return [];
    }
  };

  const currentPosts = getCurrentFeedPosts();

  // Get user group member IDs for debates feed
  const groupMemberIds = userGroups.flatMap((group: any) => 
    group.members?.map((member: any) => member.userId) || []
  );

  // Helper function to check if post contains debate-related content
  const isDebateContent = (post: PostWithAuthor) => {
    const debateKeywords = ['debate', 'argue', 'discussion', 'opposing', 'counter', 'disagree', 'perspective'];
    const content = post.content.toLowerCase();
    const tags = post.tags || [];
    return debateKeywords.some(keyword => content.includes(keyword)) || 
           tags.some((tag: string) => debateKeywords.includes(tag.toLowerCase()));
  };

  // Helper function to check if post is news-related
  const isNewsContent = (post: PostWithAuthor) => {
    const newsKeywords = ['news', 'breaking', 'announcement', 'report', 'update', 'alert'];
    const content = post.content.toLowerCase();
    const tags = post.tags || [];
    return post.type === 'announcement' ||
           newsKeywords.some(keyword => content.includes(keyword)) ||
           tags.some((tag: string) => newsKeywords.includes(tag.toLowerCase()));
  };

  // Combine content for feed display based on active feed
  const getFeedItems = () => {
    switch (activeFeed) {
      case 'all':
      case 'following':
      case 'news':
      case 'my-reps':
      case 'my-candidates':
        return currentPosts.map(post => ({ type: 'post' as const, data: post, createdAt: post.createdAt }));
      case 'polls':
        return polls.map(poll => ({ type: 'poll' as const, data: poll, createdAt: poll.createdAt }));
      case 'events':
        return events.map(event => ({ type: 'event' as const, data: event, createdAt: event.createdAt }));
      case 'charities':
        return charities.map(charity => ({ type: 'charity' as const, data: charity, createdAt: charity.createdAt }));
      case 'boycotts':
        return boycotts.map(boycott => ({ type: 'boycott' as const, data: boycott, createdAt: boycott.createdAt }));
      case 'initiatives':
        return initiatives.map(initiative => ({ type: 'initiative' as const, data: initiative, createdAt: initiative.createdAt }));
      case 'petitions':
        return petitions.map(petition => ({ type: 'petition' as const, data: petition, createdAt: petition.createdAt }));
      case 'unions':
        return unions.map(union => ({ type: 'union' as const, data: union, createdAt: union.createdAt }));
      case 'debates':
        // Legacy client-side filtering for debates
        return currentPosts
          .filter(post => isDebateContent(post))
          .map(post => ({ type: 'post' as const, data: post, createdAt: post.createdAt }));
      default:
        return [];
    }
  };

  const feedItems = getFeedItems();
  
  // Get visible items for display
  const visibleItems = feedItems.slice(0, visibleCount);
  const hasMoreItems = visibleCount < feedItems.length;
  
  // Reset visible count when feed type changes (must be before conditional returns)
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeFeed]);
  
  // Infinite scroll effect
  useEffect(() => {
    const currentRef = loadMoreRef.current;
    if (!currentRef) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMoreItems) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, feedItems.length));
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );
    
    observer.observe(currentRef);
    return () => observer.disconnect();
  }, [hasMoreItems, feedItems.length]);

  // Check if we should show special views (AFTER all hooks to maintain hook order consistency)
  if (activeView === "friends") {
    return <FriendsView />;
  }

  if (activeView === "groups") {
    return <GroupsView />;
  }

  if (activeView === "votes") {
    return <VotesView />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="page-background md:space-y-6">
      {/* Mobile Feed Type Switcher - Horizontal Scroll */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all',           label: 'All',           icon: Globe,             count: allFeedPosts.length },
              { key: 'news',          label: 'News',          icon: Newspaper,         count: newsFeedPosts.length },
              { key: 'following',     label: 'Following',     icon: Users,             count: followingFeedPosts.length },
              { key: 'my-reps',       label: 'My Reps',       icon: Landmark,          count: myRepsPosts.length },
              { key: 'my-candidates', label: 'My Candidates', icon: UserCheck,         count: myCandidatesPosts.length },
              { key: 'polls',         label: 'Polls',         icon: BarChart3,         count: polls.length },
              { key: 'events',        label: 'Events',        icon: Calendar,          count: events.length },
              { key: 'charities',     label: 'Charities',     icon: Heart,             count: charities.length },
              { key: 'boycotts',      label: 'Boycotts',      icon: Ban,               count: boycotts.length },
              { key: 'initiatives',   label: 'Initiatives',   icon: FileText,          count: initiatives.length },
              { key: 'petitions',     label: 'Petitions',     icon: ScrollText,        count: petitions.length },
              { key: 'unions',        label: 'Unions',        icon: Building2,         count: unions.length },
              { key: 'debates',       label: 'Debates',       icon: MessageCircleReply, count: 0 }
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveFeed(key as FeedType)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeFeed === key 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : 'bg-card/80 text-muted-foreground hover:bg-card hover:shadow-md hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 text-xs bg-muted text-muted-foreground">
                    {count}
                  </Badge>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>


      {/* Blockchain Transparency Panel */}
      {showBlockchain && (
        <BlockchainTransparency />
      )}
      
      {/* Create Post Form - Desktop Only */}
      <div className="hidden md:block">
        <div className="floating-card-lg">
          <CreatePostForm />
        </div>
      </div>

      {/* Mobile Create Post Button */}
      <div className="md:hidden px-4 py-3">
        <Button 
          className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg rounded-full py-3 text-base font-semibold floating-card transition-all duration-200"
          onClick={() => setShowMobileCreatePost(true)}
          data-testid="mobile-create-post-button"
        >
          <MessageSquare className="h-5 w-5 mr-2" />
          What's on your mind?
        </Button>
      </div>

      {/* Feed Items */}
      {feedItems.length > 0 ? (
        <>
          {/* Feed Content */}
          <div className="md:space-y-6 space-y-0">
            {visibleItems.map((item, index) => (
              <div 
                key={`${item.type}-${item.data.id || index}`}
                className="md:mb-0 mb-4 md:rounded-lg rounded-none md:mx-0 mx-0"
              >
                {item.type === 'post' ? (
                  <div className="floating-card bg-card border border-border">
                    <PostCard post={item.data as PostWithAuthor} />
                  </div>
                ) : item.type === 'poll' ? (
                  <div className="floating-card bg-card border border-border">
                    {(item.data as Poll).votingType === 'ranked_choice' ? (
                      <RankedChoicePoll poll={item.data as Poll} />
                    ) : (
                      <EnhancedPollCard poll={item.data as Poll} />
                    )}
                  </div>
                ) : item.type === 'event' ? (
                  <EventFeedCard event={item.data as Event} />
                ) : item.type === 'charity' ? (
                  <div className="floating-card bg-card border border-border">
                    <CharityCard charity={item.data as Charity} />
                  </div>
                ) : item.type === 'petition' ? (
                  <PetitionFeedCard petition={item.data} />
                ) : item.type === 'union' ? (
                  <UnionFeedCard union={item.data} />
                ) : item.type === 'boycott' ? (
                  <BoycottFeedCard boycott={item.data} />
                ) : item.type === 'initiative' ? (
                  <InitiativeFeedCard initiative={item.data} />
                ) : null}
              </div>
            ))}
            
            {/* Infinite scroll sentinel */}
            <div ref={loadMoreRef} className="py-4 flex justify-center">
              {hasMoreItems && (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        </>
      ) : (
        <Card className="floating-card bg-card border border-border">
          <CardContent className="text-center py-12">
            <div className="text-muted-foreground mb-4">
              {activeFeed === 'all' ? (
                <>
                  <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-foreground">Welcome to ACP Democracy</h3>
                  <p className="text-muted-foreground mt-2">
                    Start engaging with your community by creating a post or poll
                  </p>
                </>
              ) : (
                <>
                  {activeFeed === 'news' && <Newspaper className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'following' && <Users className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'polls' && <BarChart3 className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'events' && <Calendar className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'charities' && <Heart className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'debates' && <MessageCircleReply className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'my-reps' && <Landmark className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'my-candidates' && <UserCheck className="h-12 w-12 mx-auto mb-2" />}
                  <h3 className="text-lg font-semibold text-foreground">
                    {activeFeed === 'my-reps' && 'No posts from your representatives yet'}
                    {activeFeed === 'my-candidates' && 'No posts from your candidates yet'}
                    {activeFeed !== 'my-reps' && activeFeed !== 'my-candidates' && `No ${activeFeed} content yet`}
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {activeFeed === 'news' && 'No news or announcements to display'}
                    {activeFeed === 'following' && 'No posts from people you follow yet'}
                    {activeFeed === 'polls' && 'No polls available. Create the first one!'}
                    {activeFeed === 'events' && 'No upcoming events. Create the first one!'}
                    {activeFeed === 'charities' && 'No charities to display. Create the first one!'}
                    {activeFeed === 'debates' && 'No debate discussions yet. Start one!'}
                    {activeFeed === 'my-reps' && 'Follow your representatives on the Current Reps page, then posts tagged @TheirHandle will appear here.'}
                    {activeFeed === 'my-candidates' && 'Support candidates to see their posts here. Posts they are tagged in will also appear.'}
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mobile Create Post Modal */}
      <Dialog open={showMobileCreatePost} onOpenChange={setShowMobileCreatePost}>
        <DialogContent className="max-w-lg mx-auto max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Post</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <CreatePostForm onSuccess={() => setShowMobileCreatePost(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
