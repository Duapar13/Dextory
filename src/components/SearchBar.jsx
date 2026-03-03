import { useState, useEffect, useRef } from 'react';
import './SearchBar.css';

export default function SearchBar({ onSearch, loading, initialValue = '' }) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const isFirstRender = useRef(true);

  // Sync if initialValue changes (e.g. navigating from home)
  useEffect(() => {
    if (initialValue && initialValue !== value) {
      setValue(initialValue);
    }
  }, [initialValue]);

  useEffect(() => {
    // Skip debounce on first render if we already have initialValue
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (initialValue) return; // search was already triggered
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onSearch(value);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [value, onSearch]);

  const handleClear = () => {
    setValue('');
    onSearch('');
    inputRef.current?.focus();
  };

  return (
    <div className="search-bar">
      <div className="search-icon">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Rechercher une musique, un artiste..."
        className="search-input"
      />
      {loading && (
        <div className="search-spinner">
          <div className="spinner" />
        </div>
      )}
      {value && !loading && (
        <button className="search-clear" onClick={handleClear}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
