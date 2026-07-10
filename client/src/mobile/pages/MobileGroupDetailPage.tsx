import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Users, MessageSquare, Calendar, Loader2, UserPlus, UserCheck } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { formatDistanceToNow } from "date-fns";
import "../mobile-theme.css";

export function MobileGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"about" | "posts" | "events">("about");

  const { data: group, isLoading, isError } = useQuery<any>({
    queryKey: ["/api/groups", id],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: membership } = useQuery<{ isMember: boolean } | null>({
    queryKey: ["/api/groups", id, "membership"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${id}/membership`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!user,
  });

  const { data: posts = [] } = useQuery<any[]>({
    queryKey: ["/api/groups", id, "posts"],
    queryFn: async () => {
      const res = await fetch(`/api/groups/${id}/posts`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id && activeTab === "posts",
  });

  const joinMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/groups/${id}/join`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Joined group!" });
    },
    onError: () => toast({ title: "Could not join", variant: "destructive" }),
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/groups/${id}/membership`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups", id, "membership"] });
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({ title: "Left group" });
    },
    onError: () => toast({ title: "Could not leave", variant: "destructive" }),
  });

  const handleBack = () => navigate("/mobile/groups");

  if (isLoading) {
    return (
      <div className="mobile-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <MobileBottomNav />
      </div>
    );
  }

  if (isError || !group) {
    return (
      <div className="mobile-root">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Group</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <span className="text-5xl mb-4">👥</span>
          <p className="text-white font-semibold mb-1">Group not found</p>
          <p className="text-white/50 text-sm mb-6">This group may have been removed or made private.</p>
          <button onClick={handleBack} className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}>
            Back to Groups
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const isMember = membership?.isMember ?? false;

  return (
    <div className="mobile-root" data-testid="mobile-group-detail-page">
      {/* Top bar */}
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-lg flex-1 truncate">{group.name}</h1>
        <button
          onClick={() => isMember ? leaveMutation.mutate() : joinMutation.mutate()}
          disabled={joinMutation.isPending || leaveMutation.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={isMember
            ? { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.15)" }
            : { background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}
          data-testid="group-join-btn"
        >
          {isMember ? <><UserCheck className="w-3.5 h-3.5" /> Joined</> : <><UserPlus className="w-3.5 h-3.5" /> Join</>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Hero */}
        <div className="relative h-36 overflow-hidden">
          {group.coverImage || group.image ? (
            <img src={group.coverImage || group.image} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-900/40 to-blue-900/40" />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(5,11,27,1) 0%, rgba(5,11,27,0) 60%)" }} />
        </div>

        <div className="px-4 -mt-6 relative z-10 space-y-4">
          {/* Meta */}
          <div className="glass-card p-4">
            <h2 className="text-white font-bold text-xl mb-1">{group.name}</h2>
            <div className="flex items-center gap-3 text-white/50 text-sm mb-3">
              <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{group.memberCount ?? 0} members</span>
              {group.category && <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: "rgba(255,255,255,0.08)" }}>{group.category}</span>}
            </div>
            {group.description && <p className="text-white/70 text-sm leading-relaxed">{group.description}</p>}
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            {(["about", "posts", "events"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all capitalize"
                style={activeTab === tab
                  ? { background: "rgba(255,255,255,0.16)", color: "#fff" }
                  : { background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.45)" }}>
                {tab}
              </button>
            ))}
          </div>

          {activeTab === "about" && (
            <div className="glass-card p-4 space-y-2">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">About</p>
              {group.rules && <p className="text-white/70 text-sm">{group.rules}</p>}
              {!group.rules && !group.description && <p className="text-white/50 text-sm">No description yet.</p>}
            </div>
          )}

          {activeTab === "posts" && (
            <div className="space-y-3">
              {posts.length === 0 ? (
                <div className="glass-card p-6 text-center">
                  <MessageSquare className="w-8 h-8 text-white/30 mx-auto mb-2" />
                  <p className="text-white/50 text-sm">No posts in this group yet.</p>
                </div>
              ) : posts.map((p: any) => (
                <div key={p.id} className="glass-card p-4" style={{ height: "auto" }}>
                  <p className="text-white text-sm line-clamp-4">{p.content}</p>
                  <p className="text-white/40 text-xs mt-2">
                    {p.createdAt ? formatDistanceToNow(new Date(p.createdAt), { addSuffix: true }) : ""}
                  </p>
                </div>
              ))}
            </div>
          )}

          {activeTab === "events" && (
            <div className="glass-card p-6 text-center">
              <Calendar className="w-8 h-8 text-white/30 mx-auto mb-2" />
              <p className="text-white/50 text-sm">No upcoming events for this group.</p>
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
