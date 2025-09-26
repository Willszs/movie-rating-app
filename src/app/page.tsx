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

  // fetch 9 movies
  async function handleGenerate() {
    setBusy(true);
    try {
      const next = [...movies];

      for (let i = 0; i < inputs.length; i++) {
        const q = safeTrim(inputs[i]); // ← avoid `.trim()` on undefined
        if (!q) continue;

        try {
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
          if (!res.ok) {
            console.warn("No result for:", q);
            continue;
          }
          const data = await res.json();

          next[i] = {
            title: `${data.title ?? q}${data.year ? ` (${data.year})` : ""}`,
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



  // export as PNG (hardened)
  async function handleExport() {
    const node = gridRef.current;
    if (!node) return;

    // 可选：防御容器尺寸为 0 的情况
    const box = node.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      alert("Export target has zero size.");
      return;
    }

    setBusy(true);
    try {
      // 1) 规范所有图片的跨域属性 + 预加载
      const imgs = Array.from(node.querySelectorAll("img"));
      imgs.forEach((img) => {
        if (!img.crossOrigin) img.crossOrigin = "anonymous";
        // ts-expect-error firefox/ts 不识别也没关系
        if (!img.referrerPolicy) img.referrerPolicy = "no-referrer";
      });

      // 等待图片加载；失败则替换为透明像素，避免导出中断
      await Promise.all(
        imgs.map((img) =>
          // decode 更准确；不支持时退回 onload
          (img as any).decode
            ? img
              .decode()
              .catch(() => {
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

      // 2) 执行导出（带占位、跳过字体）
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

      // 3) 下载
      const a = document.createElement("a");
      const fileSafe =
        (typeof title === "string" ? title : "movie-grid")
          .trim()
          .replace(/[^\w\-]+/g, "_") || "movie-grid";
      a.href = dataUrl;
      a.download = `${fileSafe}.png`;
      a.click();
    } catch (e) {
      console.error("[export] failed:", e, typeof e, e && (e as any).message);
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
        {/* Big title editor */}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Your Title (e.g., 2024 Favorites / 我的年度九佳影片)"
          className="w-full text-center text-4xl md:text-6xl font-extrabold bg-transparent outline-none border-b border-white/20 pb-2"
        />

        {/* Buttons */}
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

      {/* ===== Inputs Area ===== */}
      <div className="w-full max-w-5xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 9 }).map((_, idx) => (
          <div key={idx}>
            <SearchAutocomplete
              placeholder={`Movie ${idx + 1}`}
              onSelect={(movie) => {
                handleInputChange(idx, movie.title);
                // （可选）立即更新该格卡片
                // setMovies((prev) => {
                //   const next = [...prev];
                //   next[idx] = {
                //     title: movie.title,
                //     poster:
                //       movie.poster_url ??
                //       `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`,
                //     rating: 0,
                //   };
                //   return next;
                // });
              }}
            />
            {safeTrim(inputs[idx]) && (
              <p className="mt-1 px-1 text-xs text-white/60">
                Selected: {inputs[idx]}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* ===== Exportable Grid ===== */}
      <div ref={gridRef} className="w-full max-w-5xl">
        {/* Big display title */}
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
                className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center p-4"
              >
                {/* 海报（70%缩放，保持完整） */}
                <div className="w-full aspect-[2/3] bg-black flex items-center justify-center">
                  <img
                    src={m.poster}
                    alt={m.title}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="max-w-[100%] max-h-[100%] object-contain"
                  />
                </div>

                {/* 信息区 */}
                <div className="mt-3 flex flex-col items-center justify-center text-center">
                  <p className="text-base font-extrabold leading-tight mb-1 break-words whitespace-normal">
                    {m.title}
                  </p>

                  <p className="text-white/70 text-xs mb-1">
                    {m.rating ? `TMDb: ${m.rating.toFixed(1)}/10` : "No rating"}
                  </p>

                  {/* 星级 */}
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

        {/* TMDb attribution */}
        <p className="text-center text-xs text-white/40 mt-6">
          This product uses the TMDb API but is not endorsed by TMDb.
        </p>
      </div>
    </main>
  );
}

