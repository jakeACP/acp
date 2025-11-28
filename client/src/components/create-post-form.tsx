import { useState, useEffect } from "react";
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
  Globe,
  Ban,
  FileText,
  UserCheck,
  Handshake,
  Lock,
  HandHeart,
  MapPin,
  Clock,
  Briefcase
} from "lucide-react";

type PostType = 'post' | 'news' | 'poll' | 'event' | 'charity' | 'boycott' | 'initiative' | 'petition' | 'union' | 'debate' | 'volunteer';

const postTypeOptions = [
  { value: 'post', label: 'Posts', icon: Globe, placeholder: 'Share your thoughts about policies, community issues, or democratic processes...' },
  { value: 'news', label: 'News', icon: Newspaper, placeholder: 'Share important news or announcements with the community...' },
  { value: 'poll', label: 'Polls', icon: BarChart3, placeholder: 'Ask the community a question and let them vote...' },
  { value: 'event', label: 'Events', icon: Calendar, placeholder: 'Organize a community event, town hall, or meeting...' },
  { value: 'volunteer', label: 'Volunteer', icon: HandHeart, placeholder: 'Post a volunteer opportunity for the community...' },
  { value: 'charity', label: 'Charities', icon: Heart, placeholder: 'Start a fundraising campaign for a good cause...' },
  { value: 'boycott', label: 'Boycotts', icon: Ban, placeholder: 'Organize a boycott against a company or organization...' },
  { value: 'initiative', label: 'Initiatives', icon: FileText, placeholder: 'Propose a community initiative or policy change...' },
  { value: 'petition', label: 'Petitions', icon: UserCheck, placeholder: 'Start a petition for change in your community...' },
  { value: 'union', label: 'Unions', icon: Handshake, placeholder: 'Share union organizing efforts and labor rights information...' },
  { value: 'debate', label: 'Debates', icon: MessageCircleReply, placeholder: 'Present multiple perspectives on an important issue...' }
];

