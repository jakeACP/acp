import { useState } from "react";
import { X, FileText, Video, Image, BarChart2, Calendar, Megaphone, Send } from "lucide-react";
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

export function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const { toast } = useToast();

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

  const handleClose = () => {
    setSelectedType(null);
    setContent('');
    setTitle('');
    setVideoUrl('');
    setPollOptions(['', '']);
    onClose();
  };

  const handleSubmit = () => {
    if (!content.trim() && selectedType !== 'poll') {
      toast({ title: 'Content required', description: 'Please write something to post.', variant: 'destructive' });
      return;
    }

    let postContent = content;
    
    if (selectedType === 'signal' && videoUrl) {
      postContent = videoUrl + (content ? '\n\n' + content : '');
    }

    const postData: any = {
      content: postContent,
      type: selectedType === 'poll' ? 'poll' : 'post',
    };

    if (selectedType === 'poll') {
      postData.pollTitle = title || 'Poll';
      postData.pollOptions = pollOptions.filter(o => o.trim()).map((text, i) => ({ id: i + 1, text, votes: 0 }));
      postData.pollVotingSystem = 'simple';
      postData.content = title || 'Poll';
    }

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
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-lg bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl rounded-t-3xl border-t border-white/10 max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300"
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

        <div className="p-4 overflow-y-auto max-h-[70vh]">
          {!selectedType ? (
            <div className="grid grid-cols-3 gap-3">
              {postTypes.map(({ type, icon: Icon, label, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 hover:bg-white/10 transition-all active:scale-95"
                  data-testid={`create-${type}`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-white text-xs font-medium text-center">{label}</span>
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

              {selectedType !== 'poll' && (
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
                  disabled={createPostMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-500 to-blue-500 text-white font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  data-testid="submit-post"
                >
                  {createPostMutation.isPending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Post
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
