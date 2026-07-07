import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Share2, Calendar } from "lucide-react";
import { ShareSheet } from "@/components/share-sheet";

export default function PublicPostPage() {
  const [, params] = useRoute("/posts/:id");
  const postId = params?.id;

  const { data: post, isLoading, error } = useQuery<any>({
    queryKey: ["/api/posts", postId],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}`);
      if (!res.ok) throw new Error("Post not found");
      return res.json();
    },
    enabled: !!postId,
  });

  const postUrl = postId ? `${window.location.origin}/posts/${postId}` : window.location.href;
  const displayName = post?.author?.firstName
    ? `${post.author.firstName} ${post.author.lastName || ""}`.trim()
    : post?.author?.username || "ACP Member";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e]">
        <PublicHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-white/50" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[#1a1a2e]">
        <PublicHeader />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-2xl font-bold text-white">Post Not Found</p>
          <p className="text-white/60">This post may have been removed or is not publicly available.</p>
          <Link href="/news">
            <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to News
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <PublicHeader />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/news">
          <Button variant="ghost" className="mb-6 text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {post.image && (
            <img
              src={post.image}
              alt=""
              className="w-full h-64 object-cover"
            />
          )}

          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border border-white/20">
                  <AvatarImage src={post.author?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-500 text-white font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{displayName}</p>
                  <p className="text-xs text-white/50">
                    @{post.author?.username || "member"}
                  </p>
                </div>
              </div>
              <ShareSheet
                title={post.title || post.content?.slice(0, 80) || "ACP Post"}
                url={postUrl}
                trigger={(open) => (
                  <button
                    onClick={open}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                    title="Share post"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                )}
              />
            </div>

            {post.type && post.type !== "post" && (
              <Badge className="mb-3 bg-[#B22234]/20 text-[#ff6b7a] border-[#B22234]/30 capitalize">
                {post.type.replace(/_/g, " ")}
              </Badge>
            )}

            {post.title && (
              <h1 className="text-2xl font-bold text-white mb-3">{post.title}</h1>
            )}

            <p className="text-white/80 leading-relaxed whitespace-pre-wrap">{post.content}</p>

            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-4">
                {post.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-white/50 border-white/20 capitalize">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {post.createdAt && (
              <div className="flex items-center gap-1.5 mt-4 text-white/40 text-sm">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(post.createdAt), "MMMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-br from-[#B22234]/20 to-[#3C3B6E]/20 border border-white/10 rounded-2xl text-center">
          <p className="text-white font-semibold text-lg mb-2">Join the conversation</p>
          <p className="text-white/60 mb-4 text-sm">Sign in or create a free account to like, comment, and share your voice.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/auth">
              <Button className="bg-[#B22234] hover:bg-[#8B1A28] text-white">Sign In</Button>
            </Link>
            <Link href="/auth?tab=register">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">Join Free</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
