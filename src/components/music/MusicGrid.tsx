"use client";
import React, { useRef, useState } from "react";
import SearchAutocompleteMusic from "./SearchAutocompleteMusic";
import AlbumCard from "./AlbumCard";
import { useExportImage } from "../../hooks/useExportImage";
import type { AlbumCard as AlbumCardType, Selected } from "../../types";

const safeTrim = (v: unknown) => (typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim());

export default function MusicGrid() {
  const [albums, setAlbums] = useState<AlbumCardType[]>(
    Array.from({ length: 9 }, (_, i) => ({ title: `Album ${i + 1}`, artist: "", cover: null }))
  );
  const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));
  const [selected, setSelected] = useState<Selected[]>(Array(9).fill(null));
  const [title, setTitle] = useState("2024 Favorite Albums");

  const gridRef = useRef<HTMLDivElement>(null);
  const { busy, exportNodeAsImage } = useExportImage();

  async function handleGenerate() {
    const next = [...albums];
    for (let i = 0; i < inputs.length; i++) {
      const q = safeTrim(inputs[i]);
      if (!q) continue;
      try {
        const r = await fetch(`/api/music?q=${encodeURIComponent(q)}&limit=1`);
        const data = await r.json();
        const a = data?.items?.[0];
        if (a) next[i] = { title: a.title, artist: a.artist, cover: a.cover ?? null, year: a.year };
      } catch (e) {
        console.error("music fetch failed", i + 1, q, e);
      }
    }
    setAlbums(next);
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="w-full flex flex-col items-center gap-4 mb-6">
        <input
          value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorite Albums)"
          className="w-full text-center text-4xl md:text-6xl font-extrabold bg-transparent outline-none border-b border-white/20 pb-2"
        />
        <div className="flex flex-wrap gap-3">
          <button onClick={handleGenerate} className="px-5 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold shadow-[0_10px_30px_rgba(16,185,129,.35)] hover:bg-emerald-400 active:translate-y-px">
            Generate
          </button>
          <button onClick={() => exportNodeAsImage(gridRef.current, title)} disabled={busy}
            className="px-5 py-2 rounded-2xl bg-white text-black font-extrabold shadow-[0_10px_30px_rgba(255,255,255,.2)] hover:bg-white/90 active:translate-y-px disabled:opacity-60">
            {busy ? "Exporting..." : "Export PNG"}
          </button>
        </div>
      </div>

      <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx}>
            <SearchAutocompleteMusic
              placeholder={`Album ${idx + 1}`}
              onSelect={(a) => {
                const nextInputs = [...inputs];
                nextInputs[idx] = a.title;
                setInputs(nextInputs);
                setSelected((prev) => { const n = [...prev]; n[idx] = { id: a.id }; return n; });
              }}
            />
            {safeTrim(inputs[idx]) && (
              <input
                value={inputs[idx]}
                onChange={(e) => { const next = [...inputs]; next[idx] = e.target.value; setInputs(next); }}
                className="mt-2 w-full rounded-md bg-transparent border border-white/20 px-3 py-2 text-sm outline-none focus:border-emerald-500"
              />
            )}
          </div>
        ))}
      </div>

      <div ref={gridRef}>
        <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">{title}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {albums.map((a, idx) => (<AlbumCard key={idx} album={a} />))}
        </div>
        <p className="text-center text-xs text-white/40 mt-6">Album data from iTunes Search API.</p>
      </div>
    </div>
  );
}
