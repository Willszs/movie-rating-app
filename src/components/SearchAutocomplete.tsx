"use client";
import { useEffect, useRef, useState } from "react";

type Movie = {
  id: string | number;
  title: string;
  release_date?: string;
  poster_url?: string | null; // 统一成完整 URL，方便直接 img 显示
};

type Props = {
  onSelect: (movie: Movie) => void;
  placeholder?: string;
  minChars?: number; // 触发搜索的最少字符数
};

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

  // --- 简单防抖 ---
  const [debounced, setDebounced] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  // --- 点击外部关闭 ---
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // --- 拉取候选（兼容两种返回结构） ---
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
          // TMDb 原始结构：{ results: [...] }
          mapped = data.results.slice(0, 10).map((m: unknown) => {
            const movie = m as {
              id?: number | string;
              title?: string;
              name?: string;
              release_date?: string;
              poster_path?: string | null;
            };
            return {
              id: movie.id ?? `${movie.title ?? movie.name}-${movie.release_date ?? ""}`,
              title: movie.title ?? movie.name ?? "",
              release_date: movie.release_date,
              poster_url: movie.poster_path
                ? `https://image.tmdb.org/t/p/w185${movie.poster_path}`
                : null,
            };
          });
        } else if (
          data &&
          (data as { title?: string; poster?: string | null; rating?: number }).title
        ) {
          // 你的接口单对象：{ title, year, poster, rating }
          const movie = data as {
            id?: number | string;
            title?: string;
            year?: string;
            poster?: string | null;
            rating?: number;
          };
          mapped = [
            {
              id: movie.id ?? `${movie.title}-${movie.year ?? ""}`,
              title: movie.title ?? "",
              release_date: movie.year ? `${movie.year}-01-01` : undefined,
              poster_url: movie.poster ?? null, // 可能已是完整 URL
            },
          ];
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

  // --- 键盘导航 ---
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
    // 上面这行能避免上下键时选中项跑出可视区
  }

  function handleSelect(m: Movie) {
    onSelect(m);
    setQuery(m.title);
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
                    onMouseDown={(e) => e.preventDefault()} // 防止 input 失焦
                    onClick={() => handleSelect(m)}
                    className={`flex cursor-pointer items-center gap-3 px-3 py-2 ${isActive ? "bg-gray-100" : ""
                      }`}
                  >
                    {/* 缩略图（w185），需要时可改成 w342 */}
                    {m.poster_url ? (
                      <img
                        src={m.poster_url}
                        alt=""
                        className="h-16 w-12 rounded object-cover"
                      />
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

