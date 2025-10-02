"use client";

/**
 * Annual Movie Grid – Page
 */

import { useRef, useState } from "react";
import SearchAutocomplete from "@/components/SearchAutocomplete";

const TRANSPARENT_PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBgEAf0cpmQAAAABJRU5ErkJggg==";

type MovieCard = {
  title: string;   // Display title
  poster: string;  // Poster URL
  rating: number;  // TMDb vote_average (0–10)
};

// ---- helpers: safe string handling ----
const safeTrim = (v: unknown) =>
  typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

// 记录用户实际选中的电影（带 ID）
type Selected = { id: number | string; title: string; poster: string | null; rating: number };

export default function Home() {
  // 9 placeholders
  const [movies, setMovies] = useState<MovieCard[]>(
    Array.from({ length: 9 }, (_, i) => ({
      title: `Movie ${i + 1}`,
      poster: `https://via.placeholder.com/300x450?text=Movie+${i + 1}`,
      rating: 0,
    }))
  );

  // 9 inputs
  const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));

  // 9 个已选电影（含 id）
  const [selected, setSelected] = useState<(Selected | null)[]>(Array(9).fill(null));

  // big title
  const [title, setTitle] = useState("2024 Favorites");

  // export target
  const gridRef = useRef<HTMLDivElement>(null);

  // busy flag
  const [busy, setBusy] = useState(false);

  function handleInputChange(index: number, value: string) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
  }

  // fetch 9 movies —— ✅ 已改为优先按 ID 精确查
  async function handleGenerate() {
    setBusy(true);
    try {
      const next = [...movies];

      for (let i = 0; i < inputs.length; i++) {
        const q = safeTrim(inputs[i]);
        const sel = selected[i]; // 用户是否点过下拉候选

        try {
          let data: any = null;

          if (sel?.id) {
            // 精确：用 TMDb ID 查
            const res = await fetch(`/api/search?id=${encodeURIComponent(String(sel.id))}`);
            if (res.ok) data = await res.json();
          } else if (q) {
            // 兜底：没选下拉，只输入文字 → 取第一条
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&single=1`);
            if (res.ok) data = await res.json();
          }

          if (!data) {
            if (!q) continue;
            console.warn("No data for slot", i + 1, q, sel);
            continue;
          }

          const title = (data.title ?? sel?.title ?? q) as string;
          const poster =
            data.poster ??
            sel?.poster ??
            (data.poster_path ? `https://image.tmdb.org/t/p/w342${data.poster_path}` : null);
          const rating =
            typeof data.rating === "number"
              ? data.rating
              : typeof data.vote_average === "number"
              ? data.vote_average
              : (sel?.rating ?? 0);

          next[i] = {
            title,
            poster:
              poster ??
              `https://via.placeholder.com/300x450?text=${encodeURIComponent(title)}`,
            rating,
          };
        } catch (err) {
          console.error("Fetch failed for slot", i + 1, q, err);
        }
      }

      setMovies(next);
    } finally {
      setBusy(false);
    }
  }

  // export as PNG (原样保留)
  async function handleExport() {
    const node = gridRef.current;
    if (!node) return;

    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      alert("Export target has zero size.");
      return;
    }

    setBusy(true);
    try {
      const imgs = Array.from(node.querySelectorAll("img"));
      imgs.forEach((img) => {
        if (!img.crossOrigin) img.crossOrigin = "anonymous";
        // ts-expect-error
        if (!img.referrerPolicy) img.referrerPolicy = "no-referrer";
      });

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
        console.warn("[export] toPng failed, fallback toJpeg:", err);
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
      console.error("[export] failed:", e);
      alert("Export failed. See console for details.");
    } finally {
      setBusy(false);
    }
  }

  /** Convert TMDb rating (0–10) into 0–5 stars (rounded) */
  function starsFromRating(r: number) {
    return Math.round(r / 2);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-8">
      {/* ===== Control Header (NOT exported) ===== */}
      <div className="w-full max-w-5xl flex flex-col items-center gap-4 mb-6">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorites / 我的年度九佳影片)"
          className="w-full text-center text-4xl md:text-6xl font-extrabold bg-transparent outline-none border-b border-white/20 pb-2"
        />

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleGenerate}
            disabled={busy}
            className="px-5 py-2 rounded-2xl bg-emerald-500 text-black font-extrabold shadow-[0_10px_30px_rgba(16,185,129,.35)] hover:bg-emerald-400 active:translate-y-px disabled:opacity-60"
          >
            {busy ? "Working..." : "Generate"}
          </button>

          <button
            onClick={handleExport}
            disabled={busy}
            className="px-5 py-2 rounded-2xl bg-white text-black font-extrabold shadow-[0_10px_30px_rgba(255,255,255,.2)] hover:bg-white/90 active:translate-y-px disabled:opacity-60"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* ===== Inputs Area ===== */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx}>
            <SearchAutocomplete
              placeholder={`Movie ${idx + 1}`}
              onSelect={(movie) => {
                // 输入框写回纯标题（去掉年份）
                const pure = movie.title.replace(/\s*\(\d{4}\)\s*$/, "");
                handleInputChange(idx, pure);

                // 记录选中的完整对象（带 id）
                setSelected((prev) => {
                  const next = [...prev];
                  next[idx] = {
                    id: (movie as any).id,
                    title: movie.title,
                    poster: (movie as any).poster ?? null,
                    rating: typeof (movie as any).rating === "number" ? (movie as any).rating : 0,
                  };
                  return next;
                });
              }}
            />
            {safeTrim(inputs[idx]) && (
              <p className="mt-1 px-1 text-xs text-white/60">Selected: {inputs[idx]}</p>
            )}
          </div>
        ))}
      </div>

      {/* ===== Exportable Grid ===== */}
      <div ref={gridRef} className="w-full max-w-5xl">
        <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">{title}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {movies.map((m, idx) => {
            const stars = starsFromRating(m.rating);
            return (
              <div
                key={idx}
                className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center p-4"
              >
                <div className="w-full aspect-[2/3] bg-black flex items-center justify-center">
                  <img
                    src={m.poster}
                    alt={m.title}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="max-w-[100%] max-h-[100%] object-contain"
                  />
                </div>

                <div className="mt-3 flex flex-col items-center justify-center text-center">
                  <p className="text-base font-extrabold leading-tight mb-1 break-words whitespace-normal">
                    {m.title}
                  </p>
                  <p className="text-white/70 text-xs mb-1">
                    {m.rating ? `TMDb: ${m.rating.toFixed(1)}/10` : "No rating"}
                  </p>
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

        <p className="text-center text-xs text-white/40 mt-6">
          This product uses the TMDb API but is not endorsed by TMDb.
        </p>
      </div>
    </main>
  );
}
