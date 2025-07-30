import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Vote, Trophy, Shield, Calendar } from "lucide-react";

interface CreatePollFormProps {
  onCancel: () => void;
}

export function CreatePollForm({ onCancel }: CreatePollFormProps) {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [votingType, setVotingType] = useState<"simple" | "ranked_choice">("simple");
  const [isBlockchainVerified, setIsBlockchainVerified] = useState(true);
  const [endDate, setEndDate] = useState("");

  const createPollMutation = useMutation({
    mutationFn: async (pollData: any) => {
      const res = await apiRequest("/api/polls", "POST", pollData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      toast({
        title: "Poll Created",
        description: "Your poll has been created and is now live!",
      });
      onCancel();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create poll",
        variant: "destructive",
      });
    },
  });

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = options.filter(opt => opt.trim().length > 0);
    if (validOptions.length < 2) {
      toast({
        title: "Invalid Poll",
        description: "Please provide at least 2 options",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Invalid Poll",
        description: "Please provide a poll title",
        variant: "destructive",
      });
      return;
    }

    const pollOptions = validOptions.map((text, index) => ({
      id: `option_${index + 1}`,
      text: text.trim(),
      votes: 0
    }));

    const pollData = {
      title: title.trim(),
      description: description.trim() || null,
      options: pollOptions,
      votingType,
      isBlockchainVerified,
      endDate: endDate ? new Date(endDate).toISOString() : null
    };

    createPollMutation.mutate(pollData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Vote className="h-5 w-5" />
          Create New Poll
        </CardTitle>
        <p className="text-sm text-gray-600">
          Create a democratic poll for your community to participate in
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Poll Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Poll Title *</Label>
            <Input
              id="title"
              placeholder="What should we decide on?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </div>

          {/* Poll Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Provide context or details about this poll..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Voting Type */}
          <div className="space-y-3">
            <Label>Voting Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  votingType === "simple" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
                onClick={() => setVotingType("simple")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Vote className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Simple Voting</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    One vote per person, winner takes all
                  </p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer border-2 transition-colors ${
                  votingType === "ranked_choice" ? "border-purple-500 bg-purple-50" : "border-gray-200"
                }`}
                onClick={() => setVotingType("ranked_choice")}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-2">
                    <Trophy className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Ranked Choice</span>
                    <Badge variant="secondary" className="text-xs">New</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Rank options by preference, fairer results
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Poll Options */}
          <div className="space-y-3">
            <Label>Poll Options *</Label>
            {options.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium">
                  {index + 1}
                </div>
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1"
                />
                {options.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            
            {options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            )}
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              End Date (optional)
            </Label>
            <Input
              id="endDate"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {/* Blockchain Verification */}
          <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-600" />
              <div>
                <Label htmlFor="blockchain" className="text-green-800 font-medium">
                  Blockchain Verification
                </Label>
                <p className="text-xs text-green-600">
                  Secure and transparent vote recording
                </p>
              </div>
            </div>
            <Switch
              id="blockchain"
              checked={isBlockchainVerified}
              onCheckedChange={setIsBlockchainVerified}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createPollMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createPollMutation.isPending ? "Creating..." : "Create Poll"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}