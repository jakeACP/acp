import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminNavigation } from "@/components/admin-navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Star, Plus } from "lucide-react";

type Poll = {
  id: string;
  title: string;
  description?: string;
  options: { id: string; text: string; votes: number }[];
  totalVotes: number;
  votingType: string;
  isActive: boolean;
  featured: boolean;
  endDate?: string;
  createdAt: string;
};

export default function AdminPollsPage() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    options: ["", ""],
  });

  const { data: polls = [], isLoading } = useQuery<Poll[]>({
    queryKey: ["/api/polls"],
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: async ({ pollId, featured }: { pollId: string; featured: boolean }) => {
      return await apiRequest(`/api/admin/polls/${pollId}/featured`, "PATCH", { featured });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls/featured"] });
      toast({ title: "Featured status updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error updating featured status", description: error.message, variant: "destructive" });
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (pollData: any) => {
      return await apiRequest("/api/polls", "POST", pollData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({ title: "Poll created successfully" });
      setDialogOpen(false);
      setNewPoll({ title: "", description: "", options: ["", ""] });
    },
    onError: (error: any) => {
      toast({ title: "Error creating poll", description: error.message, variant: "destructive" });
    },
  });

  const handleCreatePoll = () => {
    const pollData = {
      title: newPoll.title,
      description: newPoll.description,
      options: newPoll.options.filter(opt => opt.trim()).map((text, idx) => ({
        id: `option-${idx + 1}`,
        text: text.trim(),
        votes: 0,
      })),
      votingType: "simple",
      isActive: true,
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    if (pollData.options.length < 2) {
      toast({ title: "Error", description: "Please provide at least 2 options", variant: "destructive" });
      return;
    }

    createPollMutation.mutate(pollData);
  };

  const addOption = () => {
    setNewPoll({ ...newPoll, options: [...newPoll.options, ""] });
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll({ ...newPoll, options: newPoll.options.filter((_, i) => i !== index) });
    }
  };

  const updateOption = (index: number, value: string) => {
    const updated = [...newPoll.options];
    updated[index] = value;
    setNewPoll({ ...newPoll, options: updated });
  };

  return (
    <div className="min-h-screen bg-background">
      <AdminNavigation />
      
      <main className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-admin-polls-title">Polls Management</h1>
            <p className="text-muted-foreground">Manage polls and featured status</p>
          </div>
          <Button 
            onClick={() => setDialogOpen(true)} 
            data-testid="button-create-poll"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Polls</CardTitle>
            <CardDescription>Star polls to feature them in the sidebar</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading polls...</div>
            ) : polls.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No polls found. Create one to get started!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Featured</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Options</TableHead>
                    <TableHead>Votes</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {polls.map((poll) => (
                    <TableRow key={poll.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleFeaturedMutation.mutate({ 
                            pollId: poll.id, 
                            featured: !poll.featured 
                          })}
                          disabled={toggleFeaturedMutation.isPending}
                          data-testid={`button-toggle-featured-${poll.id}`}
                        >
                          <Star 
                            className={`h-5 w-5 ${poll.featured ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-poll-title-${poll.id}`}>
                        {poll.title}
                      </TableCell>
                      <TableCell>{poll.options.length} options</TableCell>
                      <TableCell data-testid={`text-poll-votes-${poll.id}`}>
                        {poll.totalVotes}
                      </TableCell>
                      <TableCell>
                        <Badge variant={poll.isActive ? "default" : "secondary"}>
                          {poll.isActive ? "Active" : "Closed"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(poll.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Poll Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Poll</DialogTitle>
              <DialogDescription>
                Create a test poll for the platform
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Poll Title</Label>
                <Input
                  id="title"
                  value={newPoll.title}
                  onChange={(e) => setNewPoll({ ...newPoll, title: e.target.value })}
                  placeholder="What's your favorite color?"
                  data-testid="input-poll-title"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  value={newPoll.description}
                  onChange={(e) => setNewPoll({ ...newPoll, description: e.target.value })}
                  placeholder="Additional context for the poll..."
                  data-testid="input-poll-description"
                />
              </div>

              <div>
                <Label>Poll Options</Label>
                <div className="space-y-2 mt-2">
                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        data-testid={`input-poll-option-${index}`}
                      />
                      {newPoll.options.length > 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                          data-testid={`button-remove-option-${index}`}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    data-testid="button-add-option"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setDialogOpen(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleCreatePoll}
                disabled={createPollMutation.isPending || !newPoll.title.trim()}
                data-testid="button-submit-poll"
              >
                Create Poll
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