export function CreatePostForm({ onSuccess }: { onSuccess?: () => void } = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [postType, setPostType] = useState<PostType>('post');
  const [privacy, setPrivacy] = useState<'public' | 'friends'>('public');
  
  const [linkPreview, setLinkPreview] = useState<{url: string; title?: string; description?: string; image?: string; siteName?: string} | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  useEffect(() => {
    const extractUrl = (text: string): string | null => {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const matches = text.match(urlRegex);
      return matches ? matches[0] : null;
    };

    const fetchPreview = async () => {
      const url = extractUrl(content);
      
      if (!url) {
        setLinkPreview(null);
        return;
      }

      if (linkPreview?.url === url) {
        return;
      }

      setLoadingPreview(true);
      try {
        const res = await apiRequest("/api/link-preview", "POST", { url });
        const preview = await res.json();
        setLinkPreview(preview);
      } catch (error) {
        console.error("Failed to fetch link preview:", error);
        setLinkPreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    const timeoutId = setTimeout(fetchPreview, 1000);
    return () => clearTimeout(timeoutId);
  }, [content]);
  
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

  // Boycott-specific fields
  const [boycottTarget, setBoycottTarget] = useState("");
  const [boycottReason, setBoycottReason] = useState("");
  const [boycottDuration, setBoycottDuration] = useState("");

  // Initiative-specific fields
  const [initiativeType, setInitiativeType] = useState("");
  const [initiativeAudience, setInitiativeAudience] = useState("");
  const [initiativeGoal, setInitiativeGoal] = useState("");

  // Petition-specific fields
  const [petitionTarget, setPetitionTarget] = useState("");
  const [petitionSignatureGoal, setPetitionSignatureGoal] = useState("");
  const [petitionDeadline, setPetitionDeadline] = useState("");

  // Union-specific fields
  const [unionName, setUnionName] = useState("");
  const [unionIndustry, setUnionIndustry] = useState("");
  const [unionContact, setUnionContact] = useState("");

  // Volunteer-specific fields
  const [volunteerTitle, setVolunteerTitle] = useState("");
  const [volunteerOrganization, setVolunteerOrganization] = useState("");
  const [volunteerLocation, setVolunteerLocation] = useState("");
  const [volunteerIsRemote, setVolunteerIsRemote] = useState(false);
  const [volunteerStartDate, setVolunteerStartDate] = useState("");
  const [volunteerEndDate, setVolunteerEndDate] = useState("");
  const [volunteerCommitment, setVolunteerCommitment] = useState("");
  const [volunteerSkills, setVolunteerSkills] = useState("");
  const [volunteerRequirements, setVolunteerRequirements] = useState("");
  const [volunteerBenefits, setVolunteerBenefits] = useState("");
  const [volunteerSpotsTotal, setVolunteerSpotsTotal] = useState("");
  const [volunteerContactEmail, setVolunteerContactEmail] = useState("");
  const [volunteerContactPhone, setVolunteerContactPhone] = useState("");
  const [volunteerCategory, setVolunteerCategory] = useState("");
  const [volunteerUrgency, setVolunteerUrgency] = useState("normal");

  const createPostMutation = useMutation({
    mutationFn: async (postData: any) => {
      const res = await apiRequest("/api/posts", "POST", postData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/all"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/feeds/news"] });
      queryClient.invalidateQueries({ queryKey: ["/api/polls"] });
      setContent("");
      setTags([]);
      setLinkPreview(null);
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setPollOptions(['', '']);
      setCharityGoal("");
      setDebatePositions(['', '']);
      setBoycottTarget("");
      setBoycottReason("");
      setBoycottDuration("");
      setInitiativeType("");
      setInitiativeAudience("");
      setInitiativeGoal("");
      setPetitionTarget("");
      setPetitionSignatureGoal("");
      setPetitionDeadline("");
      setUnionName("");
      setUnionIndustry("");
      setUnionContact("");
      setVolunteerTitle("");
      setVolunteerOrganization("");
      setVolunteerLocation("");
      setVolunteerIsRemote(false);
      setVolunteerStartDate("");
      setVolunteerEndDate("");
      setVolunteerCommitment("");
      setVolunteerSkills("");
      setVolunteerRequirements("");
      setVolunteerBenefits("");
      setVolunteerSpotsTotal("");
      setVolunteerContactEmail("");
      setVolunteerContactPhone("");
      setVolunteerCategory("");
      setVolunteerUrgency("normal");
      setPrivacy('public');
      setShowForm(false);
      toast({
        title: "Content Created",
        description: `Your ${postType} has been shared with the community.`,
      });
      onSuccess?.(); // Call the optional onSuccess callback
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

    if (postType === 'boycott') {
      if (!boycottTarget.trim()) {
        toast({
          title: "Boycott Target Required",
          description: "Please specify what or who is being boycotted",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'initiative') {
      if (!initiativeType.trim() || !initiativeGoal.trim()) {
        toast({
          title: "Initiative Details Required",
          description: "Please provide initiative type and goal",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'petition') {
      if (!petitionTarget.trim()) {
        toast({
          title: "Petition Target Required",
          description: "Please specify who the petition is directed to",
          variant: "destructive",
        });
        return;
      }
      if (petitionSignatureGoal && (isNaN(parseInt(petitionSignatureGoal)) || parseInt(petitionSignatureGoal) <= 0)) {
        toast({
          title: "Invalid Signature Goal",
          description: "Please enter a valid signature goal number",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'union') {
      if (!unionName.trim() || !unionIndustry.trim()) {
        toast({
          title: "Union Details Required",
          description: "Please provide union name and industry/sector",
          variant: "destructive",
        });
        return;
      }
    }

    if (postType === 'volunteer') {
      if (!volunteerTitle.trim()) {
        toast({
          title: "Title Required",
          description: "Please provide a title for the volunteer opportunity",
          variant: "destructive",
        });
        return;
      }
      if (!volunteerLocation.trim() && !volunteerIsRemote) {
        toast({
          title: "Location Required",
          description: "Please provide a location or mark as remote",
          variant: "destructive",
        });
        return;
      }
    }

    // Prepare submission data based on post type
    let submissionData: any = {
      content: content.trim(),
      tags,
      type: postType,
      privacy,
      linkPreview: linkPreview || undefined
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

    if (postType === 'boycott') {
      submissionData.boycottTarget = boycottTarget.trim();
      submissionData.boycottReason = boycottReason.trim();
      if (boycottDuration.trim()) {
        submissionData.boycottDuration = boycottDuration.trim();
      }
    }

    if (postType === 'initiative') {
      submissionData.initiativeType = initiativeType.trim();
      submissionData.initiativeAudience = initiativeAudience.trim();
      submissionData.initiativeGoal = initiativeGoal.trim();
    }

    if (postType === 'petition') {
      submissionData.petitionTarget = petitionTarget.trim();
      if (petitionSignatureGoal.trim()) {
        submissionData.petitionSignatureGoal = parseInt(petitionSignatureGoal);
      }
      if (petitionDeadline.trim()) {
        submissionData.petitionDeadline = petitionDeadline.trim();
      }
    }

    if (postType === 'union') {
      submissionData.unionName = unionName.trim();
      submissionData.unionIndustry = unionIndustry.trim();
      if (unionContact.trim()) {
        submissionData.unionContact = unionContact.trim();
      }
    }

    if (postType === 'volunteer') {
      submissionData.volunteerTitle = volunteerTitle.trim();
      submissionData.volunteerOrganization = volunteerOrganization.trim();
      submissionData.volunteerLocation = volunteerIsRemote ? 'Remote' : volunteerLocation.trim();
      submissionData.volunteerIsRemote = volunteerIsRemote;
      if (volunteerStartDate) {
        submissionData.volunteerStartDate = volunteerStartDate;
      }
      if (volunteerEndDate) {
        submissionData.volunteerEndDate = volunteerEndDate;
      }
      if (volunteerCommitment.trim()) {
        submissionData.volunteerCommitment = volunteerCommitment.trim();
      }
      if (volunteerSkills.trim()) {
        submissionData.volunteerSkills = volunteerSkills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
      if (volunteerRequirements.trim()) {
        submissionData.volunteerRequirements = volunteerRequirements.trim();
      }
      if (volunteerBenefits.trim()) {
        submissionData.volunteerBenefits = volunteerBenefits.trim();
      }
      if (volunteerSpotsTotal && parseInt(volunteerSpotsTotal) > 0) {
        submissionData.volunteerSpotsTotal = parseInt(volunteerSpotsTotal);
      }
      if (volunteerContactEmail.trim()) {
        submissionData.volunteerContactEmail = volunteerContactEmail.trim();
      }
      if (volunteerContactPhone.trim()) {
        submissionData.volunteerContactPhone = volunteerContactPhone.trim();
      }
      if (volunteerCategory) {
        submissionData.volunteerCategory = volunteerCategory;
      }
      submissionData.volunteerUrgency = volunteerUrgency;
    }
    
    createPostMutation.mutate(submissionData);
  };

  const currentPostType = postTypeOptions.find(option => option.value === postType) || postTypeOptions[0];

  if (!showForm) {
    return (
      <Card className="shadow-sm border-0 bg-card/80 backdrop-blur-sm">
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
              className="flex-1 justify-start text-muted-foreground hover:text-foreground bg-muted hover:bg-accent border-border hover:border-primary/30 transition-all duration-200"
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
    <Card className="shadow-sm border-0 bg-card/90 backdrop-blur-sm">
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
              <label className="text-sm font-medium text-foreground">Content Type</label>
              <Select value={postType} onValueChange={(value) => setPostType(value as PostType)}>
                <SelectTrigger className="border-border hover:border-primary/50 transition-colors">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              className="min-h-[120px] border-0 p-0 resize-none focus:ring-0 text-lg placeholder:text-muted-foreground"
              autoFocus
            />

            {loadingPreview && (
              <div className="p-4 border border-border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Loading link preview...</p>
              </div>
            )}

            {linkPreview && !loadingPreview && (
              <div className="border border-border rounded-lg overflow-hidden bg-card hover:bg-accent/10 transition-colors">
                <a href={linkPreview.url} target="_blank" rel="noopener noreferrer" className="block">
                  {linkPreview.image && (
                    <div className="w-full h-48 bg-muted">
                      <img 
                        src={linkPreview.image} 
                        alt={linkPreview.title || 'Link preview'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4">
                    {linkPreview.siteName && (
                      <p className="text-xs text-muted-foreground mb-1">{linkPreview.siteName}</p>
                    )}
                    {linkPreview.title && (
                      <h4 className="font-semibold text-foreground mb-1 line-clamp-2">{linkPreview.title}</h4>
                    )}
                    {linkPreview.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{linkPreview.description}</p>
                    )}
                    <p className="text-xs text-primary mt-2">{new URL(linkPreview.url).hostname}</p>
                  </div>
                </a>
              </div>
            )}

            {/* Type-specific fields */}
            {postType === 'boycott' && (
              <div className="space-y-4 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-900 dark:text-red-100 flex items-center gap-2">
                  <Ban className="h-4 w-4" />
                  Boycott Details
                </h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Target *</label>
                  <Input
                    placeholder="Company, organization, or product to boycott"
                    value={boycottTarget}
                    onChange={(e) => setBoycottTarget(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Reason</label>
                  <Input
                    placeholder="Primary reason for the boycott"
                    value={boycottReason}
                    onChange={(e) => setBoycottReason(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Duration (Optional)</label>
                  <Input
                    placeholder="e.g., Until policy changes, 6 months, etc."
                    value={boycottDuration}
                    onChange={(e) => setBoycottDuration(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {postType === 'initiative' && (
              <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <h4 className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Initiative Details
                </h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Initiative Type *</label>
                  <Select value={initiativeType} onValueChange={setInitiativeType}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select initiative type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="policy">Policy Change</SelectItem>
                      <SelectItem value="community">Community Project</SelectItem>
                      <SelectItem value="environmental">Environmental Action</SelectItem>
                      <SelectItem value="social">Social Justice</SelectItem>
                      <SelectItem value="economic">Economic Reform</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Target Audience</label>
                  <Input
                    placeholder="Who is this initiative aimed at?"
                    value={initiativeAudience}
                    onChange={(e) => setInitiativeAudience(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Goal/Outcome *</label>
                  <Input
                    placeholder="What do you hope to achieve?"
                    value={initiativeGoal}
                    onChange={(e) => setInitiativeGoal(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
              </div>
            )}

            {postType === 'petition' && (
              <div className="space-y-4 p-4 bg-orange-50 dark:bg-orange-950 rounded-lg border border-orange-200 dark:border-orange-800">
                <h4 className="font-medium text-orange-900 dark:text-orange-100 flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Petition Details
                </h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Petition Target *</label>
                  <Input
                    placeholder="Who is this petition directed to? (e.g., Mayor, Congress, Company)"
                    value={petitionTarget}
                    onChange={(e) => setPetitionTarget(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Signature Goal (Optional)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 1000"
                      value={petitionSignatureGoal}
                      onChange={(e) => setPetitionSignatureGoal(e.target.value)}
                      className="w-full"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Deadline (Optional)</label>
                    <Input
                      type="date"
                      value={petitionDeadline}
                      onChange={(e) => setPetitionDeadline(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {postType === 'union' && (
              <div className="space-y-4 p-4 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <h4 className="font-medium text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                  <Handshake className="h-4 w-4" />
                  Union Information
                </h4>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Union Name *</label>
                  <Input
                    placeholder="Name of the union or organizing effort"
                    value={unionName}
                    onChange={(e) => setUnionName(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Industry/Sector *</label>
                  <Input
                    placeholder="e.g., Healthcare, Tech, Manufacturing, Education"
                    value={unionIndustry}
                    onChange={(e) => setUnionIndustry(e.target.value)}
                    className="w-full"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Contact Information (Optional)</label>
                  <Input
                    placeholder="Email, website, or other contact method"
                    value={unionContact}
                    onChange={(e) => setUnionContact(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
            )}

            {postType === 'volunteer' && (
              <div className="space-y-4 p-4 bg-teal-50 dark:bg-teal-950 rounded-lg border border-teal-200 dark:border-teal-800">
                <h4 className="font-medium text-teal-900 dark:text-teal-100 flex items-center gap-2">
                  <HandHeart className="h-4 w-4" />
                  Volunteer Opportunity Details
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Position Title *</label>
                    <Input
                      placeholder="e.g., Community Outreach Volunteer"
                      value={volunteerTitle}
                      onChange={(e) => setVolunteerTitle(e.target.value)}
                      className="w-full"
                      required
                      data-testid="input-volunteer-title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Organization</label>
                    <Input
                      placeholder="Your organization name"
                      value={volunteerOrganization}
                      onChange={(e) => setVolunteerOrganization(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-organization"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Category</label>
                    <Select value={volunteerCategory} onValueChange={setVolunteerCategory}>
                      <SelectTrigger className="w-full" data-testid="select-volunteer-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="environment">Environment</SelectItem>
                        <SelectItem value="education">Education</SelectItem>
                        <SelectItem value="healthcare">Healthcare</SelectItem>
                        <SelectItem value="community">Community Service</SelectItem>
                        <SelectItem value="politics">Political Campaign</SelectItem>
                        <SelectItem value="disaster">Disaster Relief</SelectItem>
                        <SelectItem value="animals">Animal Welfare</SelectItem>
                        <SelectItem value="elderly">Senior Services</SelectItem>
                        <SelectItem value="youth">Youth Programs</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Urgency</label>
                    <Select value={volunteerUrgency} onValueChange={setVolunteerUrgency}>
                      <SelectTrigger className="w-full" data-testid="select-volunteer-urgency">
                        <SelectValue placeholder="Select urgency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="critical">Critical - Immediate Need</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="volunteerIsRemote"
                      checked={volunteerIsRemote}
                      onChange={(e) => setVolunteerIsRemote(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                      data-testid="checkbox-volunteer-remote"
                    />
                    <label htmlFor="volunteerIsRemote" className="text-sm font-medium text-foreground">
                      Remote / Virtual
                    </label>
                  </div>
                </div>

                {!volunteerIsRemote && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
                    <Input
                      placeholder="Address or location details"
                      value={volunteerLocation}
                      onChange={(e) => setVolunteerLocation(e.target.value)}
                      className="w-full"
                      required
                      data-testid="input-volunteer-location"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
                    <Input
                      type="date"
                      value={volunteerStartDate}
                      onChange={(e) => setVolunteerStartDate(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-start-date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">End Date (Optional)</label>
                    <Input
                      type="date"
                      value={volunteerEndDate}
                      onChange={(e) => setVolunteerEndDate(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-end-date"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Time Commitment</label>
                    <Input
                      placeholder="e.g., 4 hours/week, One-time event"
                      value={volunteerCommitment}
                      onChange={(e) => setVolunteerCommitment(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-commitment"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Spots Available</label>
                    <Input
                      type="number"
                      placeholder="Number of volunteers needed"
                      value={volunteerSpotsTotal}
                      onChange={(e) => setVolunteerSpotsTotal(e.target.value)}
                      className="w-full"
                      min="1"
                      data-testid="input-volunteer-spots"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Skills Needed (comma-separated)</label>
                  <Input
                    placeholder="e.g., Communication, First Aid, Spanish, Driving"
                    value={volunteerSkills}
                    onChange={(e) => setVolunteerSkills(e.target.value)}
                    className="w-full"
                    data-testid="input-volunteer-skills"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Requirements</label>
                  <Textarea
                    placeholder="Age requirements, background check, physical requirements, etc."
                    value={volunteerRequirements}
                    onChange={(e) => setVolunteerRequirements(e.target.value)}
                    className="w-full min-h-[60px]"
                    data-testid="input-volunteer-requirements"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Benefits</label>
                  <Input
                    placeholder="e.g., Meals provided, Training included, Community service hours"
                    value={volunteerBenefits}
                    onChange={(e) => setVolunteerBenefits(e.target.value)}
                    className="w-full"
                    data-testid="input-volunteer-benefits"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Contact Email</label>
                    <Input
                      type="email"
                      placeholder="volunteer@example.com"
                      value={volunteerContactEmail}
                      onChange={(e) => setVolunteerContactEmail(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Contact Phone</label>
                    <Input
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={volunteerContactPhone}
                      onChange={(e) => setVolunteerContactPhone(e.target.value)}
                      className="w-full"
                      data-testid="input-volunteer-phone"
                    />
                  </div>
                </div>
              </div>
            )}

            {postType === 'event' && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Date</label>
                    <Input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Time</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Location (Optional)</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">Target Amount (Optional)</label>
                  <Input
                    type="number"
                    placeholder="e.g., 5000"
                    value={charityGoal}
                    onChange={(e) => setCharityGoal(e.target.value)}
                    className="w-full"
                    min="1"
                    step="0.01"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Leave blank if no specific target</p>
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

            {/* Privacy selector */}
            <div className="flex items-center gap-2 pt-4">
              <label className="text-sm font-medium text-foreground">Privacy:</label>
              <Select value={privacy} onValueChange={(value) => setPrivacy(value as 'public' | 'friends')}>
                <SelectTrigger className="w-[140px] border-border hover:border-primary/50 transition-colors" data-testid="select-privacy">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public" data-testid="option-privacy-public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <span>Public</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="friends" data-testid="option-privacy-friends">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Friends</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <span className="text-xs text-muted-foreground">
                {privacy === 'public' ? 'Anyone can see this post' : 'Only your friends can see this post'}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-4 border-t border-border">
              <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
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
                    setBoycottTarget("");
                    setBoycottReason("");
                    setBoycottDuration("");
                    setInitiativeType("");
                    setInitiativeAudience("");
                    setInitiativeGoal("");
                    setPetitionTarget("");
                    setPetitionSignatureGoal("");
                    setPetitionDeadline("");
                    setUnionName("");
                    setUnionIndustry("");
                    setUnionContact("");
                    setPrivacy('public');
                    setPostType('post');
                  }}
                  className="hover:bg-muted transition-colors"
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
                      {postType === 'post' ? 'Post' :
                       postType === 'news' ? 'Share News' : 
                       postType === 'poll' ? 'Create Poll' :
                       postType === 'event' ? 'Create Event' :
                       postType === 'charity' ? 'Start Campaign' :
                       postType === 'boycott' ? 'Start Boycott' :
                       postType === 'initiative' ? 'Create Initiative' :
                       postType === 'petition' ? 'Start Petition' :
                       postType === 'union' ? 'Share Union Info' :
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