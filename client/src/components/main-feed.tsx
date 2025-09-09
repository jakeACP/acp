import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PostCard } from "@/components/post-card";
import { PollCard } from "@/components/poll-card";
import { EnhancedPollCard } from "@/components/enhanced-poll-card";
import { RankedChoicePoll } from "@/components/ranked-choice-poll";
import { CharityCard } from "@/components/charity-card";

import { CreatePostForm } from "@/components/create-post-form";
import { CreatePollForm } from "@/components/create-poll-form";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
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
  Globe 
} from "lucide-react";
import { format } from "date-fns";

type FeedType = 'all' | 'news' | 'friends' | 'polls' | 'events' | 'charities' | 'debates';

// Simple EventFeedCard component
function EventFeedCard({ event }: { event: Event }) {
  return (
    <Card className="w-full border-0 shadow-none md:border md:shadow-sm bg-transparent md:bg-white">
      <CardContent className="p-4 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg md:text-xl mb-2 text-gray-900">{event.title}</h3>
            {event.description && (
              <p className="text-gray-600 mb-4 leading-relaxed">{event.description}</p>
            )}
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-gray-500">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{format(new Date(event.startDate), 'PPP p')}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-500">
                <Users className="h-4 w-4 text-green-500" />
                <span className="font-medium">{event.city}, {event.state}</span>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100">
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

export function MainFeed() {
  const { user } = useAuth();
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);
  const [activeFeed, setActiveFeed] = useState<FeedType>('all');

  const { data: posts = [], isLoading } = useQuery<PostWithAuthor[]>({
    queryKey: ["/api/posts"],
  });

  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: charities = [] } = useQuery<Charity[]>({
    queryKey: ["/api/charities"],
  });

  const { data: userGroups = [] } = useQuery({
    queryKey: ["/api/groups/user", user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Get user group member IDs for friends feed
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

  // Combine all content for feed display
  const allFeedItems = [
    ...posts.map(post => ({ type: 'post' as const, data: post, createdAt: post.createdAt })),
    ...polls.map(poll => ({ type: 'poll' as const, data: poll, createdAt: poll.createdAt })),
    ...events.map(event => ({ type: 'event' as const, data: event, createdAt: event.createdAt })),
    ...charities.map(charity => ({ type: 'charity' as const, data: charity, createdAt: charity.createdAt }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Filter feed items based on active feed type
  const getFilteredFeedItems = () => {
    switch (activeFeed) {
      case 'news':
        return allFeedItems.filter(item => 
          item.type === 'post' && isNewsContent(item.data as PostWithAuthor)
        );
      case 'friends':
        return allFeedItems.filter(item => 
          item.type === 'post' && 
          groupMemberIds.includes((item.data as PostWithAuthor).authorId)
        );
      case 'polls':
        return allFeedItems.filter(item => item.type === 'poll');
      case 'events':
        return allFeedItems.filter(item => item.type === 'event');
      case 'charities':
        return allFeedItems.filter(item => item.type === 'charity');
      case 'debates':
        return allFeedItems.filter(item => 
          item.type === 'post' && isDebateContent(item.data as PostWithAuthor)
        );
      case 'all':
      default:
        return allFeedItems;
    }
  };

  const feedItems = getFilteredFeedItems();

  if (showCreatePoll) {
    return (
      <div className="space-y-6">
        <CreatePollForm onCancel={() => setShowCreatePoll(false)} />
      </div>
    );
  }

  return (
    <div className="md:space-y-6">
      {/* Feed Type Switcher - Desktop */}
      <div className="hidden md:block">
        <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-6">
            <Tabs value={activeFeed} onValueChange={(value) => setActiveFeed(value as FeedType)} className="w-full">
              <TabsList className="grid w-full grid-cols-7 h-12 bg-gray-100/50 mb-4 rounded-xl">
                <TabsTrigger value="all" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <Globe className="h-4 w-4" />
                  <span className="hidden lg:inline">All</span>
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <Newspaper className="h-4 w-4" />
                  <span className="hidden lg:inline">News</span>
                </TabsTrigger>
                <TabsTrigger value="friends" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <Users className="h-4 w-4" />
                  <span className="hidden lg:inline">Groups</span>
                </TabsTrigger>
                <TabsTrigger value="polls" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden lg:inline">Polls</span>
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <Calendar className="h-4 w-4" />
                  <span className="hidden lg:inline">Events</span>
                </TabsTrigger>
                <TabsTrigger value="charities" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <Heart className="h-4 w-4" />
                  <span className="hidden lg:inline">Charities</span>
                </TabsTrigger>
                <TabsTrigger value="debates" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                  <MessageCircleReply className="h-4 w-4" />
                  <span className="hidden lg:inline">Debates</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Feed Type Switcher - Horizontal Scroll */}
      <div className="md:hidden sticky top-0 z-40 bg-slate-50/95 backdrop-blur-sm border-b border-gray-200">
        <div className="px-4 py-3">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {[
              { key: 'all', label: 'All', icon: Globe, count: allFeedItems.length },
              { key: 'news', label: 'News', icon: Newspaper, count: allFeedItems.filter(item => item.type === 'post' && isNewsContent(item.data as PostWithAuthor)).length },
              { key: 'friends', label: 'Groups', icon: Users, count: allFeedItems.filter(item => item.type === 'post' && groupMemberIds.includes((item.data as PostWithAuthor).authorId)).length },
              { key: 'polls', label: 'Polls', icon: BarChart3, count: polls.length },
              { key: 'events', label: 'Events', icon: Calendar, count: events.length },
              { key: 'charities', label: 'Charities', icon: Heart, count: charities.length },
              { key: 'debates', label: 'Debates', icon: MessageCircleReply, count: allFeedItems.filter(item => item.type === 'post' && isDebateContent(item.data as PostWithAuthor)).length }
            ].map(({ key, label, icon: Icon, count }) => (
              <button
                key={key}
                onClick={() => setActiveFeed(key as FeedType)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeFeed === key 
                    ? 'bg-primary text-primary-foreground shadow-lg scale-105' 
                    : 'bg-white/80 text-gray-600 hover:bg-white hover:shadow-md'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
                {count > 0 && (
                  <Badge variant="secondary" className="h-5 min-w-5 text-xs bg-gray-100 text-gray-600">
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
        <CreatePostForm />
      </div>

      {/* Mobile Create Post Button */}
      <div className="md:hidden px-4 py-3">
        <Button 
          className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 text-white shadow-lg rounded-full py-3 text-base font-semibold"
          onClick={() => {/* TODO: Add mobile create post modal */}}
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
            <Badge variant="outline" className="bg-white/80">{feedItems.length} items</Badge>
            {activeFeed !== 'all' && (
              <span className="text-gray-500">Filtered by: {activeFeed.charAt(0).toUpperCase() + activeFeed.slice(1)}</span>
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
                  <div className="md:shadow-sm md:border md:rounded-lg border-0 bg-white md:bg-white/80 md:backdrop-blur-sm">
                    <PostCard post={item.data as PostWithAuthor} />
                  </div>
                ) : item.type === 'poll' ? (
                  <div className="md:shadow-sm md:border md:rounded-lg border-0 bg-white md:bg-white/80 md:backdrop-blur-sm">
                    {(item.data as Poll).votingType === 'ranked_choice' ? (
                      <RankedChoicePoll poll={item.data as Poll} />
                    ) : (
                      <EnhancedPollCard poll={item.data as Poll} />
                    )}
                  </div>
                ) : item.type === 'event' ? (
                  <div className="md:shadow-sm md:border md:rounded-lg border-0 bg-white md:bg-white/80 md:backdrop-blur-sm">
                    <EventFeedCard event={item.data as Event} />
                  </div>
                ) : item.type === 'charity' ? (
                  <div className="md:shadow-sm md:border md:rounded-lg border-0 bg-white md:bg-white/80 md:backdrop-blur-sm">
                    <CharityCard charity={item.data as Charity} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-slate-400 mb-4">
              {activeFeed === 'all' ? (
                <>
                  <MessageSquare className="h-12 w-12 mx-auto mb-2" />
                  <h3 className="text-lg font-semibold text-slate-600">Welcome to ACP Democracy</h3>
                  <p className="text-slate-500 mt-2">
                    Start engaging with your community by creating a post or poll
                  </p>
                </>
              ) : (
                <>
                  {activeFeed === 'news' && <Newspaper className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'friends' && <Users className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'polls' && <BarChart3 className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'events' && <Calendar className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'charities' && <Heart className="h-12 w-12 mx-auto mb-2" />}
                  {activeFeed === 'debates' && <MessageCircleReply className="h-12 w-12 mx-auto mb-2" />}
                  <h3 className="text-lg font-semibold text-slate-600">
                    No {activeFeed} content yet
                  </h3>
                  <p className="text-slate-500 mt-2">
                    {activeFeed === 'news' && 'No news or announcements to display'}
                    {activeFeed === 'friends' && 'No posts from your group members yet'}
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
    </div>
  );
}
