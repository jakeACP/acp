import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Calendar, MapPin, Users, Video, Clock, Loader2, CheckCircle, Link as LinkIcon } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { sanitizeUrl } from "@/lib/utils";
import type { Event as EventType } from "@shared/schema";
import "../mobile-theme.css";

export function MobileEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: event, isLoading, isError } = useQuery<EventType>({
    queryKey: ["/api/events", id],
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
    enabled: !!id,
    staleTime: 30000,
  });

  const { data: attendance } = useQuery<{ attending: boolean } | null>({
    queryKey: ["/api/events", id, "attendance"],
    queryFn: async () => {
      const res = await fetch(`/api/events/${id}/attendance`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id && !!user,
  });

  const rsvpMutation = useMutation({
    mutationFn: (status: "attending" | "not_attending") =>
      apiRequest("POST", `/api/events/${id}/rsvp`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "attendance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id] });
      toast({ title: "RSVP updated!" });
    },
    onError: () => toast({ title: "Could not update RSVP", variant: "destructive" }),
  });

  const handleBack = () => navigate("/mobile/events");

  if (isLoading) {
    return (
      <div className="mobile-root flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-white/50" />
        <MobileBottomNav />
      </div>
    );
  }

  if (isError || !event) {
    return (
      <div className="mobile-root">
        <div className="glass-top-bar flex items-center gap-3">
          <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-semibold">Event</span>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 px-8 text-center">
          <span className="text-5xl mb-4">📅</span>
          <p className="text-white font-semibold mb-1">Event not found</p>
          <p className="text-white/50 text-sm mb-6">This event may have ended or been removed.</p>
          <button onClick={handleBack} className="px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "rgba(230,57,58,0.2)", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }}>
            Back to Events
          </button>
        </div>
        <MobileBottomNav />
      </div>
    );
  }

  const startDate = event.startDate ? new Date(event.startDate) : null;
  const endDate   = event.endDate   ? new Date(event.endDate)   : null;
  const isUpcoming = startDate && startDate > new Date();
  const isVirtual  = event.isVirtual || !!event.virtualLink;
  const isAttending = attendance?.attending ?? false;
  const spotsLeft = event.maxAttendees ? event.maxAttendees - (event.currentAttendees ?? 0) : null;
  const isFull    = spotsLeft !== null && spotsLeft <= 0;

  return (
    <div className="mobile-root" data-testid="mobile-event-detail-page">
      {/* Top bar */}
      <div className="glass-top-bar flex items-center gap-3">
        <button onClick={handleBack} className="p-2 rounded-full active:bg-white/10">
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-white font-bold text-base flex-1 truncate">{event.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Hero image */}
        {event.image && (
          <div className="h-52 overflow-hidden">
            <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          </div>
        )}
        {!event.image && (
          <div className="h-32 bg-gradient-to-br from-red-900/30 to-blue-900/30 flex items-center justify-center">
            <Calendar className="w-12 h-12 text-white/20" />
          </div>
        )}

        <div className="px-4 pt-4 space-y-4">
          {/* Title + tags */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="type-tag event text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Event
              </span>
              {isVirtual && (
                <span className="type-tag virtual text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Video className="w-3 h-3" /> Virtual
                </span>
              )}
              {isAttending && (
                <span className="text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)" }}>
                  <CheckCircle className="w-3 h-3" /> Going
                </span>
              )}
            </div>
            <h2 className="text-white font-bold text-xl leading-snug">{event.title}</h2>
          </div>

          {/* Details card */}
          <div className="glass-card p-4 space-y-3">
            {startDate && (
              <div className="flex items-start gap-3">
                <Calendar className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{format(startDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-white/60 text-xs">
                    {format(startDate, "h:mm a")}
                    {endDate && ` – ${format(endDate, "h:mm a")}`}
                    {isUpcoming && (
                      <span className="ml-2 text-green-400">
                        · {formatDistanceToNow(startDate, { addSuffix: true })}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}
            {event.location && !isVirtual && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">{event.location}</p>
                  {event.address && <p className="text-white/60 text-xs">{event.address}</p>}
                  {(event.city || event.state) && (
                    <p className="text-white/60 text-xs">{[event.city, event.state].filter(Boolean).join(", ")}</p>
                  )}
                </div>
              </div>
            )}
            {isVirtual && event.virtualLink && (
              <div className="flex items-start gap-3">
                <Video className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-white text-sm font-medium">Virtual Event</p>
                  <a
                    href={sanitizeUrl(event.virtualLink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 text-xs underline flex items-center gap-1 mt-0.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon className="w-3 h-3" />
                    Join link
                  </a>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-white/40 flex-shrink-0" />
              <p className="text-white/60 text-sm">
                {event.currentAttendees ?? 0} attending
                {event.maxAttendees && ` · ${spotsLeft} spot${spotsLeft !== 1 ? "s" : ""} left`}
              </p>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="glass-card p-4">
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2">About</p>
              <p className="text-white/80 text-sm leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* RSVP button */}
          {user && (
            <button
              onClick={() => rsvpMutation.mutate(isAttending ? "not_attending" : "attending")}
              disabled={rsvpMutation.isPending || (!isAttending && isFull)}
              className="w-full py-3 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
              style={isAttending
                ? { background: "rgba(74,222,128,0.15)", color: "#4ade80", border: "1px solid rgba(74,222,128,0.35)" }
                : isFull
                  ? { background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.1)" }
                  : { background: "linear-gradient(135deg, rgba(230,57,58,0.3), rgba(59,130,246,0.2))", color: "#fff", border: "1px solid rgba(230,57,58,0.4)" }
              }
              data-testid="event-rsvp-btn"
            >
              {rsvpMutation.isPending ? "Updating…"
                : isAttending ? "✓ You're going · Cancel RSVP"
                : isFull ? "Event Full"
                : isUpcoming ? "RSVP — I'm going!"
                : "View recap"}
            </button>
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
