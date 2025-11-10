// src/components/books/BooksPanel.tsx
"use client";
import React, { useRef, useState } from "react";
import SearchAutocompleteBooks from "./SearchAutocompleteBooks";
import PosterCardBook from "./PosterCardBook";
import { useExportImage } from "../../hooks/useExportImage";
import type { BookCard } from "../../types";

const safeTrim = (v: unknown) =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

export default function BooksPanel() {
  // 3×3 初始占位（与 MovieGrid 同思路）
  const [books, setBooks] = useState<BookCard[]>(
    Array.from({ length: 9 }, () => ({
      id: "",
      title: "",
      authors: [],
      cover: null,
      year: undefined,
      isbn: undefined,
    }))
  );
  const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));
  // 选择的候选，直接存 BookCard，Generate 时优先用它；否则用输入词去取 Top-1
  const [picked, setPicked] = useState<(BookCard | null)[]>(Array(9).fill(null));
  const [title, setTitle] = useState("2024 Favorite Books");

  const gridRef = useRef<HTMLDivElement>(null);
  const { busy, exportNodeAsImage } = useExportImage();

  function handleInputChange(index: number, value: string) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
    // 用户手动改了输入，视为取消已选
    setPicked((prev) => {
      const n = [...prev];
      n[index] = null;
      return n;
    });
  }

  // 点击 Generate：优先使用 picked；否则用关键词 q 拉 /api/books 取 Top-1
  async function handleGenerate() {
    const next = [...books];

    for (let i = 0; i < 9; i++) {
      const chosen = picked[i];
      const q = safeTrim(inputs[i]);

      try {
        if (chosen && chosen.title) {
          next[i] = {
            id: chosen.id,
            title: chosen.title,
            authors: chosen.authors ?? [],
            cover: chosen.cover ?? null,
            year: chosen.year ?? undefined,
            isbn: chosen.isbn ?? undefined,
          };
          continue;
        }

        if (q) {
          const res = await fetch(`/api/books?q=${encodeURIComponent(q)}`, { cache: "no-store" });
          if (res.ok) {
            const data = await res.json();
            const top = Array.isArray(data?.results) && data.results.length > 0 ? data.results[0] : null;
            if (top) {
              next[i] = {
                id: String(top.id ?? ""),
                title: String(top.title ?? ""),
                authors: Array.isArray(top.authors) ? top.authors : [],
                cover: top.cover ?? null,
                year: typeof top.year === "number" ? top.year : undefined,
                isbn: Array.isArray(top.isbn) ? top.isbn[0] : top.isbn,
              };
            }
          }
        }
      } catch (err) {
        console.error("BooksPanel generate slot", i + 1, q, err);
      }
    }

    setBooks(next);
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 标题 + 按钮（与 MovieGrid 对齐） */}
      <div className="w-full flex flex-col items-center gap-4 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorite Books / 我的年度九佳图书)"
          className="w-full text-center text-4xl md:text-6xl font-extrabold bg-transparent outline-none border-b border-white/20 pb-2"
        />
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            className="px-5 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold shadow-[0_10px_30px_rgba(16,185,129,.35)] hover:bg-emerald-400 active:translate-y-px"
          >
            Generate
          </button>
          <button
            onClick={() => exportNodeAsImage(gridRef.current, title)}
            disabled={busy}
            className="px-5 py-2 rounded-2xl bg-white text-black font-extrabold shadow-[0_10px_30px_rgba(255,255,255,.2)] hover:bg-white/90 active:translate-y-px disabled:opacity-60"
          >
            {busy ? "Exporting..." : "Export PNG"}
          </button>
        </div>
      </div>

      {/* 9 个搜索框（样式与 MovieGrid 一致） */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx}>
            <SearchAutocompleteBooks
              placeholder={`Book ${idx + 1}`}
              onSelect={(book) => {
                const nextInputs = [...inputs];
                nextInputs[idx] = book.title;
                setInputs(nextInputs);

                setPicked((prev) => {
                  const n = [...prev];
                  n[idx] = {
                    id: book.id,
                    title: book.title,
                    authors: book.authors ?? [],
                    cover: book.cover ?? null,
                    year: book.year ?? undefined,
                    isbn: book.isbn ?? undefined,
                  };
                  return n;
                });
              }}
              value={inputs[idx]}
              onChange={(v) => handleInputChange(idx, v)}
            />
            {safeTrim(inputs[idx]) && (
              <p className="mt-1 px-1 text-xs text-white/60">Selected: {inputs[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {/* 可导出的 3×3 书封网格（样式与电影/音乐一致） */}
      <div ref={gridRef}>
        <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">{title}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {books.map((b, idx) => (
            <PosterCardBook key={idx} book={b} />
          ))}
        </div>
      </div>
    </div>
  );
}





