import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useAppStore } from '@/store';

const SearchBar: React.FC = () => {
  const { query, setQuery } = useAppStore();
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Mock field suggestions
  const fieldSuggestions = [
    'level:ERROR',
    'level:WARN', 
    'level:INFO',
    'level:DEBUG',
    'file:',
    'service:',
    'host:',
    'message:',
    'timestamp:',
    'AND',
    'OR',
    'NOT',
  ];

  const updateSuggestions = (text: string) => {
    if (!text || !focused) {
      setSuggestions([]);
      return;
    }

    const lastWord = text.split(/\s+/).pop() || '';
    const filtered = fieldSuggestions.filter(s => 
      s.toLowerCase().includes(lastWord.toLowerCase())
    );
    
    setSuggestions(filtered.slice(0, 8));
    setSelectedSuggestion(-1);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newText = e.target.value;
    setQuery({ ...query, text: newText });
    updateSuggestions(newText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      
      case 'Enter':
        if (selectedSuggestion >= 0) {
          e.preventDefault();
          applySuggestion(suggestions[selectedSuggestion]);
        }
        break;
      
      case 'Escape':
        setSuggestions([]);
        setSelectedSuggestion(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const applySuggestion = (suggestion: string) => {
    const words = query.text.split(/\s+/);
    words[words.length - 1] = suggestion;
    const newText = words.join(' ') + (suggestion.endsWith(':') ? '' : ' ');
    
    setQuery({ ...query, text: newText });
    setSuggestions([]);
    setSelectedSuggestion(-1);
    inputRef.current?.focus();
  };

  const clearSearch = () => {
    setQuery({ ...query, text: '' });
    setSuggestions([]);
    inputRef.current?.focus();
  };

  useEffect(() => {
    updateSuggestions(query.text);
  }, [focused]);

  // Global keyboard shortcut
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <div className="relative">
      <div className={`
        relative flex items-center border rounded-md transition-colors
        ${focused ? 'border-ring ring-2 ring-ring ring-offset-2' : 'border-input'}
      `}>
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
        
        <input
          ref={inputRef}
          type="text"
          value={query.text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            // Delay hiding suggestions to allow clicking
            setTimeout(() => setFocused(false), 200);
          }}
          placeholder="Search logs... (press / to focus)"
          className="w-full pl-10 pr-10 py-2 bg-background text-sm focus:outline-none"
        />
        
        {query.text && (
          <button
            onClick={clearSearch}
            className="absolute right-3 p-1 hover:bg-accent rounded transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {suggestions.length > 0 && focused && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              onClick={() => applySuggestion(suggestion)}
              className={`
                w-full px-3 py-2 text-left text-sm hover:bg-accent transition-colors
                ${index === selectedSuggestion ? 'bg-accent' : ''}
              `}
            >
              <span className="font-mono">{suggestion}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search syntax help */}
      {focused && query.text === '' && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg p-3">
          <h4 className="text-sm font-medium mb-2">Search Syntax</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div><code>level:ERROR</code> - Filter by log level</div>
            <div><code>file:app.log</code> - Filter by filename</div>
            <div><code>"exact phrase"</code> - Search for exact phrase</div>
            <div><code>term1 AND term2</code> - Both terms must match</div>
            <div><code>term1 OR term2</code> - Either term must match</div>
            <div><code>NOT term</code> - Exclude term</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;