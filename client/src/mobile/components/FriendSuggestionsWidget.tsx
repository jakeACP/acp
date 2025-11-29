import { useQuery, useMutation } from "@tanstack/react-query";
import { UserPlus, ChevronRight, Contact2, Users, MapPin, X } from "lucide-react";
import { Link } from "wouter";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FriendSuggestion {
  user: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  score: number;
  reasons: string[];
  contactName?: string;
  location?: string;
  mutualCount: number;
}

export function FriendSuggestionsWidget() {
  const { toast } = useToast();

  const { data: suggestions = [], isLoading } = useQuery<FriendSuggestion[]>({
    queryKey: ['/api/friends/suggestions'],
    staleTime: 300000,
  });

  const sendRequestMutation = useMutation({
    mutationFn: (addresseeId: string) => 
      apiRequest('/api/friendships/request', 'POST', { addresseeId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  });

  const dismissMutation = useMutation({
    mutationFn: (suggestedUserId: string) => 
      apiRequest(`/api/suggestions/${suggestedUserId}/dismiss`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/friends/suggestions'] });
    }
  });

  if (isLoading || suggestions.length === 0) {
    return null;
  }

  // Filter out any invalid suggestions that don't have user data
  const validSuggestions = suggestions.filter(s => s && s.user && s.user.id);
  if (validSuggestions.length === 0) {
    return null;
  }

  const displaySuggestions = validSuggestions.slice(0, 10);

  const getReasonIcon = (reasons: string[]) => {
    if (reasons.includes('contact')) return <Contact2 className="w-3 h-3" />;
    if (reasons.includes('mutual_friends')) return <Users className="w-3 h-3" />;
    if (reasons.includes('location')) return <MapPin className="w-3 h-3" />;
    return null;
  };

  const getReasonText = (suggestion: FriendSuggestion) => {
    if (suggestion.reasons.includes('contact')) {
      return suggestion.contactName ? `In contacts as "${suggestion.contactName}"` : 'From contacts';
    }
    if (suggestion.reasons.includes('mutual_friends')) {
      return `${suggestion.mutualCount} mutual`;
    }
    if (suggestion.reasons.includes('location')) {
      return 'Nearby';
    }
    return '';
  };

  const getInitials = (user: FriendSuggestion['user']) => {
    if (user.firstName) return user.firstName[0].toUpperCase();
    return user.username[0].toUpperCase();
  };

  const getDisplayName = (user: FriendSuggestion['user']) => {
    if (user.firstName) {
      return user.firstName;
    }
    return user.username;
  };

  return (
    <div className="mb-4" data-testid="friend-suggestions-widget">
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-white/80 text-xs font-semibold uppercase tracking-wider">
          People You May Know
        </h3>
        <Link href="/mobile/friends">
          <button className="flex items-center gap-1 text-blue-400 text-xs" data-testid="see-all-friends">
            See All
            <ChevronRight className="w-3 h-3" />
          </button>
        </Link>
      </div>

      <div 
        className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {displaySuggestions.map((suggestion) => (
          <div
            key={suggestion.user.id}
            className="flex-shrink-0 glass-card p-3 w-32 relative"
            data-testid={`suggestion-widget-${suggestion.user.id}`}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissMutation.mutate(suggestion.user.id);
              }}
              className="absolute top-1.5 right-1.5 p-1 rounded-full hover:bg-white/10 transition-colors"
              data-testid={`dismiss-widget-${suggestion.user.id}`}
            >
              <X className="w-3 h-3 text-white/40" />
            </button>

            <Link href={`/mobile/profile/${suggestion.user.id}`}>
              <div className="flex flex-col items-center">
                <Avatar className="w-14 h-14 border-2 border-white/20 mb-2">
                  <AvatarImage src={suggestion.user.avatar} />
                  <AvatarFallback className="bg-gradient-to-br from-red-500 to-blue-600 text-white text-lg">
                    {getInitials(suggestion.user)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-white text-sm font-medium truncate w-full text-center">
                  {getDisplayName(suggestion.user)}
                </span>
              </div>
            </Link>

            <div className="flex items-center justify-center gap-1 mt-1 text-white/50 text-[10px]">
              {getReasonIcon(suggestion.reasons)}
              <span className="truncate">{getReasonText(suggestion)}</span>
            </div>

            <button
              onClick={() => sendRequestMutation.mutate(suggestion.user.id)}
              disabled={sendRequestMutation.isPending}
              className="w-full mt-2 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-blue-600 text-white text-xs font-medium flex items-center justify-center gap-1"
              data-testid={`add-widget-${suggestion.user.id}`}
            >
              <UserPlus className="w-3 h-3" />
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
