"use client";
// This line tells Next.js that this file is a **Client Component**.
// By default, files in the `app/` directory are **Server Components** (they run on the server).
// Adding "use client" means this component will run **in the browser**,
// so React Hooks like useState() and useRef() below can be used

/**
 * Annual Movie Grid – Page
 * -------------------------------------------------------------
 * This file defines the main page of the project.
 * - It displays the search bar (SearchAutocomplete component)
 * - Fetches movie data from our backend API (/api/search) ONLY
 * - Renders a 3×3 movie poster grid
 * - Allows exporting the grid as an image (PNG)
 */

import { useRef, useState } from "react";
// - useState(): create and update "state variables" (data that changes in the UI)
// - useRef(): directly reference a DOM element (e.g., for exporting the grid as an image)

import SearchAutocomplete from "@/components/SearchAutocomplete";
// The custom search input component that calls **our** /api/search endpoint.
// The "@/" alias points to the `src/` folder, so this means: "src/components/SearchAutocomplete.tsx"

const TRANSPARENT_PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBgEAf0cpmQAAAABJRU5ErkJggg==";
// A 1×1 transparent PNG image in Base64.
// Used during export as a safe fallback for images that fail to decode.

// --------------------------------------------------------------
// UI data structure for each rendered card in the 3×3 grid
// --------------------------------------------------------------
type MovieCard = {
  title: string;          // e.g., "Inception (2010)" — already normalized by the API
  poster: string | null;  // Full image URL or null — placeholder handled at render time
  rating: number;         // TMDb 0–10 — the page converts to stars/5 for display
};

// --------------------------------------------------------------
// helpers
// --------------------------------------------------------------
/**
 * Safely convert any value to a trimmed string.
 * - Avoids calling `.trim()` on non-strings
 * - Converts numbers/booleans to strings
 */
const safeTrim = (v: unknown) =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

// --------------------------------------------------------------
// Minimal "Selected" type: only keep the TMDb `id`
// The rest (title/poster/rating) comes from the API in handleGenerate().
// --------------------------------------------------------------
type Selected = { id: number | string } | null;

