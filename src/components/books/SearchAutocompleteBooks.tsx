// src/components/books/SearchAutocompleteBooks.tsx
"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { BookCard } from "../../types";

type Props = {
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  onSelect: (b: BookCard) => void;
};

type BookLite = {
  id: string;
  title: string;
  authors?: string[];
  cover: string | null;
  year?: number;
  isbn?: string;
};

export default function SearchAutocompleteBooks({
  placeholder = "Search books…",
  value,
  onChange,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BookLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const justSelected = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);

  const q = useMemo(() => value.trim(), [value]);

  // 外部点击关闭
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!boxRef.current) return;
      if (boxRef.current.contains(e.target as Node)) return;
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // 防抖搜索
  useEffect(() => {
    if (justSelected.current) {
      justSelected.current = false;
      return;
    }
    if (!q) {
      setItems([]);
      setOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setLoading(true);
      try {
        const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`, {
          signal: ac.signal,
          cache: "no-store",
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        const mapped: BookLite[] = Array.isArray(data?.results)
          ? data.results.slice(0, 10).map((d: any) => ({
              id: String(d.id ?? ""),
              title: String(d.title ?? ""),
              authors: Array.isArray(d.authors) ? d.authors : [],
              cover: d.cover ?? null,
              year: typeof d.year === "number" ? d.year : undefined,
              isbn: Array.isArray(d.isbn) ? d.isbn[0] : d.isbn,
            }))
          : [];
        setItems(mapped);
        setOpen(true);
        setActiveIndex(mapped.length ? 0 : -1);
      } catch {
        setItems([]);
        setOpen(true);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [q]);

  // 键盘导航
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (items.length ? (i + 1) % items.length : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        items.length ? (i - 1 + items.length) % items.length : -1
      );
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < items.length) {
        const picked = items[activeIndex];
        handlePick(picked);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  // 选中
  function handlePick(b: BookLite) {
    justSelected.current = true;
    setOpen(false);
    setActiveIndex(-1);
    onChange(b.title);
    onSelect({
      id: b.id,
      title: b.title,
      authors: b.authors ?? [],
      cover: b.cover ?? null,
      year: b.year,
      isbn: b.isbn,
    });
    // 聚焦回输入框，便于连续输入
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  // 激活项滚动可见
  useEffect(() => {
    if (!listRef.current) return;
    if (activeIndex < 0) return;
    const li = listRef.current.children[activeIndex] as HTMLElement | undefined;
    if (li) li.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div ref={boxRef} className="relative">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-white/20 bg-black/40 px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500"
      />

      {open && (
        <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-white/15 bg-black shadow-xl z-20">
          {loading ? (
            <div className="px-3 py-2 text-sm text-white/60">Searching…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-white/40">No results</div>
          ) : (
            <ul ref={listRef} className="max-h-72 overflow-auto py-1">
              {items.map((b, i) => {
                const active = i === activeIndex;
                return (
                  <li key={b.id}>
                    <button
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => handlePick(b)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left ${
                        active ? "bg-white/10" : "hover:bg-white/5"
                      }`}
                    >
                      {b.cover ? (
                        <img
                          src={b.cover}
                          alt={b.title}
                          className="h-10 w-7 object-cover rounded"
                        />
                      ) : (
                        <div className="h-10 w-7 rounded bg-white/10" />
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{b.title}</div>
                        <div className="truncate text-xs text-white/60">
                          {b.authors?.join(", ")}
                          {b.year ? ` · ${b.year}` : ""}
                        </div>
                      </div>
                    </button>
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
