import { useState, useCallback, useRef, useEffect } from "react";

interface MentionSuggestion {
  id: string;
  handle: string;
  fullName: string;
  photoUrl: string | null;
  party: string | null;
  office: string | null;
  state: string | null;
}

export function useMentionAutocomplete() {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number>(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (q: string) => {
    if (!q || q.length < 1) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    try {
      const res = await fetch(`/api/politicians/search-handle?q=${encodeURIComponent(q)}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
      }
    } catch {
      setSuggestions([]);
    }
  }, []);

  const handleInputChange = useCallback((text: string, cursorPos: number) => {
    const before = text.slice(0, cursorPos);
    const atMatch = before.match(/@(\w*)$/);

    if (atMatch) {
      const q = atMatch[1];
      setQuery(q);
      setMentionStart(cursorPos - q.length - 1);

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(q), 200);
    } else {
      setIsOpen(false);
      setQuery("");
      setMentionStart(-1);
    }
  }, [search]);

  const selectSuggestion = useCallback((suggestion: MentionSuggestion, text: string): string => {
    if (mentionStart < 0) return text;
    const before = text.slice(0, mentionStart);
    const afterCursor = text.slice(mentionStart + query.length + 1);
    const newText = before + '@' + suggestion.handle + ' ' + afterCursor;
    setIsOpen(false);
    setSuggestions([]);
    setQuery("");
    setMentionStart(-1);
    return newText;
  }, [mentionStart, query]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSuggestions([]);
    setQuery("");
    setMentionStart(-1);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return { suggestions, isOpen, query, handleInputChange, selectSuggestion, close };
}
