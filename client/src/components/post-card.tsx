import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Post } from "@shared/schema";
import { Heart, MessageCircle, Share, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PostCardProps {
  post: Post;
}

export function PostCard({ post }: PostCardProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: likeStatus } = useQuery<{ liked: boolean }>({
    queryKey: ["/api/likes", post.id, "post"],
    enabled: !!user && !!post.id,
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/likes", "POST", {
        targetId: post.id,
        targetType: "post",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/likes", post.id, "post"] });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
  });

  const handleLike = () => {
    if (user) {
      likeMutation.mutate();
    }
  };

  const getTagColor = (tag: string) => {
    switch (tag.toLowerCase()) {
      case "climate":
        return "bg-green-100 text-green-800";
      case "education":
        return "bg-blue-100 text-blue-800";
      case "corruption":
        return "bg-red-100 text-red-800";
      case "healthcare":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })
    : "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {post.authorId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-slate-900">Community Member</h4>
              <p className="text-sm text-slate-500">
                {timeAgo || "Recently"}
              </p>
            </div>
          </div>
          
          {post.tags && post.tags.length > 0 && (
            <Badge className={getTagColor(post.tags[0])}>
              {post.tags[0]}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-slate-900 mb-4 whitespace-pre-wrap">
          {post.content}
        </p>
        
        {post.image && (
          <img
            src={post.image}
            alt="Post content"
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}
        
        <div className="flex items-center justify-between text-slate-500">
          <div className="flex space-x-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLike}
              disabled={likeMutation.isPending}
              className={`flex items-center gap-2 ${
                likeStatus?.liked ? "text-red-500" : "hover:text-red-500"
              }`}
            >
              <Heart className={`h-4 w-4 ${likeStatus?.liked ? "fill-current" : ""}`} />
              <span>{post.likesCount || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:text-primary"
            >
              <MessageCircle className="h-4 w-4" />
              <span>{post.commentsCount || 0}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 hover:text-primary"
            >
              <Share className="h-4 w-4" />
              Share
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 hover:text-red-500"
          >
            <Flag className="h-4 w-4" />
            Flag
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
