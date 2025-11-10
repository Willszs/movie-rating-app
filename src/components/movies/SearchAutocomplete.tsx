"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Lightweight movie shape coming from your own /api/search.
 * NOTE:
 * - `title` is already normalized (e.g., "Inception (2010)").
 * - `poster` is a full URL string or null; do NOT build from poster_path here.
 */
type Movie = {
  id: string | number;
  title: string;           // may include "(YYYY)" suffix
  release_date?: string;   // ISO "YYYY-MM-DD" from API (optional)
  poster?: string | null;  // full URL or null (already normalized by backend)
};

type Props = {
  /** Callback fired when the user picks an item from the list */
  onSelect: (movie: Movie) => void;
  /** Input placeholder text */
  placeholder?: string;
  /** Minimum characters to start searching (default: 2) */
  minChars?: number;
};

/**
 * Remove a trailing "(YYYY)" from a movie title.
 * Displaying a pure title in the input often feels cleaner.
 */
function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, "");
}

export default function SearchAutocomplete({
  onSelect,
  placeholder = "Type a movie name…",
  minChars = 2,
}: Props) {
  // ---------------------------------------------------------------------------
  // Local UI state
  // ---------------------------------------------------------------------------
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Movie[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // Refs for outside-click detection and active item scrolling
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const justSelected = useRef(false);                 // 用來攔住選中後的那一次搜索/打開
  const listRef = useRef<HTMLUListElement>(null);

  // ---------------------------------------------------------------------------
  // Debounce user input to avoid firing too many network requests
  // ---------------------------------------------------------------------------
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // ---------------------------------------------------------------------------
  // Close the dropdown when clicking outside the component
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch suggestions from /api/search when debounced query changes
  // The backend returns a paginated structure:
  //   { page, total_pages, results: [{ id, title, poster, release_date, ... }] }
  // We only need the top ~10 for the dropdown.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const q = debounced.trim();

    // 若剛選過 or 已關閉，不發起搜索（避免選中後又打開）
    if (justSelected.current || !open) {
      justSelected.current = false; // 消耗標記
      return;
    }

    if (q.length < minChars) {
      setItems([]);
      setOpen(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/movies?q=${encodeURIComponent(q)}`, { cache: "no-store" });
        if (!res.ok) {
          if (!cancelled) {
            setItems([]);
            setOpen(true);
            setActiveIndex(-1);
          }
          return;
        }
        const data = await res.json();
        const mapped: Movie[] = Array.isArray(data?.results)
          ? data.results.slice(0, 10).map((movie: any) => ({
            id: movie.id ?? `${movie.title}-${movie.release_date ?? ""}`,
            title: movie.title ?? "",
            release_date: movie.release_date ?? undefined,
            poster: movie.poster ?? null,
          }))
          : [];

        if (!cancelled) {
          setItems(mapped);
          setOpen(true);
          setActiveIndex(mapped.length ? 0 : -1);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setOpen(true);
          setActiveIndex(-1);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [debounced, minChars, open]);


  // ---------------------------------------------------------------------------
  // Keyboard navigation for the suggestion list
  // ArrowDown/ArrowUp: move active index
  // Enter: select active item
  // Escape: close dropdown
  // ---------------------------------------------------------------------------
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !items.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % items.length);
      scrollActiveIntoView();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + items.length) % items.length);
      scrollActiveIntoView();
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && items[activeIndex]) {
        handleSelect(items[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Ensure the active list item is visible inside the scroll container
  function scrollActiveIntoView() {
    const list = listRef.current;
    if (!list) return;
    const li = list.children[activeIndex] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }

  // Called when the user selects an item (mouse or keyboard)
  function handleSelect(m: Movie) {
    onSelect(m);                          // 通知父級
    justSelected.current = true;          // 標記“剛剛選過”
    setQuery(stripYear(m.title));         // 如需回填可保留
    setItems([]);                         // 清空結果，避免再次滿足打開條件
    setActiveIndex(-1);
    setOpen(false);                       // 關閉下拉
    inputRef.current?.blur();             // 主動失焦，防止 onFocus 再打開
  }


  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div ref={boxRef} className="relative w-full">
      {/* Text input acting as a combobox for movie search */}
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => {
          if (justSelected.current) {         // 避免選中後立刻又被打開
            justSelected.current = false;
            return;
          }
          if (query.trim().length >= minChars) setOpen(true);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="movie-suggestions"
        className="w-full rounded-xl border border-white/30 bg-transparent px-4 py-3 text-white placeholder:text-white/60 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400"
      />


      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {/* Loading state */}
          {loading && <div className="p-3 text-sm text-gray-500">Searching…</div>}

          {/* Empty state */}
          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No results</div>
          )}

          {/* Results list */}
          {!loading && items.length > 0 && (
            <ul
              id="movie-suggestions"
              ref={listRef}
              role="listbox"
              className="max-h-72 overflow-y-auto"
            >
              {items.map((m, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={isActive}
                    onMouseEnter={() => setActiveIndex(idx)}
                    // Prevent input blur on mousedown so click registers properly
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(m)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isActive ? "bg-gray-100" : ""
                      }`}
                  >
                    {/* Poster thumbnail (already full URL or null) */}
                    {m.poster ? (
                      <img
                        src={m.poster}
                        alt=""
                        className="h-16 w-12 rounded object-cover"
                        crossOrigin="anonymous"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-16 w-12 rounded bg-gray-200" />
                    )}

                    {/* Title + Year (year is derived from release_date for compact display) */}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900">
                        {m.title}
                      </div>
                      <div className="text-xs text-gray-500">
                        {m.release_date?.slice(0, 4) ?? "—"}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}



