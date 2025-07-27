import { Navigation } from "@/components/navigation";
import { PollCard } from "@/components/poll-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { Poll } from "@shared/schema";
import { BarChart3, Plus } from "lucide-react";

export default function PollsPage() {
  const { data: polls = [], isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading polls...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Community Polls</h1>
            <p className="text-slate-600 mt-2">
              Vote on issues that matter to your community
            </p>
          </div>
          
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Poll
          </Button>
        </div>

        <div className="space-y-6">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>

        {polls.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <CardTitle className="mb-2">No active polls</CardTitle>
              <CardDescription className="mb-4">
                Be the first to create a poll and gather community input
              </CardDescription>
              <Button>Create First Poll</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
