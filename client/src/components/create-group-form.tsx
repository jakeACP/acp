import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Users, X, Plus } from "lucide-react";

interface CreateGroupFormProps {
  onCancel: () => void;
}

export function CreateGroupForm({ onCancel }: CreateGroupFormProps) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const createGroupMutation = useMutation({
    mutationFn: async (groupData: any) => {
      const res = await apiRequest("POST", "/api/groups", groupData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/groups"] });
      toast({
        title: "Group Created",
        description: "Your group has been created successfully!",
      });
      onCancel();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "Invalid Group",
        description: "Please provide a group name",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "Invalid Group",
        description: "Please provide a group description",
        variant: "destructive",
      });
      return;
    }

    const groupData = {
      name: name.trim(),
      description: description.trim(),
      category: category || null,
      isPublic,
    };

    createGroupMutation.mutate(groupData);
  };

  const categories = [
    { value: "climate", label: "Climate & Environment" },
    { value: "education", label: "Education" },
    { value: "corruption", label: "Anti-Corruption" },
    { value: "healthcare", label: "Healthcare" },
    { value: "economy", label: "Economy" },
    { value: "justice", label: "Social Justice" },
    { value: "local", label: "Local Issues" },
    { value: "other", label: "Other" }
  ];

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Group
        </CardTitle>
        <p className="text-sm text-gray-600">
          Create a community group to organize around issues you care about
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Group Name *</Label>
            <Input
              id="name"
              placeholder="Enter group name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          {/* Group Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe what this group is about..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500">
              {description.length}/500 characters
            </p>
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Privacy Setting */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="isPublic" className="text-gray-900 font-medium">
                Public Group
              </Label>
              <p className="text-sm text-gray-600">
                {isPublic 
                  ? "Anyone can find and join this group" 
                  : "Only invited members can join this group"}
              </p>
            </div>
            <Switch
              id="isPublic"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          {/* Guidelines */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">Community Guidelines</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Keep discussions respectful and constructive</li>
              <li>• Stay focused on your group's topic and goals</li>
              <li>• Welcome diverse perspectives and opinions</li>
              <li>• Follow democratic principles in decision making</li>
            </ul>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createGroupMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createGroupMutation.isPending ? "Creating..." : "Create Group"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}