"use client";
import { useEffect, useRef, useState } from "react";

type Album = { id: string | number; title: string; artist?: string; year?: number; cover?: string | null; };

export default function SearchAutocompleteMusic({
  onSelect, placeholder = "Type an album or artist…", minChars = 2,
}: { onSelect: (a: Album) => void; placeholder?: string; minChars?: number; }) {
  const [query, setQuery] = useState(""); const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false); const [items, setItems] = useState<Album[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null); const justSelected = useRef(false);
  const [debounced, setDebounced] = useState(query);
  useEffect(() => { const t = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(t); }, [query]);
  useEffect(() => { const onDown = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown); return () => document.removeEventListener("mousedown", onDown); }, []);
  useEffect(() => {
    const q = debounced.trim();
    if (justSelected.current || !open) { justSelected.current = false; return; }
    if (q.length < minChars) { setItems([]); setOpen(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/music?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        const data = await r.json();
        const mapped: Album[] = Array.isArray(data?.items) ? data.items.slice(0, 10) : [];
        if (!cancelled) { setItems(mapped); setOpen(true); setActiveIndex(mapped.length ? 0 : -1); }
      } finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [debounced, minChars, open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex((i) => (i + 1) % items.length); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex((i) => (i - 1 + items.length) % items.length); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeIndex >= 0) handleSelect(items[activeIndex]); }
    else if (e.key === "Escape") setOpen(false);
  }
  function handleSelect(a: Album) { onSelect(a); justSelected.current = true; setQuery(a.title); setItems([]); setOpen(false); inputRef.current?.blur(); }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        ref={inputRef} value={query}
        onChange={(e) => { setQuery(e.target.value); if (!open) setOpen(true); }}
        onFocus={() => { if (justSelected.current) { justSelected.current = false; return; } if (query.trim().length >= minChars) setOpen(true); }}
        onKeyDown={onKeyDown} placeholder={placeholder}
        className="w-full rounded-xl border border-white/30 bg-transparent px-4 py-3 text-white placeholder:text-white/60 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400"
      />
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {loading && <div className="p-3 text-sm text-gray-500">Searching…</div>}
          {!loading && items.length === 0 && <div className="p-3 text-sm text-gray-500">No results</div>}
          {!loading && items.length > 0 && (
            <ul ref={listRef} className="max-h-72 overflow-y-auto">
              {items.map((a, idx) => (
                <li key={a.id}
                  onMouseDown={(e) => e.preventDefault()} onClick={() => handleSelect(a)}
                  className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${idx === activeIndex ? "bg-gray-100" : ""}`}>
                  {a.cover ? <img src={a.cover} className="h-12 w-12 rounded object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" /> : <div className="h-12 w-12 rounded bg-gray-200" />}
                  <div className="min-w-0">
                    <div className="truncate font-medium text-gray-900">{a.title}</div>
                    <div className="text-xs text-gray-500">{a.artist ?? "—"}{a.year ? ` · ${a.year}` : ""}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
