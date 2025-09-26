"use client";

/**
 * Annual Movie Grid – Page
 *
 * What this file does:
 * - Renders a simple tool to generate a 3×3 movie poster grid
 * - Lets the user enter 9 movie titles, fetches real posters via our /api/search
 * - Converts TMDb vote_average (0–10) into 0–5 green stars
 * - Exports the whole grid (including big title) as a high-res PNG
 *
 * Why "use client":
 * - We use React state/hooks and run browser-only logic (exporting a DOM node to an image)
 */

import { useRef, useState } from "react";

type MovieCard = {
  /** Display title (we render "Title (Year)" when available) */
  title: string;
  /** Poster URL (TMDb image base or a placeholder) */
  poster: string;
  /** TMDb vote_average, range: 0–10 (we convert to stars/5) */
  rating: number;
};

export default function Home() {
  /**
   * Movies UI state:
   * - Initialize 9 placeholders so the grid renders immediately
   * - When user clicks "Generate", we fill each cell with real data
   */
  const [movies, setMovies] = useState<MovieCard[]>(
    Array.from({ length: 9 }, (_, i) => ({
      title: `Movie ${i + 1}`,
      poster: `https://via.placeholder.com/300x450?text=Movie+${i + 1}`,
      rating: 0,
    }))
  );

  /**
   * Inputs state: 9 text boxes (one per slot).
   * You type movie names here, then click "Generate" to fetch posters/ratings.
   */
  const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));

  /** Editable big title shown above the grid and exported into the image */
  const [title, setTitle] = useState("2024 Favorites");

  /** A ref to the grid container we will export as PNG */
  const gridRef = useRef<HTMLDivElement>(null);

  /** Busy flag (disable buttons, show feedback) */
  const [busy, setBusy] = useState(false);

  /** Update a single input field */
  function handleInputChange(index: number, value: string) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
  }

  /**
   * Fetch data for all 9 inputs (sequential & simple for MVP).
   * For each non-empty query:
   *   - GET /api/search?q=Title
   *   - Replace the corresponding grid cell with real title/poster/rating
   */
  async function handleGenerate() {
    setBusy(true);
    try {
      const next = [...movies];

      for (let i = 0; i < inputs.length; i++) {
        const q = inputs[i].trim();
        if (!q) continue;

        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (!res.ok) {
            console.warn("No result for:", q);
            continue;
          }
          const data = await res.json();

          next[i] = {
            title: `${data.title}${data.year ? ` (${data.year})` : ""}`,
            poster:
              data.poster ??
              `https://via.placeholder.com/300x450?text=${encodeURIComponent(
                data.title ?? q
              )}`,
            rating: typeof data.rating === "number" ? data.rating : 0,
          };
        } catch (err) {
          console.error("Fetch failed for:", q, err);
        }
      }

      setMovies(next);
    } finally {
      setBusy(false);
    }
  }

  /**
   * Export the grid container to a PNG using html-to-image.
   * We dynamically import the library inside the handler to avoid SSR issues.
   */
  async function handleExport() {
    if (!gridRef.current) return;
    setBusy(true);
    try {
      // Dynamic import: only runs in the browser (prevents SSR bundling errors)
      const htmlToImage = await import("html-to-image");

      // Increase pixelRatio for a sharper export (2x looks good for social sharing)
      const dataUrl = await htmlToImage.toPng(gridRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        // Match our page background to avoid transparent edges
        backgroundColor: "#000000",
      });

      // Trigger a simple client-side download
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = "my-top-9-movies.png";
      a.click();
    } catch (e) {
      console.error(e);
      alert("Export failed. Check console for details.");
    } finally {
      setBusy(false);
    }
  }

  /** Convert TMDb rating (0–10) into 0–5 stars (rounded to nearest integer) */
  function starsFromRating(r: number) {
    return Math.round(r / 2);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-8">
      {/* ===== Control Header (NOT exported) ===== */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 mb-6">
        {/* Big title editor (controls the big title rendered inside the grid) */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorites / 我的年度九佳影片)"
          className="w-full text-center text-4xl md:text-6xl font-extrabold bg-transparent outline-none border-b border-white/20 pb-2"
        />

        {/* Buttons: high-contrast, rounded, visible on dark background */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="px-5 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold shadow-[0_10px_30px_rgba(16,185,129,.35)] hover:bg-emerald-400 active:translate-y-px disabled:opacity-60"
            title="Fetch posters and ratings for all 9 inputs"
          >
            {busy ? "Working..." : "Generate"}
          </button>

          <button
            onClick={handleExport}
            disabled={busy}
            className="px-5 py-2 rounded-2xl bg-white text-black font-extrabold shadow-[0_10px_30px_rgba(255,255,255,.2)] hover:bg-white/90 active:translate-y-px disabled:opacity-60"
            title="Export the grid as a PNG image"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* ===== Inputs Area (9 boxes, easy to see on dark bg) ===== */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {inputs.map((val, idx) => (
          <input
            key={idx}
            value={val}
            onChange={(e) => handleInputChange(idx, e.target.value)}
            placeholder={`Movie ${idx + 1}`}
            className="rounded-xl px-4 py-3 bg-transparent text-white caret-white
             placeholder:text-white/60 border border-white/30
             focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 outline-none"
          />
        ))}
      </div>

      {/* ===== Exportable Grid (everything inside ref will be in the PNG) ===== */}
      <div ref={gridRef} className="w-full max-w-5xl">
        {/* Big display title that appears in the exported image */}
        <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">
          {title}
        </h1>

        {/* 3×3 poster grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {movies.map((m, idx) => {
            const stars = starsFromRating(m.rating);
            return (
              <div
                key={idx}
                className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex flex-col"
              >
                {/* Poster (kept ~2:3, cropped to fill) */}
                <img
                  src={m.poster}
                  alt={m.title}
                  className="w-full h-[360px] object-cover"
                />

                {/* Info area */}
                <div className="p-3 flex flex-col items-center justify-center">
                  {/* Movie title – Nunito bold, friendly & legible */}
                  <p className="text-center text-base font-extrabold leading-snug mb-1 text-ellipsis overflow-hidden">
                    {m.title}
                  </p>

                  {/* Numeric TMDb rating for clarity */}
                  <p className="text-white/70 text-xs mb-1">
                    {m.rating ? `TMDb: ${m.rating.toFixed(1)}/10` : "No rating"}
                  </p>

                  {/* Stars mapped from rating (0–5) – Douban-green style */}
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg
                        key={n}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill={n <= stars ? "#2DBD6E" : "gray"}
                        className="w-4 h-4"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.197-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* TMDb attribution – required for free API usage */}
        <p className="text-center text-xs text-white/40 mt-6">
          This product uses the TMDb API but is not endorsed by TMDb.
        </p>
      </div>
    </main>
  );
}
