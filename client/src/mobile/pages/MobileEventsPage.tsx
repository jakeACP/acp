import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MobileBottomNav } from "../components/MobileBottomNav";
import { Calendar, MapPin, Users, Clock, ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, parseISO, isToday } from "date-fns";
import { Link } from "wouter";
import type { Event as EventType } from "@shared/schema";
import "../mobile-theme.css";

export default function MobileEventsPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  const { data: events = [], isLoading } = useQuery<EventType[]>({
    queryKey: ['/api/events'],
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array(startDayOfWeek).fill(null);

  const eventsOnDate = (date: Date) => {
    return events.filter(event => {
      const eventDate = parseISO(event.startDate as unknown as string);
      return isSameDay(eventDate, date);
    });
  };

  const filteredEvents = selectedDate 
    ? eventsOnDate(selectedDate)
    : [...events].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  return (
    <div className="mobile-root">
      <div className="glass-top-bar">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-container">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg">Events</h1>
              <p className="text-white/60 text-xs">Community gatherings</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="notification-button"
              data-testid="toggle-view"
            >
              {viewMode === 'calendar' ? <Users className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 space-y-4">
        {viewMode === 'calendar' && (
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                data-testid="prev-month"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="text-white font-semibold text-lg">
                {format(currentMonth, 'MMMM yyyy')}
              </h2>
              <button
                onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white"
                data-testid="next-month"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                <div key={i} className="text-center text-white/50 text-xs font-semibold py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {paddingDays.map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {daysInMonth.map((day) => {
                const dayEvents = eventsOnDate(day);
                const hasEvents = dayEvents.length > 0;
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(isSelected ? null : day)}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-br from-red-500 to-blue-500 text-white' 
                        : isTodayDate
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10'
                    }`}
                    data-testid={`calendar-day-${format(day, 'yyyy-MM-dd')}`}
                  >
                    <span className={`text-sm font-medium ${isTodayDate && !isSelected ? 'text-red-400' : ''}`}>
                      {format(day, 'd')}
                    </span>
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((_, i) => (
                          <div
                            key={i}
                            className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-red-400'}`}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">
              {selectedDate 
                ? `Events on ${format(selectedDate, 'MMM d')}`
                : viewMode === 'list' ? 'All Events' : 'Upcoming Events'}
            </h3>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="text-red-400 text-sm"
                data-testid="clear-date-filter"
              >
                Clear filter
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass-card p-4">
                  <div className="skeleton h-5 w-3/4 mb-2" />
                  <div className="skeleton h-4 w-1/2 mb-3" />
                  <div className="skeleton h-3 w-full" />
                </div>
              ))}
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Calendar className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <p className="text-white/60">
                {selectedDate ? 'No events on this date' : 'No upcoming events'}
              </p>
              <p className="text-white/40 text-sm mt-1">
                Create an event to get started
              </p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          )}
        </div>
      </div>

      <MobileBottomNav />
    </div>
  );
}

function EventCard({ event }: { event: EventType }) {
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  return (
    <div className="glass-card p-4 space-y-3" data-testid={`event-card-${event.id}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex flex-col items-center justify-center border border-white/10">
          <span className="text-white/60 text-[10px] uppercase font-semibold">
            {format(startDate, 'MMM')}
          </span>
          <span className="text-white font-bold text-lg leading-none">
            {format(startDate, 'd')}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold line-clamp-2">{event.title}</h4>
          
          <div className="flex items-center gap-1 text-white/60 text-sm mt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>
              {format(startDate, 'h:mm a')}
              {endDate && ` - ${format(endDate, 'h:mm a')}`}
            </span>
          </div>
        </div>

        {event.isVirtual && (
          <span className="type-tag virtual flex-shrink-0">
            <Video className="w-3 h-3 mr-1" />
            Virtual
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-white/60 text-sm">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span className="truncate">
          {event.isVirtual && event.virtualLink ? 'Online Event' : `${event.location}, ${event.city}, ${event.state}`}
        </span>
      </div>

      {event.description && (
        <p className="text-white/50 text-sm line-clamp-2">{event.description}</p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-white/10">
        <div className="flex items-center gap-1 text-white/60 text-sm">
          <Users className="w-4 h-4" />
          <span>
            {event.currentAttendees || 0}
            {event.maxAttendees && ` / ${event.maxAttendees}`} attending
          </span>
        </div>
        
        <button className="glass-button text-sm py-2 px-4" data-testid={`rsvp-event-${event.id}`}>
          RSVP
        </button>
      </div>
    </div>
  );
}
