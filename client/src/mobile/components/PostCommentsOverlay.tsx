import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, Send, Trash2, Heart, Reply } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

interface PostCommentsOverlayProps {
  postId: string;
  onClose: () => void;
}

interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorFirstName?: string | null;
  authorLastName?: string | null;
  authorAvatar?: string | null;
  content: string;
  parentId: string | null;
  likesCount: number;
  likedByMe: boolean;
  createdAt: string;
}

function commentAuthorName(c: PostComment) {
  return c.authorFirstName && c.authorLastName
    ? `${c.authorFirstName} ${c.authorLastName}`
    : c.authorUsername || "Anonymous";
}

export function PostCommentsOverlay({ postId, onClose }: PostCommentsOverlayProps) {
  const { user } = useAuth();
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [visible, setVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  const { data: comments = [], isLoading } = useQuery<PostComment[]>({
    queryKey: ["/api/posts", postId, "comments"],
    queryFn: async () => {
      const res = await fetch(`/api/posts/${postId}/comments`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load comments");
      return res.json();
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/posts", postId, "comments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
  };

  const postMutation = useMutation({
    mutationFn: async ({ content, parentId }: { content: string; parentId?: string | null }) => {
      const res = await apiRequest("/api/comments", "POST", { postId, content, parentId: parentId || null });
      return res.json();
    },
    onSuccess: () => {
      setNewComment("");
      setReplyTo(null);
      invalidate();
      setTimeout(() => listRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: string) => {
      await apiRequest(`/api/comments/${commentId}`, "DELETE");
    },
    onSuccess: invalidate,
  });

  const likeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiRequest("/api/likes", "POST", { targetId: commentId, targetType: "comment" });
      return res.json();
    },
    onSuccess: invalidate,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newComment.trim();
    if (!trimmed || postMutation.isPending) return;
    const parentId = replyTo ? (replyTo.parentId ?? replyTo.id) : null;
    postMutation.mutate({ content: trimmed, parentId });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "now";
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  const topLevel = comments.filter(c => !c.parentId);
  const repliesFor = (id: string) => comments.filter(c => c.parentId === id).slice().reverse();

  const renderComment = (comment: PostComment, isReply = false) => {
    const name = commentAuthorName(comment);
    return (
      <div key={comment.id} className={`flex gap-3 group ${isReply ? "ml-10" : ""}`}>
        <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden flex-shrink-0 mt-0.5">
          {comment.authorAvatar ? (
            <img src={comment.authorAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/60 text-xs font-bold">
              {name[0]?.toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-white/80 text-xs font-semibold">{name}</span>
            <span className="text-white/30 text-[10px]">{comment.createdAt ? timeAgo(comment.createdAt) : ""}</span>
          </div>
          <p className="text-white/90 text-sm leading-relaxed mt-0.5 break-words">{comment.content}</p>
          <div className="flex items-center gap-4 mt-1">
            <button
              onClick={() => user && likeMutation.mutate(comment.id)}
              className="flex items-center gap-1 text-white/40 active:scale-110 transition-transform"
              disabled={!user}
              data-testid={`button-like-comment-${comment.id}`}
            >
              <Heart className={`w-3.5 h-3.5 ${comment.likedByMe ? "fill-red-500 text-red-500" : ""}`} />
              {(comment.likesCount ?? 0) > 0 && (
                <span className="text-[10px]">{comment.likesCount}</span>
              )}
            </button>
            {user && (
              <button
                onClick={() => {
                  setReplyTo(comment);
                  inputRef.current?.focus();
                }}
                className="flex items-center gap-1 text-white/40 text-[10px]"
                data-testid={`button-reply-comment-${comment.id}`}
              >
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
            )}
          </div>
        </div>
        {user && user.id === comment.authorId && (
          <button
            onClick={() => deleteMutation.mutate(comment.id)}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/5 active:bg-red-500/30 flex-shrink-0 mt-0.5"
          >
            <Trash2 className="w-3 h-3 text-white/40" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0"
      style={{ zIndex: 120 }}
      onClick={handleClose}
      onTouchStart={(e) => e.stopPropagation()}
      data-testid="post-comments-overlay"
    >
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{
          backgroundColor: visible ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0)",
          backdropFilter: visible ? "blur(12px)" : "blur(0px)",
          WebkitBackdropFilter: visible ? "blur(12px)" : "blur(0px)",
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 transition-transform duration-300 ease-out"
        style={{
          transform: visible ? "translateY(0)" : "translateY(100%)",
          maxHeight: "75vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="rounded-t-3xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 100%)",
            backdropFilter: "blur(40px) saturate(200%)",
            WebkitBackdropFilter: "blur(40px) saturate(200%)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderBottom: "none",
            maxHeight: "75vh",
          }}
        >
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="w-10 h-1 rounded-full bg-white/30 mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
            <h3 className="text-white font-semibold text-base">
              Comments {comments.length > 0 && <span className="text-white/50 font-normal text-sm ml-1">{comments.length}</span>}
            </h3>
            <button
              onClick={handleClose}
              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20 transition-colors"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto px-4 pb-2"
            style={{
              maxHeight: "calc(75vh - 130px)",
              WebkitOverflowScrolling: "touch",
              overscrollBehavior: "contain",
            }}
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
              </div>
            ) : comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 px-2">
                <p className="text-white/40 text-sm">No comments yet</p>
                <p className="text-white/25 text-xs">Be the first to comment</p>
                {user && (
                  <form onSubmit={handleSubmit} className="w-full flex flex-col gap-2 mt-4">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      maxLength={2000}
                      rows={3}
                      className="w-full rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-white/25 transition-colors resize-none"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                      data-testid="input-first-comment"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim() || postMutation.isPending}
                      className="self-end px-5 py-2 rounded-full text-sm font-semibold text-white transition-all disabled:opacity-30"
                      style={{
                        background: newComment.trim() ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.08)",
                      }}
                      data-testid="button-submit-first-comment"
                    >
                      {postMutation.isPending ? "Posting..." : "Submit"}
                    </button>
                  </form>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 py-2">
                {topLevel.map((comment) => (
                  <div key={comment.id} className="flex flex-col gap-2">
                    {renderComment(comment)}
                    {repliesFor(comment.id).map((r) => renderComment(r, true))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {user ? (
            <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
              {replyTo && (
                <div className="flex items-center justify-between px-4 pt-2">
                  <span className="text-white/50 text-xs">
                    Replying to <span className="text-white/80 font-medium">{commentAuthorName(replyTo)}</span>
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-white/40 text-xs px-2 py-1">
                    Cancel
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit} className="px-4 py-3 flex gap-2 items-center">
                <div className="w-7 h-7 rounded-full bg-white/10 overflow-hidden flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/60 text-[10px] font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={replyTo ? "Write a reply..." : "Add a comment..."}
                  maxLength={2000}
                  className="flex-1 rounded-full px-4 py-2 text-sm text-white placeholder-white/30 outline-none border border-white/10 focus:border-white/25 transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                  data-testid="input-new-comment"
                />
                <button
                  type="submit"
                  disabled={!newComment.trim() || postMutation.isPending}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all disabled:opacity-30"
                  style={{
                    background: newComment.trim() ? "rgba(239,68,68,0.8)" : "rgba(255,255,255,0.08)",
                  }}
                  data-testid="button-submit-comment"
                >
                  {postMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-white" />
                  )}
                </button>
              </form>
            </div>
          ) : (
            <div className="px-4 py-4 text-center" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="text-white/40 text-sm">Log in to comment</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
