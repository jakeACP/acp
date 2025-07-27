import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BarChart3, Image, Hash, Send, X } from "lucide-react";

export function CreatePostForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showForm, setShowForm] = useState(false);

  const createPostMutation = useMutation({
    mutationFn: async (postData: { content: string; tags: string[] }) => {
      const res = await apiRequest("POST", "/api/posts", postData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setContent("");
      setTags([]);
      setShowForm(false);
      toast({
        title: "Post Created",
        description: "Your post has been shared with the community.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive",
      });
    },
  });

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 5) {
      setTags([...tags, tag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (tagInput.trim()) {
        handleAddTag();
      } else if (content.trim()) {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPostMutation.mutate({ content: content.trim(), tags });
  };

  if (!showForm) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback>
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              className="flex-1 justify-start text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100"
              onClick={() => setShowForm(true)}
            >
              Share your thoughts with the community...
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Avatar>
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            <Textarea
              placeholder="What's on your mind? Share your thoughts about policies, community issues, or democratic processes..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] border-0 p-0 resize-none focus:ring-0 text-lg placeholder:text-slate-400"
              autoFocus
            />

            {/* Tags Section */}
            <div className="space-y-2">
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1">
                      #{tag}
                      <X 
                        className="h-3 w-3 cursor-pointer hover:text-red-500" 
                        onClick={() => handleRemoveTag(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Add tags (democracy, policy, climate...)"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="border-0 p-0 h-auto focus:ring-0 placeholder:text-slate-400"
                />
                {tagInput.trim() && (
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={handleAddTag}
                    disabled={tags.length >= 5}
                  >
                    Add
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="flex space-x-4">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Create Poll
                </Button>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary">
                  <Image className="h-4 w-4 mr-2" />
                  Photo
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!content.trim() || createPostMutation.isPending}
                  size="sm"
                >
                  {createPostMutation.isPending ? (
                    "Posting..."
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}