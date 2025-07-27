import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/post-card";
import { PollCard } from "@/components/poll-card";
import { EnhancedPollCard } from "@/components/enhanced-poll-card";
import { RankedChoicePoll } from "@/components/ranked-choice-poll";
import { SeedButton } from "@/components/seed-button";
import { CreatePostForm } from "@/components/create-post-form";
import { CreatePollForm } from "@/components/create-poll-form";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Post, Poll } from "@shared/schema";
import { Loader2, MessageSquare, BarChart3, Shield } from "lucide-react";

export function MainFeed() {
  const { user } = useAuth();
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);

  const { data: posts = [], isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  const { data: polls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Combine posts and polls for feed display
  const feedItems = [
    ...posts.map(post => ({ type: 'post' as const, data: post, createdAt: post.createdAt })),
    ...polls.map(poll => ({ type: 'poll' as const, data: poll, createdAt: poll.createdAt }))
  ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  if (showCreatePoll) {
    return (
      <div className="space-y-6">
        <CreatePollForm onCancel={() => setShowCreatePoll(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Development Seed Button */}
      <SeedButton />
      
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
        feedItems.map((item, index) => (
          <div key={`${item.type}-${item.data.id || index}`}>
            {item.type === 'post' ? (
              <PostCard post={item.data as Post} />
            ) : (
              (item.data as Poll).votingType === 'ranked_choice' ? (
                <RankedChoicePoll poll={item.data as Poll} />
              ) : (
                <EnhancedPollCard poll={item.data as Poll} />
              )
            )}
          </div>
        ))
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <MessageSquare className="h-12 w-12 mx-auto mb-2" />
              <h3 className="text-lg font-semibold text-slate-600">Welcome to ACP Democracy</h3>
              <p className="text-slate-500 mt-2">
                Start engaging with your community by creating a post or poll
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
