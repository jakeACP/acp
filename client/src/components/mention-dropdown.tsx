import { useState, useEffect, useCallback } from "react";
import { User } from "lucide-react";

interface MentionSuggestion {
  id: string;
  handle: string;
  fullName: string;
  photoUrl: string | null;
  party: string | null;
  office: string | null;
  state: string | null;
}

interface MentionDropdownProps {
  suggestions: MentionSuggestion[];
  isOpen: boolean;
  onSelect: (suggestion: MentionSuggestion) => void;
  onClose: () => void;
}

export function MentionDropdown({ suggestions, isOpen, onSelect, onClose }: MentionDropdownProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestions[activeIndex]) {
      e.preventDefault();
      onSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, suggestions, activeIndex, onSelect, onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || suggestions.length === 0) return null;

  return (
    <div className="absolute z-50 bottom-full left-0 right-0 mb-1 bg-popover border rounded-md shadow-lg overflow-hidden max-h-[240px] overflow-y-auto">
      {suggestions.map((s, i) => (
        <button
          key={s.id}
          type="button"
          className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
            i === activeIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
          }`}
          onMouseEnter={() => setActiveIndex(i)}
          onClick={() => onSelect(s)}
        >
          {s.photoUrl ? (
            <img src={s.photoUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-blue-600 dark:text-blue-400">@{s.handle}</span>
              <span className="text-muted-foreground truncate">{s.fullName}</span>
            </div>
            {(s.office || s.state) && (
              <p className="text-xs text-muted-foreground truncate">
                {[s.office, s.state].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          {s.party && <span className="text-xs text-muted-foreground shrink-0">{s.party}</span>}
        </button>
      ))}
    </div>
  );
}
