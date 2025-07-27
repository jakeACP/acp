import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Poll } from "@shared/schema";
import { Vote, GripVertical, Trophy, Clock, Users, Shield, ChevronUp, ChevronDown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RankedChoicePollProps {
  poll: Poll;
}

interface RankedOption {
  id: string;
  text: string;
  rank?: number;
}

export function RankedChoicePoll({ poll }: RankedChoicePollProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rankedChoices, setRankedChoices] = useState<RankedOption[]>(
    poll.options?.map(opt => ({ id: opt.id, text: opt.text })) || []
  );
  const [hasVoted, setHasVoted] = useState(false);

  const voteMutation = useMutation({
    mutationFn: async (choices: string[]) => {
      const res = await apiRequest("POST", `/api/polls/${poll.id}/ranked-vote`, { 
        rankedChoices: choices 
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      setHasVoted(true);
      toast({
        title: "Ranked Vote Recorded",
        description: "Your ranked preferences have been securely recorded and blockchain-verified!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Vote Failed",
        description: error.message || "Failed to record your ranked vote",
        variant: "destructive",
      });
    },
  });

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(rankedChoices);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setRankedChoices(items);
  };

  const moveOption = (index: number, direction: "up" | "down") => {
    const newChoices = [...rankedChoices];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    
    if (targetIndex >= 0 && targetIndex < newChoices.length) {
      [newChoices[index], newChoices[targetIndex]] = [newChoices[targetIndex], newChoices[index]];
      setRankedChoices(newChoices);
    }
  };

  const submitRankedVote = () => {
    const choices = rankedChoices.map(option => option.id);
    voteMutation.mutate(choices);
  };

  const totalVotes = poll.totalVotes || 0;
  const isExpired = poll.endDate && new Date(poll.endDate) < new Date();
  const daysLeft = poll.endDate ? Math.ceil((new Date(poll.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

  return (
    <Card className="overflow-hidden border-l-4 border-l-purple-500">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 bg-purple-100">
              <AvatarFallback>
                <Trophy className="h-5 w-5 text-purple-600" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {poll.title}
                <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700">
                  Ranked Choice
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant={poll.isActive ? "default" : "secondary"}>
                  {poll.isActive ? "Active" : "Closed"}
                </Badge>
                {poll.isBlockchainVerified && (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    <Shield className="h-3 w-3 mr-1" />
                    Blockchain Verified
                  </Badge>
                )}
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
        
        <div className="bg-purple-50 p-3 rounded-lg mt-3">
          <p className="text-sm text-purple-800 font-medium">
            🗳️ Ranked Choice Voting: Drag to reorder your preferences from most preferred (top) to least preferred (bottom)
          </p>
        </div>
      </CardHeader>

      <CardContent>
        {!hasVoted && poll.isActive && !isExpired ? (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Rank your preferences:</h4>
            
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="ranked-options">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {rankedChoices.map((option, index) => (
                      <Draggable key={option.id} draggableId={option.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-all ${
                              snapshot.isDragging
                                ? "border-purple-500 bg-purple-50 shadow-lg"
                                : "border-gray-200 hover:border-purple-300 bg-white"
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div {...provided.dragHandleProps}>
                                <GripVertical className="h-5 w-5 text-gray-400 cursor-grab" />
                              </div>
                            </div>
                            
                            <span className="flex-1 font-medium text-gray-900">
                              {option.text}
                            </span>
                            
                            <div className="flex flex-col space-y-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => moveOption(index, "up")}
                                disabled={index === 0}
                              >
                                <ChevronUp className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => moveOption(index, "down")}
                                disabled={index === rankedChoices.length - 1}
                              >
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <div className="flex justify-end pt-4">
              <Button
                onClick={submitRankedVote}
                disabled={voteMutation.isPending}
                className="px-6 bg-purple-600 hover:bg-purple-700"
              >
                {voteMutation.isPending ? (
                  "Recording Vote..."
                ) : (
                  <>
                    <Vote className="h-4 w-4 mr-2" />
                    Submit Ranked Vote
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Current Results:</h4>
            
            {poll.options?.map((option, index) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              
              return (
                <div key={option.id} className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 rounded-full bg-gray-500 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
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
                </div>
              );
            })}
          </div>
        )}

        {hasVoted && (
          <div className="mt-4 p-3 bg-green-100 rounded-lg">
            <p className="text-sm text-green-800 text-center font-medium">
              ✅ Your ranked vote has been recorded and blockchain-verified!
            </p>
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
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>
              Created {poll.createdAt ? formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true }) : "recently"}
            </span>
            {poll.isBlockchainVerified && (
              <span className="flex items-center gap-1 text-green-600">
                <Shield className="h-3 w-3" />
                Blockchain verified
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}