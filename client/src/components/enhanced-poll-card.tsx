import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Poll } from "@shared/schema";
import { Vote, Clock, Users, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface EnhancedPollCardProps {
  poll: Poll;
}

export function EnhancedPollCard({ poll }: EnhancedPollCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedOption, setSelectedOption] = useState<string>("");

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      const res = await apiRequest(`/api/polls/${poll.id}/vote`, "POST", { optionId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/vote-count"] });
      toast({
        title: "Vote Recorded",
        description: "Thank you for participating in this poll!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote Failed",
        description: error.message || "Failed to record your vote",
        variant: "destructive",
      });
    },
  });

  const handleVote = () => {
    if (!selectedOption) return;
    voteMutation.mutate(selectedOption);
  };

  const totalVotes = poll.totalVotes || poll.options?.reduce((sum, option) => sum + (option.votes || 0), 0) || 0;
  const isExpired = poll.endDate && new Date(poll.endDate) < new Date();
  const daysLeft = poll.endDate ? Math.ceil((new Date(poll.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Card className="overflow-hidden border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                <Vote className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                {poll.title}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={poll.isActive ? "default" : "secondary"}>
                  {poll.isActive ? "Active" : "Closed"}
                </Badge>
                {daysLeft !== null && daysLeft > 0 && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {daysLeft} days left
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {totalVotes} votes
                </Badge>
              </div>
            </div>
          </div>
        </div>
        
        {poll.description && (
          <p className="text-gray-600 mt-2">{poll.description}</p>
        )}
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {poll.options?.map((option) => {
            const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
            const isSelected = selectedOption === option.id;
            
            return (
              <div key={option.id} className="space-y-2">
                <div
                  className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  } ${!poll.isActive || isExpired ? "cursor-not-allowed opacity-60" : ""}`}
                  onClick={() => {
                    if (poll.isActive && !isExpired) {
                      setSelectedOption(option.id);
                    }
                  }}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"
                    }`}>
                      {isSelected && <CheckCircle className="h-4 w-4 text-white" />}
                    </div>
                    <span className="font-medium text-gray-900">{option.text}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold text-gray-700">
                      {percentage}%
                    </span>
                    <span className="text-xs text-gray-500">
                      ({option.votes} votes)
                    </span>
                  </div>
                </div>
                
                <Progress value={percentage} className="h-2" />
              </div>
            );
          })}
        </div>

        {poll.isActive && !isExpired && user && (
          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleVote}
              disabled={!selectedOption || voteMutation.isPending}
              className="px-6"
            >
              {voteMutation.isPending ? "Voting..." : "Cast Vote"}
            </Button>
          </div>
        )}

        {isExpired && (
          <div className="mt-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              This poll ended {formatDistanceToNow(new Date(poll.endDate!), { addSuffix: true })}
            </p>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Created {poll.createdAt ? formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true }) : "recently"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}