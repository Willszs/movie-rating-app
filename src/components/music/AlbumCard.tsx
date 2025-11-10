"use client";
import React from "react";
import type { AlbumCard as AlbumCardType } from "../../types";

export default function AlbumCard({ album }: { album: AlbumCardType }) {
  return (
    <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center p-4">
      <div className="w-full aspect-square bg-black flex items-center justify-center">
        <img
          src={album.cover ?? `https://via.placeholder.com/600x600?text=${encodeURIComponent(album.title)}`}
          alt={album.title}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className="max-w-[100%] max-h-[100%] object-contain"
        />
      </div>
      <div className="mt-3 text-center">
        <p className="text-base font-extrabold leading-tight mb-1 break-words">{album.title}</p>
        <p className="text-white/70 text-xs">{album.artist ?? "—"}{album.year ? ` · ${album.year}` : ""}</p>
      </div>
    </div>
  );
}

