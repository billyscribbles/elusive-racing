import { useState } from 'react';
import { Search } from 'lucide-react';
import './SearchBar.css';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <form className="search-form" onSubmit={handleSubmit}>
      <div className="search-wrapper">
        <Search className="search-icon" size={18} strokeWidth={2} />
        <input
          type="search"
          className="search-input"
          placeholder="Search products..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </div>
    </form>
  );
}
