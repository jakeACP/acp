import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { MobileBottomNav } from "../components/MobileBottomNav";
import {
  Calendar, MapPin, Users, Clock, ChevronLeft, ChevronRight,
  Video, CheckCircle2, X, Loader2, Search,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay,
  addMonths, subMonths, parseISO, isToday,
} from "date-fns";
import { Link } from "wouter";
import type { Event as EventType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import "../mobile-theme.css";

// Track RSVP'd events in component state (optimistic + localStorage for persistence)
const RSVP_KEY = "acp_rsvp_events";
function loadRsvps(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(RSVP_KEY) ?? "[]")); } catch { return new Set(); }
}
function saveRsvps(s: Set<string>) {
  try { localStorage.setItem(RSVP_KEY, JSON.stringify(Array.from(s))); } catch {}
}

function EventCard({ event, isRegistered, onRsvp, onUnrsvp }: {
  event: EventType;
  isRegistered: boolean;
  onRsvp: (id: string) => void;
  onUnrsvp: (id: string) => void;
}) {
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <div className="glass-card p-4 space-y-3" data-testid={`event-card-${event.id}`}>
      <Link href={`/mobile/events/${event.id}`}>
        <div className="flex items-start gap-3 active:opacity-80 transition-opacity">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
            style={{ background: "linear-gradient(135deg,rgba(59,130,246,0.25),rgba(139,92,246,0.25))", border: "1px solid rgba(255,255,255,0.1)" }}>
            <span className="text-white/55 text-[10px] uppercase font-semibold">{format(startDate, "MMM")}</span>
            <span className="text-white font-bold text-xl leading-none">{format(startDate, "d")}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-white font-semibold text-sm leading-snug line-clamp-2">{event.title}</h4>
            <div className="flex items-center gap-1 text-white/55 text-xs mt-1">
              <Clock className="w-3 h-3" />
              <span>{format(startDate, "h:mm a")}{endDate && ` – ${format(endDate, "h:mm a")}`}</span>
            </div>
            <div className="flex items-center gap-1 text-white/45 text-xs mt-0.5">
              <MapPin className="w-3 h-3" />
              <span className="truncate">
                {event.isVirtual ? "Online Event" : [event.location, event.city, event.state].filter(Boolean).join(", ")}
              </span>
            </div>
          </div>
          {event.isVirtual && (
            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg flex-shrink-0"
              style={{ background: "rgba(139,92,246,0.2)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.3)" }}>
              <Video className="w-3 h-3" /> Virtual
            </span>
          )}
        </div>
      </Link>

      {event.description && (
        <p className="text-white/45 text-xs line-clamp-2 leading-relaxed">{event.description}</p>
      )}

      <div className="flex items-center justify-between pt-1 border-t border-white/8"
        style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-1 text-white/45 text-xs">
          <Users className="w-3.5 h-3.5" />
          <span>
            {event.currentAttendees ?? 0}
            {event.maxAttendees ? ` / ${event.maxAttendees}` : ""} attending
          </span>
        </div>

        {isRegistered ? (
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-semibold text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> Going
            </span>
            <button onClick={() => onUnrsvp(String(event.id))}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-semibold"
              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : (
          <button onClick={() => onRsvp(String(event.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-[0.97]"
            style={{ background: "linear-gradient(135deg,rgba(230,57,58,0.35),rgba(59,91,169,0.35))", color: "#fff", border: "1px solid rgba(255,255,255,0.12)" }}
            data-testid={`rsvp-event-${event.id}`}>
            RSVP
          </button>
        )}
      </div>
    </div>
  );
}

export default function MobileEventsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [query, setQuery] = useState("");
  const [rsvped, setRsvped] = useState<Set<string>>(loadRsvps);

  const { data: events = [], isLoading } = useQuery<EventType[]>({
    queryKey: ["/api/events"],
    staleTime: 30_000,
  });

  const rsvpMutation = useMutation({
    mutationFn: ({ id, cancel }: { id: string; cancel: boolean }) =>
      cancel
        ? apiRequest(`/api/events/${id}/register`, "DELETE")
        : apiRequest(`/api/events/${id}/register`, "POST", { status: "attending" }),
    onSuccess: (_, { id, cancel }) => {
      const next = new Set(rsvped);
      cancel ? next.delete(id) : next.add(id);
      setRsvped(next);
      saveRsvps(next);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({ title: cancel ? "RSVP cancelled" : "🎉 You're going!" });
    },
    onError: () => toast({ title: "Action failed", variant: "destructive" }),
  });

  const handleRsvp = (id: string) => {
    if (!user) { toast({ title: "Log in to RSVP" }); return; }
    rsvpMutation.mutate({ id, cancel: false });
  };
  const handleUnrsvp = (id: string) => rsvpMutation.mutate({ id, cancel: true });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const eventsOnDate = (date: Date) =>
    events.filter((e) => isSameDay(parseISO(e.startDate as unknown as string), date));

  const filteredEvents = (() => {
    let list = selectedDate ? eventsOnDate(selectedDate) : [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    if (query) {
      const q = query.toLowerCase();
      list = list.filter((e) => e.title.toLowerCase().includes(q) || e.city?.toLowerCase().includes(q) || e.state?.toLowerCase().includes(q));
    }
    return list;
  })();

  return (
    <div className="mobile-root">
      <div className="glass-top-bar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-container"><Calendar className="w-5 h-5 text-white" /></div>
            <div>
              <h1 className="text-white font-bold text-lg">Events</h1>
              <p className="text-white/60 text-xs">
                {rsvped.size > 0 ? `${rsvped.size} upcoming · ` : ""}Community gatherings
              </p>
            </div>
          </div>
          <button onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
            className="notification-button" data-testid="toggle-view">
            {viewMode === "calendar" ? <Users className="w-5 h-5 text-white" /> : <Calendar className="w-5 h-5 text-white" />}
          </button>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
          <input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Search events…"
            className="w-full rounded-2xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-white/25 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }} />
          {query && <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30"><X className="w-3.5 h-3.5" /></button>}
        </div>

        {/* Calendar */}
        {viewMode === "calendar" && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                data-testid="prev-month">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-white font-semibold text-lg">{format(currentMonth, "MMMM yyyy")}</h2>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                data-testid="next-month">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <div key={i} className="text-center text-white/50 text-xs font-semibold py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, i) => <div key={`pad-${i}`} className="aspect-square" />)}
              {daysInMonth.map((day) => {
                const dayEvents = eventsOnDate(day);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                return (
                  <button key={day.toISOString()} onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${
                      isSelected ? "bg-gradient-to-br from-red-500 to-blue-500 text-white"
                        : isTodayDate ? "bg-white/20 text-white"
                        : "text-white/80 hover:bg-white/10"}`}
                    data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}>
                    <span className={`text-sm font-medium ${isTodayDate && !isSelected ? "text-red-400" : ""}`}>
                      {format(day, "d")}
                    </span>
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div key={i} className={`w-1 h-1 rounded-full ${isSelected ? "bg-white" : "bg-red-400"}`} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Event list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold text-sm">
              {selectedDate ? `Events on ${format(selectedDate, "MMM d")}`
                : viewMode === "list" ? "All Events" : "Upcoming Events"}
            </h3>
            {selectedDate && (
              <button onClick={() => setSelectedDate(null)} className="text-red-400 text-xs"
                data-testid="clear-date-filter">Clear filter</button>
            )}
          </div>

          {isLoading ? (
            [1,2,3].map((i) => (
              <div key={i} className="glass-card p-4 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
                <div className="h-4 bg-white/10 rounded w-1/2 mb-3" />
                <div className="h-3 bg-white/10 rounded w-full" />
              </div>
            ))
          ) : filteredEvents.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60 text-sm">
                {selectedDate ? "No events on this date" : query ? "No events found" : "No upcoming events"}
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <EventCard key={event.id} event={event}
                isRegistered={rsvped.has(String(event.id))}
                onRsvp={handleRsvp}
                onUnrsvp={handleUnrsvp} />
            ))
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}
