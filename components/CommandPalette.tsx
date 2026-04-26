'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SearchResult } from '../lib/search';

const KIND_ICON: Record<SearchResult['kind'], string> = {
  party: '👤',
  opportunity: '💼',
  task: '✅',
  activity: '📝'
};

const KIND_LABEL: Record<SearchResult['kind'], string> = {
  party: 'Party',
  opportunity: 'Opportunity',
  task: 'Task',
  activity: 'Activity'
};

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<number | null>(null);

  // Cmd/Ctrl+K to open. Esc to close. ↑/↓ to navigate. Enter to go.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isModK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k';
      if (isModK) {
        e.preventDefault();
        setOpen(true);
        return;
      }
      if (!open) return;
      if (e.key === 'Escape') { setOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setHighlight((h) => Math.min(h + 1, Math.max(0, results.length - 1))); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); return; }
      if (e.key === 'Enter') {
        const r = results[highlight];
        if (r) {
          e.preventDefault();
          setOpen(false);
          router.push(r.href);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, results, highlight, router]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setHighlight(0);
      // Focus the input after the modal has mounted.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(Array.isArray(data.results) ? data.results : []);
        setHighlight(0);
      } catch {
        setResults([]);
      }
    }, 150);
  }, [query]);

  return (
    <>
      <button
        type="button"
        className="sidebar-search"
        onClick={() => setOpen(true)}
        title="Search (Ctrl/⌘ + K)"
      >
        <span>🔍 Search</span>
        <span className="kbd">⌘K</span>
      </button>

      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)} role="presentation">
          <div className="modal-palette" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <input
              ref={inputRef}
              className="palette-input"
              placeholder="Search parties, opportunities, tasks…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="palette-results">
              {query.trim() === '' && (
                <div className="palette-empty">Type to search across everything.</div>
              )}
              {query.trim() !== '' && results.length === 0 && (
                <div className="palette-empty">No matches.</div>
              )}
              {results.map((r, i) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  className={`palette-item ${i === highlight ? 'palette-item-active' : ''}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => { setOpen(false); router.push(r.href); }}
                >
                  <span className="palette-icon" aria-hidden>{KIND_ICON[r.kind]}</span>
                  <span className="palette-text">
                    <span className="palette-title">{r.title}</span>
                    {r.subtitle && <span className="palette-subtitle">{r.subtitle}</span>}
                  </span>
                  <span className="palette-kind">{KIND_LABEL[r.kind]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
