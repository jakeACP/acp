import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Poll, Candidate } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Star, TrendingUp } from "lucide-react";

export function ActivitySidebar() {
  const { user } = useAuth();
  
  const { data: activePolls = [] } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const { data: candidates = [] } = useQuery<Candidate[]>({
    queryKey: ["/api/candidates"],
  });

  const getPollProgress = (poll: Poll) => {
    if (!poll.totalVotes || poll.totalVotes === 0) return 0;
    return Math.round((poll.totalVotes / 1000) * 100); // Mock calculation
  };

  const getPollColor = (index: number) => {
    const colors = ["border-primary", "border-green-500", "border-red-500"];
    return colors[index % colors.length];
  };

  const trendingTopics = [
    { tag: "#ClimateAction", posts: 234 },
    { tag: "#EducationReform", posts: 189 },
    { tag: "#AffordableHousing", posts: 156 },
    { tag: "#TransportEquity", posts: 98 },
  ];

  return (
    <div className="space-y-6">
      {/* Active Polls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active Polls</CardTitle>
        </CardHeader>
        <CardContent>
          {activePolls.length > 0 ? (
            <div className="space-y-4">
              {activePolls.slice(0, 3).map((poll, index) => (
                <div key={poll.id} className={`border-l-4 pl-3 ${getPollColor(index)}`}>
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
              No active polls at the moment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Featured Candidates */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Featured Candidates</CardTitle>
        </CardHeader>
        <CardContent>
          {candidates.length > 0 ? (
            <div className="space-y-4">
              {candidates.slice(0, 3).map((candidate) => (
                <div key={candidate.id} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {candidate.userId.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-foreground">
                      Candidate Name
                    </h5>
                    <p className="text-xs text-muted-foreground">
                      Running for {candidate.position}
                    </p>
                    <p className="text-xs text-primary">
                      {candidate.endorsements} supporters
                    </p>
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

      {/* Trending Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Trending Topics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {trendingTopics.map((topic, index) => (
              <div key={topic.tag} className="flex items-center justify-between">
                <span className="text-sm font-medium text-primary hover:underline cursor-pointer">
                  {topic.tag}
                </span>
                <span className="text-xs text-muted-foreground">{topic.posts} posts</span>
              </div>
            ))}
          </div>
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
