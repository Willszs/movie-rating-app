"use client";
import { useEffect, useRef, useState } from "react";

type Movie = {
  id: string | number;
  title: string;          // 可能带 (YYYY)
  release_date?: string;
  poster?: string | null; // 和后端统一
};

type Props = {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
  minChars?: number;
};

function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, "");
}

export default function SearchAutocomplete({
  onSelect,
  placeholder = "Type a movie name…",
  minChars = 2,
}: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Movie[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // 防抖
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // 点击外面关闭
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // 拉取候选（使用 results 数组）
  useEffect(() => {
    const q = debounced.trim();
    if (q.length < minChars) {
      setItems([]);
      setOpen(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();

        let mapped: Movie[] = [];
        if (Array.isArray(data?.results)) {
          mapped = data.results.slice(0, 10).map((movie: any) => ({
            id: movie.id ?? `${movie.title}-${movie.release_date ?? ""}`,
            title: movie.title ?? "",
            release_date: movie.release_date ?? undefined,
            poster: movie.poster ?? null, // 后端已拼好完整 URL
          }));
        }

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
    return () => {
      cancelled = true;
    };
  }, [debounced, minChars]);

  // 键盘导航
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

  function scrollActiveIntoView() {
    const list = listRef.current;
    if (!list) return;
    const li = list.children[activeIndex] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }

  function handleSelect(m: Movie) {
    onSelect(m);
    setQuery(stripYear(m.title)); // 输入框写回纯标题
    setOpen(false);
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => query.trim().length >= minChars && setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls="movie-suggestions"
        className="w-full rounded-xl border border-white/30 bg-transparent px-4 py-3 text-white placeholder:text-white/60 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400"
      />

      {open && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border bg-white shadow-lg">
          {loading && <div className="p-3 text-sm text-gray-500">Searching…</div>}

          {!loading && items.length === 0 && (
            <div className="p-3 text-sm text-gray-500">No results</div>
          )}

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
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelect(m)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isActive ? "bg-gray-100" : ""}`}
                  >
                    {m.poster ? (
                      <img src={m.poster} alt="" className="h-16 w-12 rounded object-cover" />
                    ) : (
                      <div className="h-16 w-12 rounded bg-gray-200" />
                    )}

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



