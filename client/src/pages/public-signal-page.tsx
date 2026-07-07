import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { PublicHeader } from "@/components/public-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Loader2, ArrowLeft, Share2, Play, Calendar } from "lucide-react";
import { ShareSheet } from "@/components/share-sheet";
import { useRef, useState } from "react";

export default function PublicSignalPage() {
  const [, params] = useRoute("/signals/:id");
  const signalId = params?.id;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const { data: signal, isLoading, error } = useQuery<any>({
    queryKey: ["/api/mobile/signals", signalId],
    queryFn: async () => {
      const res = await fetch(`/api/mobile/signals/${signalId}`);
      if (!res.ok) throw new Error("Signal not found");
      return res.json();
    },
    enabled: !!signalId,
  });

  const signalUrl = signalId ? `${window.location.origin}/signals/${signalId}` : window.location.href;
  const displayName = signal?.author?.firstName
    ? `${signal.author.firstName} ${signal.author.lastName || ""}`.trim()
    : signal?.author?.username || "ACP Member";

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

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

  if (error || !signal || !signal.isPublic) {
    return (
      <div className="min-h-screen bg-[#1a1a2e]">
        <PublicHeader />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-2xl font-bold text-white">Signal Not Found</p>
          <p className="text-white/60">This Signal may have been removed or is not publicly available.</p>
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
      <main className="max-w-lg mx-auto px-4 py-8">
        <Link href="/news">
          <Button variant="ghost" className="mb-6 text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to News
          </Button>
        </Link>

        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          {/* Video player */}
          {signal.videoUrl && (
            <div className="relative aspect-[9/16] bg-black max-h-[60vh] cursor-pointer" onClick={togglePlay}>
              <video
                ref={videoRef}
                src={signal.videoUrl}
                poster={signal.thumbnailUrl || undefined}
                className="w-full h-full object-contain"
                playsInline
                loop
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              {!playing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Thumbnail fallback */}
          {!signal.videoUrl && signal.thumbnailUrl && (
            <img src={signal.thumbnailUrl} alt="" className="w-full aspect-video object-cover" />
          )}

          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-white/20">
                  <AvatarImage src={signal.author?.avatar || undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-500 text-white font-bold text-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white text-sm">{displayName}</p>
                  <p className="text-xs text-white/50">@{signal.author?.username || "member"}</p>
                </div>
              </div>
              <ShareSheet
                title={signal.title || "ACP Signal"}
                text={signal.description || signal.title || ""}
                url={signalUrl}
                trigger={(open) => (
                  <button
                    onClick={open}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition-colors"
                    title="Share Signal"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                )}
              />
            </div>

            {signal.title && (
              <h1 className="text-lg font-bold text-white mb-2">{signal.title}</h1>
            )}

            {signal.description && (
              <p className="text-white/70 text-sm leading-relaxed mb-3">{signal.description}</p>
            )}

            {signal.tags && signal.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {signal.tags.map((tag: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-white/50 border-white/20 text-xs capitalize">
                    #{tag}
                  </Badge>
                ))}
              </div>
            )}

            {signal.createdAt && (
              <div className="flex items-center gap-1.5 text-white/40 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                <span>{format(new Date(signal.createdAt), "MMMM d, yyyy")}</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 p-6 bg-gradient-to-br from-[#B22234]/20 to-[#3C3B6E]/20 border border-white/10 rounded-2xl text-center">
          <p className="text-white font-semibold text-lg mb-2">Want to create your own Signals?</p>
          <p className="text-white/60 mb-4 text-sm">Join ACP Democracy to record, share, and engage with short video content.</p>
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
