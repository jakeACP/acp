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
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Calendar className="h-6 w-6 text-blue-600 mt-1" />
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">{event.title}</h3>
            {event.description && (
              <p className="text-muted-foreground mb-3">{event.description}</p>
            )}
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.startDate), 'PPP p')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>{event.city}, {event.state}</span>
              </div>
              {event.tags && event.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {event.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
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
    <div className="space-y-6">
      {/* Feed Type Switcher */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={activeFeed} onValueChange={(value) => setActiveFeed(value as FeedType)} className="w-full">
            <TabsList className="grid w-full grid-cols-7 mb-4">
              <TabsTrigger value="all" className="flex items-center gap-1">
                <Globe className="h-4 w-4" />
                All
              </TabsTrigger>
              <TabsTrigger value="news" className="flex items-center gap-1">
                <Newspaper className="h-4 w-4" />
                News
              </TabsTrigger>
              <TabsTrigger value="friends" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Groups
              </TabsTrigger>
              <TabsTrigger value="polls" className="flex items-center gap-1">
                <BarChart3 className="h-4 w-4" />
                Polls
              </TabsTrigger>
              <TabsTrigger value="events" className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Events
              </TabsTrigger>
              <TabsTrigger value="charities" className="flex items-center gap-1">
                <Heart className="h-4 w-4" />
                Charities
              </TabsTrigger>
              <TabsTrigger value="debates" className="flex items-center gap-1">
                <MessageCircleReply className="h-4 w-4" />
                Debates
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreatePoll(true)}
              className="flex items-center gap-2"
            >
              <BarChart3 className="h-4 w-4" />
              Create Poll
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBlockchain(!showBlockchain)}
              className="flex items-center gap-2"
            >
              <Shield className="h-4 w-4" />
              Blockchain Transparency
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Blockchain Transparency Panel */}
      {showBlockchain && (
        <BlockchainTransparency />
      )}
      
      {/* Create Post Form */}
      <CreatePostForm />

      {/* Feed Items */}
      {feedItems.length > 0 ? (
        <>
          {/* Feed stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Badge variant="outline">{feedItems.length} items</Badge>
            {activeFeed !== 'all' && (
              <span>Filtered by: {activeFeed.charAt(0).toUpperCase() + activeFeed.slice(1)}</span>
            )}
          </div>
          
          {feedItems.map((item, index) => (
            <div key={`${item.type}-${item.data.id || index}`}>
              {item.type === 'post' ? (
                <PostCard post={item.data as PostWithAuthor} />
              ) : item.type === 'poll' ? (
                (item.data as Poll).votingType === 'ranked_choice' ? (
                  <RankedChoicePoll poll={item.data as Poll} />
                ) : (
                  <EnhancedPollCard poll={item.data as Poll} />
                )
              ) : item.type === 'event' ? (
                <EventFeedCard event={item.data as Event} />
              ) : item.type === 'charity' ? (
                <CharityCard charity={item.data as Charity} />
              ) : null}
            </div>
          ))}
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
