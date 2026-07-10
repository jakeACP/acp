/**
 * Mobile Saved Civic Actions
 *
 * Aggregates everything a user has saved across civic features:
 *  - Followed representatives (GET /api/representatives/followed)
 *  - Subscribed boycotts (GET /api/user/boycotts)
 *  - RSVP'd events (localStorage "acp_rsvp_events" + event data)
 *  - Signed petitions (localStorage "acp_signed_petitions" + petition data)
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  ChevronLeft, ChevronRight, Bell, BellOff, Ban, Calendar,
  CheckCircle2, Users, BookmarkX, Star, Globe, X, Loader2,
} from "lucide-react";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

interface FollowedRep {
  id: string | number;
  name: string;
  office: string;
  party: string | null;
  createdAt?: string;
}

interface UserBoycott {
  id: string;
  boycottId: string;
  boycott?: {
    id: string;
    name: string;
    targetCompany?: string;
    reason?: string;
    subscriberCount?: number;
  };
}

interface Petition {
  id: string;
  title: string;
  currentSignatures: number;
  targetSignatures: number;
}

interface EventType {
  id: string | number;
  title: string;
  startDate: string;
  location?: string;
  city?: string;
  state?: string;
  isVirtual?: boolean;
}

function partyColor(party: string | null) {
  const p = party?.toLowerCase() ?? "";
  if (p.includes("democrat")) return "#1d4ed8";
  if (p.includes("republican")) return "#dc2626";
  if (p.includes("anti-corruption") || p.includes("acp")) return "#7c3aed";
  return "#374151";
}

function timeAgo(dateStr?: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function Section({ title, icon, count, children }: {
  title: string; icon: string; count: number; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span>{icon}</span>
        <p className="text-xs font-bold text-white/55 uppercase tracking-wide">{title}</p>
        <span className="text-white/25 text-xs ml-auto">{count}</span>
      </div>
      {children}
    </div>
  );
}

export function MobileSavedCivicPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Followed reps
  const { data: followedReps = [], isLoading: repsLoading } = useQuery<FollowedRep[]>({
    queryKey: ["/api/representatives/followed"],
    enabled: !!user,
    staleTime: 30_000,
  });

  // Followed boycotts
  const { data: userBoycotts = [], isLoading: boycottsLoading } = useQuery<UserBoycott[]>({
    queryKey: ["/api/user/boycotts"],
    enabled: !!user,
    staleTime: 30_000,
  });

  // RSVP'd events (IDs from localStorage)
  const rsvpedIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("acp_rsvp_events") ?? "[]"); } catch { return []; }
  })();

  // Signed petitions (IDs from localStorage)
  const signedIds: string[] = (() => {
    try { return JSON.parse(localStorage.getItem("acp_signed_petitions") ?? "[]"); } catch { return []; }
  })();

  // Fetch events for RSVP'd IDs
  const { data: allEvents = [] } = useQuery<EventType[]>({
    queryKey: ["/api/events"],
    staleTime: 60_000,
    enabled: rsvpedIds.length > 0,
  });
  const rsvpedEvents = allEvents.filter((e) => rsvpedIds.includes(String(e.id)));

  // Fetch petitions for signed IDs
  const { data: allPetitions = [] } = useQuery<Petition[]>({
    queryKey: ["/api/petitions"],
    staleTime: 60_000,
    enabled: signedIds.length > 0,
  });
  const signedPetitions = allPetitions.filter((p) => signedIds.includes(p.id));

  const unfollowRepMutation = useMutation({
    mutationFn: (name: string) => apiRequest("/api/representatives/unfollow", "DELETE", { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/representatives/followed"] });
      toast({ title: "Removed from saved" });
    },
    onError: () => toast({ title: "Could not remove", variant: "destructive" }),
  });

  const unfollowBoycottMutation = useMutation({
    mutationFn: (boycottId: string) => apiRequest(`/api/boycotts/${boycottId}/subscribe`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/boycotts"] });
      toast({ title: "Left boycott" });
    },
    onError: () => toast({ title: "Could not remove", variant: "destructive" }),
  });

  const cancelRsvp = (eventId: string) => {
    const ids = new Set(rsvpedIds);
    ids.delete(eventId);
    try { localStorage.setItem("acp_rsvp_events", JSON.stringify(Array.from(ids))); } catch {}
    apiRequest(`/api/events/${eventId}/register`, "DELETE").catch(() => {});
    queryClient.invalidateQueries({ queryKey: ["/api/events"] });
    toast({ title: "RSVP cancelled" });
  };

  const removeSigned = (petitionId: string) => {
    const ids = new Set(signedIds);
    ids.delete(petitionId);
    try { localStorage.setItem("acp_signed_petitions", JSON.stringify(Array.from(ids))); } catch {}
    toast({ title: "Removed from saved" });
  };

  if (!user) {
    return (
      <div className="mobile-root" data-testid="mobile-saved-civic-page">
        <div className="glass-top-bar">
          <div className="flex items-center gap-3">
            <Link href="/mobile/civic">
              <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
            </Link>
            <h1 className="text-white font-bold text-lg">Saved Actions</h1>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
          <Star className="w-14 h-14 text-white/20 mb-4" />
          <p className="text-white font-semibold mb-2">Log in to see your saved civic actions</p>
          <p className="text-white/40 text-sm mb-6">Track petitions you've signed, reps you follow, boycotts you support, and events you're attending.</p>
          <Link href="/auth">
            <button className="px-6 py-3 rounded-2xl text-sm font-semibold text-white"
              style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.4),rgba(59,91,169,0.4))", border: "1px solid rgba(255,255,255,0.15)" }}>
              Log In
            </button>
          </Link>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const totalSaved = followedReps.length + userBoycotts.length + rsvpedEvents.length + signedPetitions.length;
  const isLoading = repsLoading || boycottsLoading;

  return (
    <div className="mobile-root" data-testid="mobile-saved-civic-page">
      <div className="glass-top-bar">
        <div className="flex items-center gap-3">
          <Link href="/mobile/civic">
            <button className="notification-button"><ChevronLeft className="w-5 h-5 text-white" /></button>
          </Link>
          <div>
            <h1 className="text-white font-bold text-lg">Saved Actions</h1>
            <p className="text-white/50 text-xs">{totalSaved} saved item{totalSaved !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-3 pb-28 space-y-5">
        {isLoading && (
          <div className="space-y-3">
            {[1,2,3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-1/2 mb-2" />
                <div className="h-3 bg-white/10 rounded w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && totalSaved === 0 && (
          <div className="flex flex-col items-center py-16 text-center">
            <BookmarkX className="w-14 h-14 text-white/20 mb-4" />
            <p className="text-white/60 font-semibold">Nothing saved yet</p>
            <p className="text-white/35 text-sm mt-1 mb-6 px-4">
              Save representatives, join boycotts, sign petitions, and RSVP to events to see them here.
            </p>
            <Link href="/mobile/civic">
              <button className="px-6 py-2.5 rounded-2xl text-sm font-semibold text-white"
                style={{ background: "rgba(59,91,169,0.3)", border: "1px solid rgba(59,91,169,0.4)" }}>
                Explore Civic Hub →
              </button>
            </Link>
          </div>
        )}

        {/* Followed Representatives */}
        {followedReps.length > 0 && (
          <Section title="Saved Representatives" icon="🏛️" count={followedReps.length}>
            <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
              {followedReps.map((rep) => (
                <div key={rep.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
                    style={{ background: `${partyColor(rep.party)}44`, border: `1.5px solid ${partyColor(rep.party)}66` }}>
                    {rep.name?.charAt(0) ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{rep.name}</p>
                    <p className="text-white/45 text-xs truncate">{rep.office}</p>
                  </div>
                  <button onClick={() => unfollowRepMutation.mutate(rep.name)}
                    disabled={unfollowRepMutation.isPending}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    aria-label="Unfollow">
                    <BellOff className="w-3.5 h-3.5 text-white/35" />
                  </button>
                </div>
              ))}
            </div>
            <Link href="/mobile/reps">
              <button className="w-full py-2 rounded-xl text-xs font-semibold text-white/50 flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Bell className="w-3.5 h-3.5" /> Manage Representatives →
              </button>
            </Link>
          </Section>
        )}

        {/* Boycotts */}
        {userBoycotts.length > 0 && (
          <Section title="Joined Boycotts" icon="✊" count={userBoycotts.length}>
            <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
              {userBoycotts.map((ub) => (
                <div key={ub.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    <Ban className="w-4 h-4 text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {ub.boycott?.targetCompany ?? ub.boycott?.name ?? `Boycott #${ub.boycottId.slice(0,8)}`}
                    </p>
                    <p className="text-white/45 text-xs truncate">{ub.boycott?.reason ?? ""}</p>
                  </div>
                  <button onClick={() => unfollowBoycottMutation.mutate(ub.boycottId)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                    aria-label="Leave boycott">
                    <X className="w-3.5 h-3.5 text-white/35" />
                  </button>
                </div>
              ))}
            </div>
            <Link href="/mobile/civic/boycotts">
              <button className="w-full py-2 rounded-xl text-xs font-semibold text-white/50 flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Ban className="w-3.5 h-3.5" /> Browse Boycotts →
              </button>
            </Link>
          </Section>
        )}

        {/* RSVP'd Events */}
        {rsvpedEvents.length > 0 && (
          <Section title="RSVP'd Events" icon="📅" count={rsvpedEvents.length}>
            <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
              {rsvpedEvents.map((event) => {
                const d = new Date(event.startDate);
                const isPast = d < new Date();
                return (
                  <div key={event.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
                    <div className="w-11 h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: isPast ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg,rgba(59,130,246,0.2),rgba(139,92,246,0.2))", border: "1px solid rgba(255,255,255,0.1)" }}>
                      <span className="text-white/50 text-[9px] uppercase font-semibold leading-none">
                        {d.toLocaleString("default", { month: "short" })}
                      </span>
                      <span className={`font-bold text-lg leading-none ${isPast ? "text-white/30" : "text-white"}`}>
                        {d.getDate()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isPast ? "text-white/40" : "text-white"}`}>{event.title}</p>
                      <p className="text-white/35 text-xs truncate">
                        {event.isVirtual ? "Online" : [event.city, event.state].filter(Boolean).join(", ")}
                        {isPast && " · Past event"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Link href={`/mobile/events/${event.id}`}>
                        <ChevronRight className="w-4 h-4 text-white/25" />
                      </Link>
                      <button onClick={() => cancelRsvp(String(event.id))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.05)" }}>
                        <X className="w-3 h-3 text-white/30" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/mobile/events">
              <button className="w-full py-2 rounded-xl text-xs font-semibold text-white/50 flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <Calendar className="w-3.5 h-3.5" /> Browse Events →
              </button>
            </Link>
          </Section>
        )}

        {/* Signed Petitions */}
        {signedPetitions.length > 0 && (
          <Section title="Signed Petitions" icon="✍️" count={signedPetitions.length}>
            <div className="glass-card overflow-hidden" style={{ borderRadius: 18 }}>
              {signedPetitions.map((petition) => {
                const pct = petition.targetSignatures > 0
                  ? Math.min(100, Math.round((petition.currentSignatures / petition.targetSignatures) * 100))
                  : 0;
                return (
                  <div key={petition.id} className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5 last:border-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)" }}>
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-1">{petition.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)", maxWidth: 80 }}>
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(to right,#E6393A,#3B5BA9)" }} />
                        </div>
                        <span className="text-white/35 text-[10px]">{pct}%</span>
                      </div>
                    </div>
                    <button onClick={() => removeSigned(petition.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(255,255,255,0.05)" }}>
                      <X className="w-3 h-3 text-white/30" />
                    </button>
                  </div>
                );
              })}
            </div>
            <Link href="/mobile/civic/petitions">
              <button className="w-full py-2 rounded-xl text-xs font-semibold text-white/50 flex items-center justify-center gap-1.5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Browse Petitions →
              </button>
            </Link>
          </Section>
        )}
      </div>

      <MobileBottomNav />
    </div>
  );
}