export default function Home() {
  // ===============================================================
  // 1) Movie placeholders
  // ===============================================================
  // Initialize 9 placeholder cards. We keep `poster: null` here and
  // let the <img> rendering provide a visual placeholder. This keeps
  // the data layer clean and delegates visuals to the view layer.
  const [movies, setMovies] = useState<MovieCard[]>(
    Array.from({ length: 9 }, (_, i) => ({
      title: `Movie ${i + 1}`,
      poster: null, // no URL yet; renderer will show a neutral placeholder
      rating: 0,
    }))
  );

  // ===============================================================
  // 2) Inputs for search boxes
  // ===============================================================
  // What the user typed for each of the 9 slots.
  const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));

  // ===============================================================
  // 3) Selected movies (from dropdown)
  // ===============================================================
  // Each slot stores ONLY the TMDb id if the user picked an item.
  const [selected, setSelected] = useState<Selected[]>(Array(9).fill(null));

  // ===============================================================
  // 4) Big title above the grid
  // ===============================================================
  const [title, setTitle] = useState("2024 Favorites");

  // ===============================================================
  // 5) Ref for export target
  // ===============================================================
  const gridRef = useRef<HTMLDivElement>(null);

  // ===============================================================
  // 6) Busy flag
  // ===============================================================
  const [busy, setBusy] = useState(false);

  // ===============================================================
  // 7) Handle input changes
  // ===============================================================
  function handleInputChange(index: number, value: string) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
  }

  // ===============================================================
  // handleGenerate() — deduplicated, API-driven version
  // ===============================================================
  // This function runs when the user clicks "Generate".
  // For each of the 9 slots:
  //   - If the user selected an item (we have a TMDb `id`), do an exact lookup.
  //   - Else if the user typed text, do a keyword search and take Top-1.
  // It then writes the *normalized* fields from our backend API
  // (`title`, `poster`, `rating`) directly into `movies[i]`.

  async function handleGenerate() {
    setBusy(true); // lock UI
    try {
      const next = [...movies];

      for (let i = 0; i < inputs.length; i++) {
        const q = safeTrim(inputs[i]);
        const sel = selected[i];

        try {
          let data: any = null;

          // CASE 1: Exact lookup by TMDb ID (most reliable)
          if (sel && sel.id) {
            const res = await fetch(`/api/search?id=${encodeURIComponent(String(sel.id))}`);
            if (res.ok) data = await res.json();
          }
          // CASE 2: Fallback — keyword search, take the first result
          else if (q) {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&single=1`);
            if (res.ok) data = await res.json();
          } else {
            // Neither selected nor typed — skip this slot
            continue;
          }

          if (!data) continue;

          // Write normalized fields directly from the API:
          next[i] = {
            title: data.title,
            poster: data.poster ?? null,
            rating: typeof data.rating === "number" ? data.rating : 0,
          };
        } catch (err) {
          // Per-slot failure should not break the whole loop
          console.error("Fetch failed for slot", i + 1, q, err);
        }
      }

      setMovies(next); // trigger re-render
    } finally {
      setBusy(false); // always release the busy flag
    }
  }

  // ============================================================================
  // handleExport()
  // ============================================================================
  // Export the current movie grid as a high-resolution PNG image.
  // See long-form notes below for CORS hardening and decode strategy.
  async function handleExport() {
    const node = gridRef.current;
    if (!node) return;

    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      alert("Export target has zero size — nothing to capture.");
      return;
    }

    setBusy(true);

    try {
      // Enforce CORS-safe decoding for all images inside the export node
      const imgs = Array.from(node.querySelectorAll("img"));
      imgs.forEach((img) => {
        if (!img.crossOrigin) img.crossOrigin = "anonymous";
        // ts-expect-error: some DOM typings omit referrerPolicy on HTMLImageElement
        if (!img.referrerPolicy) img.referrerPolicy = "no-referrer";
      });

      // Wait for all images to decode (fallback to transparent pixel on failure)
      await Promise.all(
        imgs.map((img) =>
          (img as any).decode
            ? img.decode().catch(() => {
                img.src = TRANSPARENT_PX;
              })
            : new Promise<void>((res) => {
                if (img.complete) return res();
                img.onload = () => res();
                img.onerror = () => {
                  img.src = TRANSPARENT_PX;
                  res();
                };
              })
        )
      );

      const htmlToImage = await import("html-to-image");
      let dataUrl: string;

      try {
        dataUrl = await htmlToImage.toPng(node, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#000000",
          skipFonts: true,
          imagePlaceholder: TRANSPARENT_PX,
        });
      } catch (err) {
        console.warn("[export] toPng failed — falling back to JPEG:", err);
        dataUrl = await htmlToImage.toJpeg(node, {
          pixelRatio: 2,
          cacheBust: true,
          backgroundColor: "#000000",
          skipFonts: true,
          imagePlaceholder: TRANSPARENT_PX,
          quality: 0.95,
        });
      }

      const a = document.createElement("a");
      const fileSafe =
        (typeof title === "string" ? title : "movie-grid")
          .trim()
          .replace(/[^\w\-]+/g, "_") || "movie-grid";
      a.href = dataUrl;
      a.download = `${fileSafe}.png`;
      a.click();
    } catch (e) {
      console.error("[export] Unhandled export error:", e);
      alert("Export failed — check browser console for details.");
    } finally {
      setBusy(false);
    }
  }

  /**
   * Convert TMDb rating (0–10) into 0–5 stars (rounded).
   * Pure presentation logic — keeps the data model (0–10) intact.
   */
  function starsFromRating(r: number) {
    return Math.round(r / 2);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-8">
      {/* ===== Control Header (NOT exported) ===== */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 mb-6">
        {/* Title input (editable heading above the grid) */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorites / 我的年度九佳影片)"
          className="
            w-full
            text-center
            text-4xl md:text-6xl
            font-extrabold
            bg-transparent
            outline-none
            border-b border-white/20
            pb-2
          "
        />

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="
              px-5 py-2
              rounded-2xl
              bg-emerald-500
              text-black font-extrabold
              shadow-[0_10px_30px_rgba(16,185,129,.35)]
              hover:bg-emerald-400
              active:translate-y-px
              disabled:opacity-60
            "
          >
            {busy ? "Working..." : "Generate"}
          </button>

          <button
            onClick={handleExport}
            disabled={busy}
            className="
              px-5 py-2
              rounded-2xl
              bg-white text-black
              font-extrabold
              shadow-[0_10px_30px_rgba(255,255,255,.2)]
              hover:bg-white/90
              active:translate-y-px
              disabled:opacity-60
            "
          >
            Export PNG
          </button>
        </div>
      </div>

      {/*
       * ===============================================================
       * UI: Inputs Area & Exportable Grid
       * ===============================================================
       * - Each input uses <SearchAutocomplete /> to query our /api/search.
       * - On selection, we store ONLY the TMDb `id` in `selected[]`.
       * - During "Generate", we call the API per slot (id lookup or top-1 search)
       *   and write the normalized data back to `movies[]`.
       */}

      {/* ===== Inputs Area ===== */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx}>
            {/* SearchAutocomplete (child) */}
            <SearchAutocomplete
              placeholder={`Movie ${idx + 1}`}
              onSelect={(movie) => {
                // Show a *pure title* (without trailing "(YYYY)") in the input
                const pure = movie.title.replace(/\s*\(\d{4}\)\s*$/, "");
                handleInputChange(idx, pure);

                // Persist ONLY the TMDb id; the rest is fetched from the API later
                setSelected((prev) => {
                  const next = [...prev];
                  next[idx] = { id: (movie as any).id };
                  return next;
                });
              }}
            />

            {/* Tiny hint under the input when the user typed something */}
            {safeTrim(inputs[idx]) && (
              <p className="mt-1 px-1 text-xs text-white/60">Selected: {inputs[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {/* ===== Exportable Grid ===== */}
      <div ref={gridRef} className="w-full max-w-5xl">
        {/* Grid title */}
        <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">{title}</h1>

        {/* 3×3 Poster Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {movies.map((m, idx) => {
            const stars = starsFromRating(m.rating);
            return (
              <div
                key={idx}
                className="
                  bg-neutral-900
                  rounded-2xl
                  overflow-hidden
                  shadow-lg
                  flex flex-col items-center p-4
                "
              >
                {/* Poster container */}
                <div className="w-full aspect-[2/3] bg-black flex items-center justify-center">
                  <img
                    // If `poster` is null, show a neutral placeholder constructed at render time.
                    src={
                      m.poster ??
                      `https://via.placeholder.com/300x450?text=${encodeURIComponent(m.title)}`
                    }
                    alt={m.title}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="max-w-[100%] max-h-[100%] object-contain"
                  />
                </div>

                {/* Movie meta */}
                <div className="mt-3 flex flex-col items-center justify-center text-center">
                  <p className="text-base font-extrabold leading-tight mb-1 break-words whitespace-normal">
                    {m.title}
                  </p>

                  <p className="text-white/70 text-xs mb-1">
                    {m.rating ? `TMDb: ${m.rating.toFixed(1)}/10` : "No rating"}
                  </p>

                  {/* Stars (0–5) */}
                  <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <svg
                        key={n}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        fill={n <= stars ? "#2DBD6E" : "gray"} // green if filled, gray if empty
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

        {/* TMDb disclaimer */}
        <p className="text-center text-xs text-white/40 mt-6">
          This product uses the TMDb API but is not endorsed by TMDb.
        </p>
      </div>
    </main>
  );
}

