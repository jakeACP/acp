import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PostCard } from "@/components/post-card";
import { PollCard } from "@/components/poll-card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Post, Poll } from "@shared/schema";
import { BarChart3, Image, Loader2 } from "lucide-react";

export function MainFeed() {
  const { user } = useAuth();
  const [newPost, setNewPost] = useState("");

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

  return (
    <div className="space-y-6">
      {/* Create Post */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Avatar>
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Input
              placeholder="Share your thoughts with the community..."
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              className="flex-1 bg-slate-50 border-0 focus:bg-white focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                <BarChart3 className="h-4 w-4 mr-2" />
                Create Poll
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                <Image className="h-4 w-4 mr-2" />
                Photo
              </Button>
            </div>
            <Button disabled={!newPost.trim()}>
              Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Feed Items */}
      {feedItems.length > 0 ? (
        feedItems.map((item, index) => (
          <div key={`${item.type}-${item.data.id || index}`}>
            {item.type === 'post' ? (
              <PostCard post={item.data as Post} />
            ) : (
              <PollCard poll={item.data as Poll} />
            )}
          </div>
        ))
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-slate-400 mb-4">
              <BarChart3 className="h-12 w-12 mx-auto mb-2" />
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
