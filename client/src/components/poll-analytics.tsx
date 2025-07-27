import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { Poll } from "@shared/schema";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  Trophy,
  Shield,
  Calendar,
  Target
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface PollAnalyticsProps {
  poll: Poll;
}

export function PollAnalytics({ poll }: PollAnalyticsProps) {
  const { data: rankedResults } = useQuery({
    queryKey: ["/api/polls", poll.id, "ranked-results"],
    enabled: poll.votingType === "ranked_choice",
  });

  const totalVotes = poll.totalVotes || 0;
  const participationRate = totalVotes; // Would calculate based on eligible voters in real app
  
  // Calculate winner and winning percentage
  const winner = poll.options?.reduce((prev, current) => 
    (prev.votes > current.votes) ? prev : current
  );
  const winningPercentage = winner && totalVotes > 0 ? 
    Math.round((winner.votes / totalVotes) * 100) : 0;

  // Calculate vote distribution
  const voteDistribution = poll.options?.map(option => ({
    ...option,
    percentage: totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0
  })) || [];

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <BarChart3 className="h-5 w-5" />
          Poll Analytics
          {poll.votingType === "ranked_choice" && (
            <Badge variant="outline" className="border-purple-500 text-purple-700">
              <Trophy className="h-3 w-3 mr-1" />
              Ranked Choice
            </Badge>
          )}
          {poll.isBlockchainVerified && (
            <Badge variant="outline" className="border-green-500 text-green-700">
              <Shield className="h-3 w-3 mr-1" />
              Blockchain Verified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Vote Breakdown</TabsTrigger>
            {poll.votingType === "ranked_choice" && (
              <TabsTrigger value="rounds">Elimination Rounds</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Total Votes</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{totalVotes}</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Winner</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 truncate">
                    {winner?.text || "No votes yet"}
                  </p>
                  <p className="text-sm text-gray-500">{winningPercentage}%</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Status</span>
                  </div>
                  <Badge variant={poll.isActive ? "default" : "secondary"} className="mt-1">
                    {poll.isActive ? "Active" : "Closed"}
                  </Badge>
                  {poll.endDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      {poll.isActive ? "Ends" : "Ended"} {formatDistanceToNow(new Date(poll.endDate), { addSuffix: true })}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Created</span>
                  </div>
                  <p className="text-sm font-medium text-purple-600">
                    {poll.createdAt ? formatDistanceToNow(new Date(poll.createdAt), { addSuffix: true }) : "Recently"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Poll Information */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">{poll.title}</h4>
                {poll.description && (
                  <p className="text-sm text-gray-600 mb-3">{poll.description}</p>
                )}
                
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {poll.votingType === "ranked_choice" ? "Ranked Choice Voting" : "Simple Voting"}
                  </Badge>
                  {poll.isBlockchainVerified && (
                    <Badge variant="outline" className="border-green-500 text-green-700">
                      Blockchain Verified
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {poll.options?.length || 0} Options
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            {voteDistribution.length > 0 ? (
              <div className="space-y-3">
                {voteDistribution
                  .sort((a, b) => b.votes - a.votes)
                  .map((option, index) => (
                    <Card key={option.id} className={index === 0 ? "border-green-200 bg-green-50" : ""}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {index === 0 && <Trophy className="h-4 w-4 text-green-600" />}
                            <span className="font-medium">{option.text}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">{option.percentage}%</span>
                            <p className="text-xs text-gray-500">({option.votes} votes)</p>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              index === 0 ? "bg-green-500" : "bg-blue-500"
                            }`}
                            style={{ width: `${option.percentage}%` }}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-600 mb-2">No votes yet</h3>
                  <p className="text-gray-500">Be the first to vote on this poll!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {poll.votingType === "ranked_choice" && (
            <TabsContent value="rounds" className="space-y-4">
              {rankedResults?.rounds ? (
                <div className="space-y-4">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-2">Instant Runoff Results</h4>
                    <p className="text-sm text-purple-700">
                      {rankedResults.winner ? 
                        `Winner: ${poll.options?.find(opt => opt.id === rankedResults.winner)?.text}` :
                        "No winner determined yet"
                      }
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      {rankedResults.rounds.length} elimination rounds
                    </p>
                  </div>

                  {rankedResults.rounds.map((round: any, index: number) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h5 className="font-medium">Round {round.round}</h5>
                          <Badge variant="outline">
                            {round.totalVotes} votes • {Math.round(round.majorityThreshold)} needed
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          {Object.entries(round.voteCounts).map(([optionId, votes]: [string, any]) => {
                            const option = poll.options?.find(opt => opt.id === optionId);
                            const percentage = round.totalVotes > 0 ? 
                              Math.round((votes / round.totalVotes) * 100) : 0;
                            const isWinner = round.winner === optionId;
                            const isEliminated = round.eliminated === optionId;

                            return (
                              <div key={optionId} className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-medium ${
                                    isWinner ? "text-green-600" : 
                                    isEliminated ? "text-red-500 line-through" : "text-gray-900"
                                  }`}>
                                    {option?.text}
                                  </span>
                                  {isWinner && <Trophy className="h-4 w-4 text-green-500" />}
                                  {isEliminated && <Badge variant="destructive" className="text-xs">Eliminated</Badge>}
                                </div>
                                <span className="text-sm font-medium">
                                  {votes} votes ({percentage}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">No ranked votes yet</h3>
                    <p className="text-gray-500">Elimination rounds will appear once voting begins</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}