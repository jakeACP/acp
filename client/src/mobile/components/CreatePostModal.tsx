import { useState, useEffect } from "react";
import { X, FileText, Video, Image, BarChart2, Calendar, Megaphone, Send, MapPin, Clock, Users, Link as LinkIcon } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PostType = 'text' | 'signal' | 'image' | 'poll' | 'event' | 'petition';

const postTypes: { type: PostType; icon: typeof FileText; label: string; color: string }[] = [
  { type: 'text', icon: FileText, label: 'Text Post', color: 'from-blue-500 to-blue-600' },
  { type: 'signal', icon: Video, label: 'Signal Video', color: 'from-red-500 to-pink-500' },
  { type: 'image', icon: Image, label: 'Image Post', color: 'from-green-500 to-emerald-500' },
  { type: 'poll', icon: BarChart2, label: 'Poll', color: 'from-purple-500 to-violet-500' },
  { type: 'event', icon: Calendar, label: 'Event', color: 'from-orange-500 to-amber-500' },
  { type: 'petition', icon: Megaphone, label: 'Petition', color: 'from-cyan-500 to-teal-500' },
];

interface EventFormData {
  title: string;
  description: string;
  location: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isVirtual: boolean;
  virtualLink: string;
  maxAttendees: string;
}

const initialEventData: EventFormData = {
  title: '',
  description: '',
  location: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  startDate: '',
  startTime: '',
  endDate: '',
  endTime: '',
  isVirtual: false,
  virtualLink: '',
  maxAttendees: '',
};

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [eventData, setEventData] = useState<EventFormData>(initialEventData);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  const createPostMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/posts', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      toast({ title: 'Post created!', description: 'Your post has been published.' });
      handleClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create post. Please try again.', variant: 'destructive' });
    },
  });

  const createPollMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/polls', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      toast({ title: 'Poll created!', description: 'Your poll has been published.' });
      handleClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create poll. Please try again.', variant: 'destructive' });
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/events', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
      queryClient.invalidateQueries({ queryKey: ['/api/feeds/all'] });
      toast({ title: 'Event created!', description: 'Your event has been published.' });
      handleClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to create event. Please try again.', variant: 'destructive' });
    },
  });

  const handleClose = () => {
    setSelectedType(null);
    setContent('');
    setTitle('');
    setVideoUrl('');
    setPollOptions(['', '']);
    setEventData(initialEventData);
    onClose();
  };

  const handleSubmit = () => {
    if (selectedType === 'poll') {
      const validOptions = pollOptions.filter(o => o.trim());
      if (!title.trim()) {
        toast({ title: 'Question required', description: 'Please enter a poll question.', variant: 'destructive' });
        return;
      }
      if (validOptions.length < 2) {
        toast({ title: 'Options required', description: 'Please add at least 2 options.', variant: 'destructive' });
        return;
      }
      
      const pollData = {
        title: title,
        description: content || null,
        options: validOptions.map((text, i) => ({ id: String(i + 1), text, votes: 0 })),
        votingType: 'simple',
        isBlockchainVerified: false,
      };
      
      createPollMutation.mutate(pollData);
      return;
    }

    if (selectedType === 'event') {
      if (!eventData.title.trim()) {
        toast({ title: 'Title required', description: 'Please enter an event title.', variant: 'destructive' });
        return;
      }
      if (!eventData.startDate || !eventData.startTime) {
        toast({ title: 'Date/time required', description: 'Please set a start date and time.', variant: 'destructive' });
        return;
      }
      if (!eventData.isVirtual && (!eventData.location.trim() || !eventData.city.trim() || !eventData.state.trim())) {
        toast({ title: 'Location required', description: 'Please enter a location for in-person events.', variant: 'destructive' });
        return;
      }
      if (eventData.isVirtual && !eventData.virtualLink.trim()) {
        toast({ title: 'Link required', description: 'Please enter a virtual meeting link.', variant: 'destructive' });
        return;
      }

      const startDateTime = new Date(`${eventData.startDate}T${eventData.startTime}`);
      const endDateTime = eventData.endDate && eventData.endTime 
        ? new Date(`${eventData.endDate}T${eventData.endTime}`) 
        : null;

      const eventPayload = {
        title: eventData.title,
        description: eventData.description || null,
        location: eventData.isVirtual ? 'Online' : eventData.location,
        address: eventData.address || null,
        city: eventData.isVirtual ? 'Virtual' : eventData.city,
        state: eventData.isVirtual ? 'Online' : eventData.state,
        zipCode: eventData.zipCode || null,
        startDate: startDateTime.toISOString(),
        endDate: endDateTime?.toISOString() || null,
        isVirtual: eventData.isVirtual,
        virtualLink: eventData.isVirtual ? eventData.virtualLink : null,
        maxAttendees: eventData.maxAttendees ? parseInt(eventData.maxAttendees) : null,
      };

      createEventMutation.mutate(eventPayload);
      return;
    }

    if (!content.trim()) {
      toast({ title: 'Content required', description: 'Please write something to post.', variant: 'destructive' });
      return;
    }

    let postContent = content;
    
    if (selectedType === 'signal' && videoUrl) {
      postContent = videoUrl + (content ? '\n\n' + content : '');
    }

    const postData: any = {
      content: postContent,
      type: 'post',
    };

    createPostMutation.mutate(postData);
  };

  const addPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end justify-center touch-none"
      onClick={handleClose}
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-3xl border border-white/10 animate-in slide-in-from-bottom duration-300 mb-20"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-lg">
            {selectedType ? `Create ${postTypes.find(p => p.type === selectedType)?.label}` : 'Create Post'}
          </h2>
          <button 
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20"
            data-testid="close-create-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 pb-6">
          {!selectedType ? (
            <div className="grid grid-cols-3 gap-2">
              {postTypes.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                  data-testid={`create-${type}`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white text-[10px] font-medium text-center leading-tight">{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {selectedType === 'signal' && (
                <div>
                  <label className="text-white/70 text-sm mb-2 block">Video URL (YouTube/TikTok)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="Paste video link here..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    data-testid="input-video-url"
                  />
                </div>
              )}

              {selectedType === 'poll' && (
                <>
                  <div>
                    <label className="text-white/70 text-sm mb-2 block">Poll Question</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Ask a question..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      data-testid="input-poll-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-white/70 text-sm mb-2 block">Options</label>
                    {pollOptions.map((option, index) => (
                      <input
                        key={index}
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...pollOptions];
                          newOptions[index] = e.target.value;
                          setPollOptions(newOptions);
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        data-testid={`input-poll-option-${index}`}
                      />
                    ))}
                    {pollOptions.length < 6 && (
                      <button
                        onClick={addPollOption}
                        className="w-full py-2 text-white/50 text-sm hover:text-white/70"
                        data-testid="add-poll-option"
                      >
                        + Add Option
                      </button>
                    )}
                  </div>
                </>
              )}

              {selectedType === 'event' && (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  <div>
                    <label className="text-white/70 text-sm mb-1 block">Event Title *</label>
                    <input
                      type="text"
                      value={eventData.title}
                      onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                      placeholder="Event name..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      data-testid="input-event-title"
                    />
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-1 block">Description</label>
                    <textarea
                      value={eventData.description}
                      onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                      placeholder="Tell people about your event..."
                      rows={2}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50 resize-none"
                      data-testid="input-event-description"
                    />
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                    <input
                      type="checkbox"
                      id="isVirtual"
                      checked={eventData.isVirtual}
                      onChange={(e) => setEventData({ ...eventData, isVirtual: e.target.checked })}
                      className="w-5 h-5 rounded accent-orange-500"
                      data-testid="input-event-virtual"
                    />
                    <label htmlFor="isVirtual" className="text-white flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      This is a virtual event
                    </label>
                  </div>

                  {eventData.isVirtual ? (
                    <div>
                      <label className="text-white/70 text-sm mb-1 block">Meeting Link *</label>
                      <input
                        type="url"
                        value={eventData.virtualLink}
                        onChange={(e) => setEventData({ ...eventData, virtualLink: e.target.value })}
                        placeholder="https://zoom.us/..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        data-testid="input-event-virtual-link"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-white/70 text-sm mb-1 block flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> Venue Name *
                        </label>
                        <input
                          type="text"
                          value={eventData.location}
                          onChange={(e) => setEventData({ ...eventData, location: e.target.value })}
                          placeholder="Community Center, Town Hall..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          data-testid="input-event-location"
                        />
                      </div>
                      <div>
                        <label className="text-white/70 text-sm mb-1 block">Address</label>
                        <input
                          type="text"
                          value={eventData.address}
                          onChange={(e) => setEventData({ ...eventData, address: e.target.value })}
                          placeholder="123 Main Street..."
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                          data-testid="input-event-address"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-white/70 text-sm mb-1 block">City *</label>
                          <input
                            type="text"
                            value={eventData.city}
                            onChange={(e) => setEventData({ ...eventData, city: e.target.value })}
                            placeholder="City"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            data-testid="input-event-city"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-white/70 text-sm mb-1 block">State *</label>
                          <input
                            type="text"
                            value={eventData.state}
                            onChange={(e) => setEventData({ ...eventData, state: e.target.value })}
                            placeholder="State"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            data-testid="input-event-state"
                          />
                        </div>
                        <div className="col-span-1">
                          <label className="text-white/70 text-sm mb-1 block">Zip</label>
                          <input
                            type="text"
                            value={eventData.zipCode}
                            onChange={(e) => setEventData({ ...eventData, zipCode: e.target.value })}
                            placeholder="12345"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            data-testid="input-event-zip"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white/70 text-sm mb-1 block flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Start Date *
                      </label>
                      <input
                        type="date"
                        value={eventData.startDate}
                        onChange={(e) => setEventData({ ...eventData, startDate: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        data-testid="input-event-start-date"
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-sm mb-1 block">Start Time *</label>
                      <input
                        type="time"
                        value={eventData.startTime}
                        onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        data-testid="input-event-start-time"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-white/70 text-sm mb-1 block">End Date</label>
                      <input
                        type="date"
                        value={eventData.endDate}
                        onChange={(e) => setEventData({ ...eventData, endDate: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        data-testid="input-event-end-date"
                      />
                    </div>
                    <div>
                      <label className="text-white/70 text-sm mb-1 block">End Time</label>
                      <input
                        type="time"
                        value={eventData.endTime}
                        onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                        data-testid="input-event-end-time"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white/70 text-sm mb-1 block flex items-center gap-1">
                      <Users className="w-3 h-3" /> Max Attendees (optional)
                    </label>
                    <input
                      type="number"
                      value={eventData.maxAttendees}
                      onChange={(e) => setEventData({ ...eventData, maxAttendees: e.target.value })}
                      placeholder="Leave empty for unlimited"
                      min="1"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                      data-testid="input-event-max-attendees"
                    />
                  </div>
                </div>
              )}

              {selectedType !== 'poll' && selectedType !== 'event' && (
                <div>
                  <label className="text-white/70 text-sm mb-2 block">
                    {selectedType === 'signal' ? 'Caption (optional)' : 'What\'s on your mind?'}
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={selectedType === 'signal' ? 'Add a caption...' : 'Share your thoughts...'}
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    data-testid="input-content"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedType(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 transition-colors"
                  data-testid="back-button"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={createPostMutation.isPending || createPollMutation.isPending || createEventMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="submit-post"
                >
                  {(createPostMutation.isPending || createPollMutation.isPending || createEventMutation.isPending) ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {selectedType === 'poll' ? 'Create Poll' : selectedType === 'event' ? 'Create Event' : 'Post'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
