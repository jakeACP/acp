import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Poll } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const rawOptions = poll.options as { id: string; text: string; votes: number }[] | null;
  const options = Array.isArray(rawOptions) ? rawOptions.filter(opt => opt && opt.id) : [];
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  
  const timeLeft = poll.endDate 
    ? formatDistanceToNow(new Date(poll.endDate), { addSuffix: true })
    : null;

  const voteMutation = useMutation({
    mutationFn: async (optionId: string) => {
      return apiRequest("POST", `/api/polls/${poll.id}/vote`, { optionId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/polls'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mobile/feed'] });
      setShowResults(true);
    },
  });

  const handleVote = (optionId: string) => {
    setSelectedOption(optionId);
    voteMutation.mutate(optionId);
  };

  return (
    <article className="glass-card p-3" data-testid={`poll-card-${poll.id}`}>
      <div className="absolute top-3 left-3 z-10">
        <span className="type-tag poll">Poll</span>
      </div>
      
      <div className="pt-8">
        <h3 className="text-white font-semibold text-sm mb-3">
          {poll.title}
        </h3>
        
        <div className="space-y-2">
          {options.slice(0, 3).map((option) => {
            const percentage = totalVotes > 0 
              ? Math.round((option.votes / totalVotes) * 100) 
              : 0;
            
            return (
              <button
                key={option.id}
                className={`poll-option ${selectedOption === option.id ? 'selected' : ''}`}
                onClick={() => handleVote(option.id)}
                disabled={voteMutation.isPending || showResults}
                data-testid={`poll-option-${option.id}`}
              >
                {showResults && (
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-red-500/30 to-blue-500/30 rounded-lg"
                    style={{ width: `${percentage}%` }}
                  />
                )}
                <span className="relative z-10">{option.text}</span>
                {showResults && (
                  <span className="relative z-10 ml-auto text-white/70">
                    {percentage}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
        
        <div className="mt-3 flex items-center justify-between text-xs text-white/60">
          <button 
            className="hover:text-white/80 transition-colors"
            onClick={() => setShowResults(true)}
          >
            View results
          </button>
          <span>
            {totalVotes} votes{timeLeft && ` • closes ${timeLeft}`}
          </span>
        </div>
      </div>
    </article>
  );
}
