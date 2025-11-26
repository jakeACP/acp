import { Link } from "wouter";
import { Calendar, MapPin, Users, Video } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface EventCardProps {
  post: {
    id: string;
    content: string;
    eventId?: string | null;
    createdAt?: Date | string | null;
    author?: {
      username: string;
      firstName?: string | null;
      lastName?: string | null;
      avatar?: string | null;
    };
  };
  event?: {
    id: string;
    title: string;
    description?: string | null;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
    location?: string | null;
    virtualLink?: string | null;
    venueType?: string | null;
    attendeeCount?: number | null;
    maxAttendees?: number | null;
    image?: string | null;
    tags?: string[] | null;
  } | null;
}

export function EventCard({ post, event }: EventCardProps) {
  const hasEvent = !!event;
  const startDate = event?.startDate ? new Date(event.startDate) : null;
  const isUpcoming = startDate && startDate > new Date();
  const isVirtual = event?.venueType === 'virtual' || !!event?.virtualLink;

  if (!hasEvent) {
    return (
      <article className="glass-card p-3" data-testid={`event-card-${post.id}`}>
        <div className="absolute top-3 left-3 z-10">
          <span className="type-tag event flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Event
          </span>
        </div>
        <div className="pt-10">
          <p className="text-white text-sm line-clamp-4 mb-3">
            {post.content}
          </p>
          {post.eventId && (
            <Link href={`/events/${post.eventId}`}>
              <button 
                className="glass-button primary text-xs py-1.5 px-3"
                data-testid={`view-event-${post.eventId}`}
              >
                View Event
              </button>
            </Link>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="glass-card p-3 overflow-hidden" data-testid={`event-card-${post.id}`}>
      <div className="absolute top-3 left-3 z-10 flex gap-2">
        <span className="type-tag event flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          Event
        </span>
        {isVirtual && (
          <span className="type-tag virtual flex items-center gap-1">
            <Video className="w-3 h-3" />
            Virtual
          </span>
        )}
      </div>

      {event.image && (
        <div className="absolute inset-0 z-0">
          <img 
            src={event.image} 
            alt=""
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-black/40" />
        </div>
      )}
      
      <div className="relative z-10 pt-10">
        <h3 className="text-white font-bold text-sm line-clamp-2 mb-2">
          {event.title}
        </h3>
        
        {startDate && (
          <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
            <Calendar className="w-3 h-3 text-red-400" />
            <span>
              {format(startDate, 'MMM d, yyyy')} at {format(startDate, 'h:mm a')}
            </span>
          </div>
        )}
        
        {event.location && (
          <div className="flex items-center gap-2 text-white/70 text-xs mb-2">
            <MapPin className="w-3 h-3 text-blue-400" />
            <span className="truncate">{event.location}</span>
          </div>
        )}
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-white/60 text-xs">
            <Users className="w-3 h-3" />
            <span>
              {event.attendeeCount || 0}
              {event.maxAttendees ? ` / ${event.maxAttendees}` : ''} attending
            </span>
          </div>
          
          <Link href={`/events/${event.id}`}>
            <button 
              className="glass-button primary text-xs py-1.5 px-3"
              data-testid={`rsvp-event-${event.id}`}
            >
              {isUpcoming ? 'RSVP' : 'View'}
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}
