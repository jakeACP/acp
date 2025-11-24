import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Poll, Candidate, FriendSuggestion } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Star, TrendingUp, Users, UserPlus, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type FeaturedPolitician = {
  id: string;
  fullName: string;
  party?: string;
  photoUrl?: string;
  corruptionGrade?: string;
  position?: {
    title: string;
    level: string;
  };
};

type FriendSuggestionWithUser = FriendSuggestion & {
  suggestedUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
};

function PeopleYouMayKnow() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suggestions = [] } = useQuery<FriendSuggestionWithUser[]>({
    queryKey: ["/api/friend-suggestions"],
    enabled: !!user,
  });

  const dismissMutation = useMutation({
    mutationFn: async (suggestedUserId: string) => {
      return apiRequest(`/api/friend-suggestions/${suggestedUserId}/dismiss`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-suggestions"] });
      toast({
        title: "Suggestion dismissed",
        description: "We won't show you this suggestion again.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to dismiss suggestion",
        variant: "destructive",
      });
    },
  });

  const connectMutation = useMutation({
    mutationFn: async (suggestedUserId: string) => {
      return apiRequest("/api/friendships", "POST", { addresseeId: suggestedUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friend-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friendships"] });
      toast({
        title: "Friend request sent",
        description: "Your connection request has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send friend request",
        variant: "destructive",
      });
    },
  });

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      mutual_friends: "Mutual friends",
      phone_match: "In your contacts",
      email_match: "In your contacts",
      shared_groups: "Shared groups",
    };
    return labels[reason] || reason;
  };

  if (!user || suggestions.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          People You May Know
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.slice(0, 3).map((suggestion) => (
            <div key={suggestion.id} className="flex items-center gap-3" data-testid={`friend-suggestion-${suggestion.suggestedUserId}`}>
              <Avatar className="h-10 w-10">
                {suggestion.suggestedUser?.avatar && (
                  <AvatarImage src={suggestion.suggestedUser.avatar} alt={suggestion.suggestedUser.username} />
                )}
                <AvatarFallback>
                  {suggestion.suggestedUser?.username[0].toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h5 className="text-sm font-medium text-foreground truncate">
                  {suggestion.suggestedUser?.firstName && suggestion.suggestedUser?.lastName
                    ? `${suggestion.suggestedUser.firstName} ${suggestion.suggestedUser.lastName}`
                    : suggestion.suggestedUser?.username}
                </h5>
                <p className="text-xs text-muted-foreground">
                  {getReasonLabel(suggestion.reason)}
                </p>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => dismissMutation.mutate(suggestion.suggestedUserId)}
                  disabled={dismissMutation.isPending}
                  data-testid={`button-dismiss-${suggestion.suggestedUserId}`}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
                  onClick={() => connectMutation.mutate(suggestion.suggestedUserId)}
                  disabled={connectMutation.isPending || dismissMutation.isPending}
                  data-testid={`button-connect-${suggestion.suggestedUserId}`}
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  {connectMutation.isPending ? "Sending..." : "Connect"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function ActivitySidebar() {
  const { user } = useAuth();
  
  const { data: featuredPolls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls/featured"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const { data: featuredPoliticians = [] } = useQuery<FeaturedPolitician[]>({
    queryKey: ["/api/politician-profiles/featured"],
  });

  const { data: trendingTopics = [] } = useQuery<Array<{ tag: string; count: number }>>({
    queryKey: ["/api/trending-hashtags"],
  });

  const getPollProgress = (poll: Poll) => {
    if (!poll.totalVotes || poll.totalVotes === 0) return 0;
    return Math.round((poll.totalVotes / 1000) * 100); // Mock calculation
  };

  const getPollColor = (index: number) => {
    const colors = ["border-primary", "border-green-500", "border-red-500"];
    return colors[index % colors.length];
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return "bg-slate-500";
    const colors: Record<string, string> = {
      'A': 'bg-green-600',
      'B': 'bg-blue-600',
      'C': 'bg-yellow-600',
      'D': 'bg-orange-600',
      'F': 'bg-red-600',
    };
    return colors[grade] || "bg-slate-500";
  };

  return (
    <div className="space-y-6">
      {/* Featured Polls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            Featured Polls
          </CardTitle>
        </CardHeader>
        <CardContent>
          {featuredPolls.length > 0 ? (
            <div className="space-y-4">
              {featuredPolls.slice(0, 3).map((poll, index) => (
                <div key={poll.id} className={`border-l-4 pl-3 ${getPollColor(index)}`} data-testid={`featured-poll-${poll.id}`}>
                  <h5 className="text-sm font-medium text-foreground line-clamp-2">
                    {poll.title}
                  </h5>
                  <p className="text-xs text-muted-foreground">
                    Ends in {Math.ceil(Math.random() * 5)} days • {poll.totalVotes || 0} votes
                  </p>
                  <div className="mt-2 bg-muted rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full transition-all duration-500" 
                      style={{ width: `${getPollProgress(poll)}%` }}
                    />
                  </div>
                </div>
              ))}
              
              <Button variant="ghost" className="w-full text-primary text-sm p-0">
                View All Polls
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No featured polls at the moment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Featured Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            Featured Candidates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {featuredPoliticians.length > 0 ? (
            <div className="space-y-4">
              {featuredPoliticians.slice(0, 3).map((politician) => (
                <div key={politician.id} className="flex items-center gap-3" data-testid={`featured-politician-${politician.id}`}>
                  <div className="relative">
                    <Avatar className="h-12 w-12">
                      {politician.photoUrl ? (
                        <AvatarImage src={politician.photoUrl} alt={politician.fullName} />
                      ) : (
                        <AvatarFallback>
                          <Users className="h-6 w-6" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {politician.corruptionGrade && (
                      <div 
                        className={`absolute -bottom-1 -right-1 ${getGradeColor(politician.corruptionGrade)} text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-background`}
                        data-testid={`corruption-grade-${politician.id}`}
                      >
                        {politician.corruptionGrade}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/politicians/${politician.id}`}>
                      <h5 className="text-sm font-semibold text-foreground hover:underline cursor-pointer">
                        {politician.fullName}
                      </h5>
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {politician.position?.title || "No position assigned"}
                    </p>
                    {politician.party && (
                      <p className="text-xs text-primary">
                        {politician.party}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              <Button variant="ghost" className="w-full text-primary text-sm p-0">
                View All Candidates
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No featured candidates available
            </p>
          )}
        </CardContent>
      </Card>

      {/* People You May Know */}
      <PeopleYouMayKnow />

      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendingTopics.length > 0 ? (
            <div className="space-y-3">
              {trendingTopics.slice(0, 4).map((topic) => (
                <div key={topic.tag} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                    {topic.tag}
                  </span>
                  <span className="text-xs text-muted-foreground">{topic.count} post{topic.count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No trending topics yet
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subscription Status */}
      <Card className="bg-gradient-to-r from-primary to-blue-600 text-primary-foreground">
        <CardContent className="p-6">
          <div className="flex items-center mb-3">
            <Star className="h-5 w-5 mr-2" />
            <h4 className="font-semibold">
              {user?.stripeSubscriptionId ? "Premium Member" : "Free Account"}
            </h4>
          </div>
          <p className="text-sm opacity-90 mb-4">
            {user?.stripeSubscriptionId 
              ? "Your subscription supports transparent democracy. Next billing: Dec 15, 2024"
              : "Upgrade to premium for enhanced features and to support the movement"
            }
          </p>
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              size="sm"
              className="bg-card text-primary hover:bg-muted"
            >
              {user?.stripeSubscriptionId ? "Manage" : "Upgrade"}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="text-primary-foreground hover:bg-primary-foreground/20"
            >
              {user?.stripeSubscriptionId ? "Billing" : "Learn More"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
