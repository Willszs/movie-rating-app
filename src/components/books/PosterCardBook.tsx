// src/components/books/PosterCardBook.tsx
"use client";
import React from "react";
import type { BookCard } from "../../types";

export default function PosterCardBook({ book }: { book: BookCard }) {
  return (
    <div className="flex flex-col items-center">
      {/* 2:3 纵向比例；边框与电影/音乐一致；内部不留黑边，图片全幅铺满 */}
      <div className="w-full aspect-[2/3] rounded-3xl border-4 border-neutral-800 bg-black overflow-hidden">
        {book.cover ? (
          <img
            src={book.cover}
            alt={book.title}
            className="w-full h-full object-cover"  // 关键：填充+裁切，避免留白
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full bg-neutral-800" />
        )}
      </div>

      {/* 仅标题/作者，不显示评分 */}
      <div className="mt-3 text-center">
        <div className="text-sm font-semibold line-clamp-1">
          {book.title || "\u00A0"}
        </div>
        <div className="text-xs text-neutral-400 line-clamp-1">
          {book.authors?.length ? book.authors.join(", ") : "\u00A0"}
        </div>
      </div>
    </div>
  );
}



