import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  BarChart3, 
  Image, 
  Hash, 
  Send, 
  X, 
  Newspaper, 
  Users, 
  Calendar, 
  Heart, 
  MessageCircleReply,
  Globe 
} from "lucide-react";

type PostType = 'news' | 'post' | 'poll' | 'event' | 'charity' | 'debate';

const postTypeOptions = [
  { value: 'news', label: 'News & Announcements', icon: Newspaper, placeholder: 'Share important news or announcements with the community...' },
  { value: 'post', label: 'General Discussion', icon: Globe, placeholder: 'Share your thoughts about policies, community issues, or democratic processes...' },
  { value: 'poll', label: 'Create Poll', icon: BarChart3, placeholder: 'Ask the community a question and let them vote...' },
  { value: 'event', label: 'Create Event', icon: Calendar, placeholder: 'Organize a community event, town hall, or meeting...' },
  { value: 'charity', label: 'Charity Campaign', icon: Heart, placeholder: 'Start a fundraising campaign for a good cause...' },
  { value: 'debate', label: 'Start Debate', icon: MessageCircleReply, placeholder: 'Present multiple perspectives on an important issue...' }
];

export function CreatePostForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState<PostType>('news');
  
  // Event-specific fields
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  
  // Poll-specific fields
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  
  // Charity-specific fields
  const [charityGoal, setCharityGoal] = useState("");
  
  // Debate-specific fields
  const [debatePositions, setDebatePositions] = useState<string[]>(['', '']);

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const res = await apiRequest("/api/posts", "POST", postData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      setContent("");
      setTags([]);
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setPollOptions(['', '']);
      setCharityGoal("");
      setDebatePositions(['', '']);
      setShowForm(false);
      toast({
        title: "Content Created",
        description: `Your ${postType} has been shared with the community.`,
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

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const updatePollOption = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addDebatePosition = () => {
    if (debatePositions.length < 4) {
      setDebatePositions([...debatePositions, '']);
    }
  };

  const removeDebatePosition = (index: number) => {
    if (debatePositions.length > 2) {
      setDebatePositions(debatePositions.filter((_, i) => i !== index));
    }
  };

  const updateDebatePosition = (index: number, value: string) => {
    const newPositions = [...debatePositions];
    newPositions[index] = value;
    setDebatePositions(newPositions);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter some content",
        variant: "destructive",
      });
      return;
    }
    
    if (content.trim().length > 5000) {
      toast({
        title: "Content Too Long",
        description: "Content cannot exceed 5000 characters",
        variant: "destructive",
      });
      return;
    }

    // Type-specific validation
    if (postType === 'event') {
      if (!eventDate || !eventTime) {
        toast({
          title: "Event Details Required",
          description: "Please provide event date and time",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'poll') {
      const validOptions = pollOptions.filter(option => option.trim());
      if (validOptions.length < 2) {
        toast({
          title: "Poll Options Required",
          description: "Please provide at least 2 poll options",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'charity' && charityGoal) {
      const goalNumber = parseFloat(charityGoal);
      if (isNaN(goalNumber) || goalNumber <= 0) {
        toast({
          title: "Invalid Goal Amount",
          description: "Please enter a valid fundraising goal",
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare submission data based on post type
    let submissionData: any = {
      content: content.trim(),
      tags,
      type: postType
    };

    if (postType === 'event') {
      submissionData.eventDate = eventDate;
      submissionData.eventTime = eventTime;
      submissionData.eventLocation = eventLocation.trim();
    }

    if (postType === 'poll') {
      submissionData.pollOptions = pollOptions.filter(option => option.trim());
    }

    if (postType === 'charity' && charityGoal) {
      submissionData.charityGoal = parseFloat(charityGoal);
    }

    if (postType === 'debate') {
      submissionData.debatePositions = debatePositions.filter(pos => pos.trim());
    }
    
    createPostMutation.mutate(submissionData);
  };

  const currentPostType = postTypeOptions.find(option => option.value === postType) || postTypeOptions[0];

  if (!showForm) {
    return (
      <Card className="shadow-sm border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3">
            <Avatar className="ring-2 ring-primary/20">
              <AvatarImage src={user?.avatar || ""} />
              <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold">
                {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="outline"
              className="flex-1 justify-start text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-primary/30 transition-all duration-200"
              onClick={() => setShowForm(true)}
            >
              <currentPostType.icon className="h-4 w-4 mr-2 text-primary" />
              Share your thoughts with the community...
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm border-0 bg-white/90 backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-start space-x-3">
          <Avatar className="ring-2 ring-primary/20">
            <AvatarImage src={user?.avatar || ""} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-blue-600 text-white font-semibold">
              {user?.firstName?.[0]}{user?.lastName?.[0] || user?.username?.[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-4">
            {/* Post Type Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Content Type</label>
              <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
                <SelectTrigger className="border-gray-200 hover:border-primary/50 transition-colors">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {postTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        <option.icon className="h-4 w-4" />
                        <span>{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Textarea
              placeholder={currentPostType.placeholder}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[120px] border-0 p-0 resize-none focus:ring-0 text-lg placeholder:text-slate-400"
              autoFocus
            />

            {/* Type-specific fields */}
            {postType === 'event' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                    <Input
                      type="time"
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location (Optional)</label>
                  <Input
                    placeholder="e.g., City Hall, 123 Main St, or Virtual Event"
                    value={eventLocation}
                    onChange={(e) => setEventLocation(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {postType === 'poll' && (
              <div className="space-y-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-medium text-green-900 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Poll Options
                </h4>
                {pollOptions.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updatePollOption(index, e.target.value)}
                      className="flex-1"
                    />
                    {pollOptions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePollOption(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {pollOptions.length < 6 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPollOption}
                    className="w-full border-dashed"
                  >
                    Add Option
                  </Button>
                )}
              </div>
            )}

            {postType === 'charity' && (
              <div className="space-y-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h4 className="font-medium text-pink-900 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Fundraising Goal
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (Optional)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 5000"
                    value={charityGoal}
                    onChange={(e) => setCharityGoal(e.target.value)}
                    className="w-full"
                    min="1"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave blank if no specific target</p>
                </div>
              </div>
            )}

            {postType === 'debate' && (
              <div className="space-y-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-medium text-purple-900 flex items-center gap-2">
                  <MessageCircleReply className="h-4 w-4" />
                  Debate Positions
                </h4>
                {debatePositions.map((position, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      placeholder={`Position ${index + 1}`}
                      value={position}
                      onChange={(e) => updateDebatePosition(index, e.target.value)}
                      className="flex-1"
                    />
                    {debatePositions.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDebatePosition(index)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {debatePositions.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addDebatePosition}
                    className="w-full border-dashed"
                  >
                    Add Position
                  </Button>
                )}
              </div>
            )}

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
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <currentPostType.icon className="h-4 w-4 text-primary" />
                  <span className="font-medium">{currentPostType.label}</span>
                </div>
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-primary transition-colors">
                  <Image className="h-4 w-4 mr-2" />
                  Photo
                </Button>
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    setShowForm(false);
                    setContent("");
                    setTags([]);
                    setEventDate("");
                    setEventTime("");
                    setEventLocation("");
                    setPollOptions(['', '']);
                    setCharityGoal("");
                    setDebatePositions(['', '']);
                    setPostType('news');
                  }}
                  className="hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!content.trim() || createPostMutation.isPending}
                  size="sm"
                  className="bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 transition-all duration-200 shadow-md hover:shadow-lg"
                  data-testid="button-submit-post"
                >
                  {createPostMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {postType === 'news' ? 'Share News' : 
                       postType === 'poll' ? 'Create Poll' :
                       postType === 'event' ? 'Create Event' :
                       postType === 'charity' ? 'Start Campaign' :
                       postType === 'debate' ? 'Start Debate' : 'Post'}
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