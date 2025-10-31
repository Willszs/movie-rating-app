"use client";
import React, { useRef, useState } from "react";
import SearchAutocomplete from "../SearchAutocomplete"; // ← 直接用你现有的电影搜索
import PosterCard from "./PosterCard";
import { useExportImage } from "../../hooks/useExportImage";
import type { MovieCard, Selected } from "../../types";

const safeTrim = (v: unknown) =>
    typeof v === "string" ? v.trim() : v == null ? "" : String(v).trim();

export default function MovieGrid() {
    const [movies, setMovies] = useState<MovieCard[]>(
        Array.from({ length: 9 }, (_, i) => ({
            title: `Movie ${i + 1}`,
            poster: null,
            rating: 0,
        }))
    );
    const [inputs, setInputs] = useState<string[]>(Array(9).fill(""));
    const [selected, setSelected] = useState<Selected[]>(Array(9).fill(null));
    const [title, setTitle] = useState("2024 Favorites");

    const gridRef = useRef<HTMLDivElement>(null);
    const { busy, exportNodeAsImage } = useExportImage();

    function handleInputChange(index: number, value: string) {
        const next = [...inputs];
        next[index] = value;
        setInputs(next);
    }

    // 点击 Generate：按“选中 id 或关键词 Top-1”从 /api/search 拉取并写入 9 格
    async function handleGenerate() {
        try {
            const next = [...movies];
            for (let i = 0; i < inputs.length; i++) {
                const q = safeTrim(inputs[i]);
                const sel = selected[i];
                try {
                    let data: any = null;
                    if (sel && sel.id) {
                        const res = await fetch(`/api/search?id=${encodeURIComponent(String(sel.id))}`);
                        if (res.ok) data = await res.json();
                    } else if (q) {
                        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&single=1`);
                        if (res.ok) data = await res.json();
                    } else {
                        continue;
                    }
                    if (!data) continue;
                    next[i] = {
                        title: data.title,
                        poster: data.poster ?? null,
                        rating: typeof data.rating === "number" ? data.rating : 0,
                    };
                } catch (err) {
                    console.error("Fetch failed for slot", i + 1, q, err);
                }
            }
            setMovies(next);
        } finally {
            // busy 仅由导出钩子控制，这里不处理
        }
    }

    return (
        <div className="w-full max-w-5xl mx-auto">
            {/* 标题 + 按钮 */}
            <div className="w-full flex flex-col items-center gap-4 mb-6">
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Your Title (e.g., 2024 Favorites / 我的年度九佳影片)"
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

            {/* 9 个搜索框 */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-8">
                {Array.from({ length: 9 }).map((_, idx) => (
                    <div key={idx}>
                        <SearchAutocomplete
                            placeholder={`Movie ${idx + 1}`}
                            onSelect={(movie) => {
                                const pure = movie.title.replace(/\s*\(\d{4}\)\s*$/, "");
                                const nextInputs = [...inputs];
                                nextInputs[idx] = pure;
                                setInputs(nextInputs);
                                setSelected((prev) => {
                                    const next = [...prev];
                                    next[idx] = { id: movie.id };
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

            {/* 可导出的 3×3 海报网格 */}
            <div ref={gridRef}>
                <h1 className="text-center text-5xl md:text-7xl font-extrabold mb-6">{title}</h1>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {movies.map((m, idx) => (
                        <PosterCard key={idx} movie={m} />
                    ))}
                </div>
                <p className="text-center text-xs text-white/40 mt-6">
                    This product uses the TMDb API but is not endorsed by TMDb.
                </p>
            </div>
        </div>
    );
}
