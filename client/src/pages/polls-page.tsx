import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Poll } from "@shared/schema";
import { EnhancedPollCard } from "@/components/enhanced-poll-card";
import { RankedChoicePoll } from "@/components/ranked-choice-poll";
import { CreatePollForm } from "@/components/create-poll-form";
import { BlockchainTransparency } from "@/components/blockchain-transparency";
import { 
  Vote, 
  Trophy, 
  Search, 
  Filter, 
  Plus, 
  Clock, 
  CheckCircle, 
  Shield,
  BarChart3,
  Users,
  Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function PollsPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "closed">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "simple" | "ranked_choice">("all");
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [showBlockchain, setShowBlockchain] = useState(false);

  const { data: polls = [], isLoading, error } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  // Filter polls based on search and filters
  const filteredPolls = polls.filter(poll => {
    const matchesSearch = poll.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         poll.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && poll.isActive) ||
                         (statusFilter === "closed" && !poll.isActive);
    
    const matchesType = typeFilter === "all" || poll.votingType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  // Categorize polls
  const activePolls = filteredPolls.filter(poll => poll.isActive);
  const closedPolls = filteredPolls.filter(poll => !poll.isActive);
  const rankedChoicePolls = filteredPolls.filter(poll => poll.votingType === "ranked_choice");
  const simplePolls = filteredPolls.filter(poll => poll.votingType === "simple" || !poll.votingType);

  if (showCreatePoll) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <CreatePollForm onCancel={() => setShowCreatePoll(false)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading polls...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 14.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Polls</h3>
          <p className="text-gray-600 mb-4">We couldn't load the polls. Please check your connection and try again.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Vote className="h-8 w-8 text-blue-600" />
            Democratic Polls
          </h1>
          <p className="text-gray-600 mt-1">
            Participate in transparent, blockchain-verified democratic decision making
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={() => setShowBlockchain(!showBlockchain)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Shield className="h-4 w-4" />
            Transparency
          </Button>
          <Button
            onClick={() => setShowCreatePoll(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Poll
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Polls</p>
                <p className="text-2xl font-bold text-blue-600">{polls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{activePolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Ranked Choice</p>
                <p className="text-2xl font-bold text-purple-600">{rankedChoicePolls.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Votes</p>
                <p className="text-2xl font-bold text-orange-600">
                  {polls.reduce((sum, poll) => sum + (poll.totalVotes || 0), 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Blockchain Transparency */}
      {showBlockchain && (
        <BlockchainTransparency />
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search polls..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="ranked_choice">Ranked Choice</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Poll Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            All ({filteredPolls.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Active ({activePolls.length})
          </TabsTrigger>
          <TabsTrigger value="ranked" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Ranked Choice ({rankedChoicePolls.length})
          </TabsTrigger>
          <TabsTrigger value="simple" className="flex items-center gap-2">
            <Vote className="h-4 w-4" />
            Simple ({simplePolls.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          {filteredPolls.length > 0 ? (
            filteredPolls.map((poll) => (
              <div key={poll.id}>
                {poll.votingType === "ranked_choice" ? (
                  <RankedChoicePoll poll={poll} />
                ) : (
                  <EnhancedPollCard poll={poll} />
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No polls found</h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                    ? "Try adjusting your search or filters" 
                    : "Be the first to create a poll for the community"}
                </p>
                {!searchTerm && statusFilter === "all" && typeFilter === "all" && (
                  <Button onClick={() => setShowCreatePoll(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Poll
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="active" className="space-y-4 mt-6">
          {activePolls.length > 0 ? (
            activePolls.map((poll) => (
              <div key={poll.id}>
                {poll.votingType === "ranked_choice" ? (
                  <RankedChoicePoll poll={poll} />
                ) : (
                  <EnhancedPollCard poll={poll} />
                )}
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No active polls</h3>
                <p className="text-gray-500">All current polls have ended</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ranked" className="space-y-4 mt-6">
          {rankedChoicePolls.length > 0 ? (
            rankedChoicePolls.map((poll) => (
              <RankedChoicePoll key={poll.id} poll={poll} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No ranked choice polls</h3>
                <p className="text-gray-500 mb-4">
                  Ranked choice voting allows fairer representation by letting voters rank their preferences
                </p>
                <Button onClick={() => setShowCreatePoll(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ranked Choice Poll
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="simple" className="space-y-4 mt-6">
          {simplePolls.length > 0 ? (
            simplePolls.map((poll) => (
              <EnhancedPollCard key={poll.id} poll={poll} />
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Vote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600 mb-2">No simple polls</h3>
                <p className="text-gray-500 mb-4">
                  Simple polls use traditional one-vote-per-person voting
                </p>
                <Button onClick={() => setShowCreatePoll(true)} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Simple Poll
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}