import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Poll } from "@shared/schema";
import { BarChart3, Clock, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOption, setSelectedOption] = useState<string>("");

  const { data: myVote } = useQuery<{ optionId: string | null }>({
    queryKey: ["/api/polls", poll.id, "my-vote"],
    enabled: !!user && !!poll.id,
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return await apiRequest(`/api/polls/${poll.id}/vote`, "POST", { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls", poll.id, "my-vote"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/vote-count"] });
      toast({
        title: "Vote submitted",
        description: "Your vote has been recorded successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Vote failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    console.log("Cast vote clicked, selectedOption:", selectedOption);
    if (selectedOption) {
      console.log("Submitting vote for option:", selectedOption);
      voteMutation.mutate(selectedOption);
    } else {
      console.log("No option selected");
    }
  };

  const hasVoted = !!myVote?.optionId;
  const totalVotes = poll.totalVotes || 0;

  const getOptionPercentage = (optionVotes: number) => {
    if (totalVotes === 0) return 0;
    return Math.round((optionVotes / totalVotes) * 100);
  };

  const getTimeRemaining = () => {
    if (!poll.endDate) return "No end date";
    const now = new Date();
    const end = new Date(poll.endDate);
    const diff = end.getTime() - now.getTime();
    
    if (diff <= 0) return "Ended";
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return `${days} day${days !== 1 ? 's' : ''} left`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center mr-3">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Community Poll</h3>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {getTimeRemaining()}
              </div>
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                {totalVotes} votes
              </div>
            </div>
          </div>
        </div>
        
        <h4 
          className="text-lg font-medium text-slate-900 mb-4 cursor-pointer hover:text-primary transition-colors"
          onClick={() => window.location.href = `/polls/${poll.id}`}
          data-testid="link-poll-title"
        >
          {poll.title}
        </h4>
        
        {poll.description && (
          <p className="text-slate-600 mb-4">{poll.description}</p>
        )}
      </CardHeader>

      <CardContent>
        {poll.options && poll.options.length > 0 && (
          <div className="space-y-3 mb-6">
            {hasVoted ? (
              // Show results if user has voted
              poll.options.map((option) => {
                const percentage = getOptionPercentage(option.votes || 0);
                const isMyVote = myVote?.optionId === option.id;
                
                return (
                  <div
                    key={option.id}
                    className={`p-3 rounded-lg border-2 ${
                      isMyVote 
                        ? "border-primary bg-primary/5" 
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-slate-900">
                        {option.text}
                        {isMyVote && <span className="text-primary ml-2">✓</span>}
                      </span>
                      <span className="text-sm font-semibold text-slate-600">
                        {percentage}%
                      </span>
                    </div>
                    <div className="bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${
                          isMyVote ? "bg-primary" : "bg-slate-400"
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              // Show voting interface if user hasn't voted
              <RadioGroup
                value={selectedOption}
                onValueChange={(value) => {
                  console.log("Poll option selected:", value);
                  setSelectedOption(value);
                }}
              >
                {poll.options.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border-2 border-slate-200 hover:border-slate-300 cursor-pointer"
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        )}
        
        <div className="flex justify-between items-center">
          {!hasVoted ? (
            <Button
              onClick={handleVote}
              disabled={!selectedOption || voteMutation.isPending}
              className="px-6"
            >
              {voteMutation.isPending ? "Submitting..." : "Cast Vote"}
            </Button>
          ) : (
            <div className="text-sm text-slate-600">
              You voted on this poll
            </div>
          )}
          
          <Button variant="ghost" size="sm" className="text-primary">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
