import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { PostWithAuthor, Poll, Event, Charity } from "@shared/schema";
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
  Building2
} from "lucide-react";
import { format } from "date-fns";

type FeedType = 'all' | 'news' | 'following' | 'polls' | 'events' | 'charities' | 'debates' | 'boycotts' | 'initiatives' | 'petitions' | 'unions';

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

export function MainFeed() {
  const { user } = useAuth();
  const [showBlockchain, setShowBlockchain] = useState(false);
  const [activeFeed, setActiveFeed] = useState<FeedType>('all');
  const [showMobileCreatePost, setShowMobileCreatePost] = useState(false);

  // Three-tier feed system queries
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

  const { data: userGroups = [] } = useQuery<any[]>({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id && (activeFeed === 'debates' || activeFeed === 'charities'),
  });

  const isLoading = isLoadingAll || isLoadingFollowing || isLoadingNews;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get current feed posts based on active feed
  const getCurrentFeedPosts = () => {
    switch (activeFeed) {
      case 'all':
        return allFeedPosts;
      case 'following':
        return followingFeedPosts;
      case 'news':
        return newsFeedPosts;
      default:
        return [];
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
           tags.some(tag => debateKeywords.includes(tag.toLowerCase()));
  };

  // Helper function to check if post is news-related
  const isNewsContent = (post: PostWithAuthor) => {
    const newsKeywords = ['news', 'breaking', 'announcement', 'report', 'update', 'alert'];
    const content = post.content.toLowerCase();
    const tags = post.tags || [];
    return post.type === 'announcement' ||
           newsKeywords.some(keyword => content.includes(keyword)) ||
           tags.some(tag => newsKeywords.includes(tag.toLowerCase()));
  };

  // Combine content for feed display based on active feed
  const getFeedItems = () => {
    switch (activeFeed) {
      case 'all':
      case 'following':
      case 'news':
        // Use server-ranked posts for three-tier feed system
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

  return (
    <div className="page-background md:space-y-6">
      {/* Feed Type Switcher - Desktop */}
      <div className="hidden md:block">
        <Card className="floating-card-lg shadow-lg border-0 bg-card/95 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs value={activeFeed} onValueChange={(value) => setActiveFeed(value as FeedType)} className="w-full">
              <TabsList className="grid w-full grid-cols-5 lg:grid-cols-11 h-12 bg-muted/50 mb-4 rounded-xl overflow-x-auto">
                <TabsTrigger value="all" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Globe className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">All</span>
                </TabsTrigger>
                <TabsTrigger value="news" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Newspaper className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">News</span>
                </TabsTrigger>
                <TabsTrigger value="following" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Following</span>
                </TabsTrigger>
                <TabsTrigger value="polls" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Polls</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Events</span>
                </TabsTrigger>
                <TabsTrigger value="charities" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Heart className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Charities</span>
                </TabsTrigger>
                <TabsTrigger value="boycotts" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Ban className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Boycotts</span>
                </TabsTrigger>
                <TabsTrigger value="initiatives" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <FileText className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Initiatives</span>
                </TabsTrigger>
                <TabsTrigger value="petitions" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <ScrollText className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Petitions</span>
                </TabsTrigger>
                <TabsTrigger value="unions" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Unions</span>
                </TabsTrigger>
                <TabsTrigger value="debates" className="feed-tab flex items-center gap-2 data-[state=active]:text-primary-foreground rounded-lg transition-all duration-200">
                  <MessageCircleReply className="h-4 w-4" />
                  <span className="hidden lg:inline font-medium">Debates</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Feed Type Switcher - Horizontal Scroll */}
      <div className="md:hidden sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="px-4 py-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All', icon: Globe, count: allFeedPosts.length },
              { key: 'news', label: 'News', icon: Newspaper, count: newsFeedPosts.length },
              { key: 'following', label: 'Following', icon: Users, count: followingFeedPosts.length },
              { key: 'polls', label: 'Polls', icon: BarChart3, count: polls.length },
              { key: 'events', label: 'Events', icon: Calendar, count: events.length },
              { key: 'charities', label: 'Charities', icon: Heart, count: charities.length },
              { key: 'boycotts', label: 'Boycotts', icon: Ban, count: boycotts.length },
              { key: 'initiatives', label: 'Initiatives', icon: FileText, count: initiatives.length },
              { key: 'petitions', label: 'Petitions', icon: ScrollText, count: petitions.length },
              { key: 'unions', label: 'Unions', icon: Building2, count: unions.length },
              { key: 'debates', label: 'Debates', icon: MessageCircleReply, count: 0 }
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
          {/* Feed stats - Desktop Only */}
          <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground px-1">
            <Badge variant="outline" className="bg-card/80 border-border">{feedItems.length} items</Badge>
            {activeFeed !== 'all' && (
              <span className="text-muted-foreground">Filtered by: {activeFeed.charAt(0).toUpperCase() + activeFeed.slice(1)}</span>
            )}
          </div>
          
          {/* Feed Content */}
          <div className="md:space-y-6 space-y-0">
            {feedItems.map((item, index) => (
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
                  <h3 className="text-lg font-semibold text-foreground">
                    No {activeFeed} content yet
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {activeFeed === 'news' && 'No news or announcements to display'}
                    {activeFeed === 'following' && 'No posts from people you follow yet'}
                    {activeFeed === 'polls' && 'No polls available. Create the first one!'}
                    {activeFeed === 'events' && 'No upcoming events. Create the first one!'}
                    {activeFeed === 'charities' && 'No charities to display. Create the first one!'}
                    {activeFeed === 'debates' && 'No debate discussions yet. Start one!'}
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
