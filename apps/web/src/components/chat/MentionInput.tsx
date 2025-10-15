import { useState, useRef, useEffect } from 'react';
import { Textarea } from '../ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { apiHelpers } from '../../lib/api';

interface Profile {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  // groupId?: string; // Future: If in a group, limit suggestions to group members
}

export function MentionInput({
  value,
  onChange,
  onKeyDown,
  placeholder = 'Digite uma mensagem...',
  rows = 1,
  className = '',
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<Profile[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detect @mention pattern
  useEffect(() => {
    const text = value.slice(0, cursorPosition);
    const mentionMatch = text.match(/@(\w*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setShowSuggestions(true);
      fetchSuggestions(query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setSelectedIndex(0);
    }
  }, [value, cursorPosition]);

  const fetchSuggestions = async (query: string) => {
    try {
      // TODO: Implement proper API endpoint for mention suggestions
      // For now, using search API as fallback
      const response = await apiHelpers.searchProfiles({ query, limit: 5 });
      setSuggestions(response.profiles || []);
    } catch (error) {
      console.error('Failed to fetch mention suggestions:', error);
      setSuggestions([]);
    }
  };

  const insertMention = (profile: Profile) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const beforeMention = value.slice(0, cursorPosition).replace(/@\w*$/, '');
    const afterMention = value.slice(cursorPosition);
    const mentionText = `@${profile.username} `;
    const newValue = beforeMention + mentionText + afterMention;
    const newCursorPos = beforeMention.length + mentionText.length;

    onChange(newValue);
    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedIndex(0);

    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Pass through to parent handler
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    setCursorPosition(e.target.selectionStart);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setCursorPosition(target.selectionStart);
  };

  return (
    <Popover open={showSuggestions} onOpenChange={setShowSuggestions}>
      <PopoverTrigger asChild>
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onSelect={handleSelect}
          placeholder={placeholder}
          rows={rows}
          className={className}
        />
      </PopoverTrigger>
      <PopoverContent
        className="w-72 p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-60 overflow-y-auto">
          {suggestions.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground text-center">
              Nenhum usuário encontrado
            </div>
          ) : (
            suggestions.map((profile, index) => (
              <button
                key={profile.id}
                onClick={() => insertMention(profile)}
                className={`w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors ${
                  index === selectedIndex ? 'bg-accent' : ''
                }`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                  <AvatarFallback>{profile.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{profile.name}</div>
                  <div className="text-xs text-muted-foreground">@{profile.username}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
