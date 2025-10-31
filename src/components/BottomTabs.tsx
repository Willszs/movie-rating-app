"use client";
import React from "react";
import { Film, Music, Book } from "lucide-react";

type TabKey = "movies" | "music" | "books";

export default function BottomTabs({
    active,
    onChange,
}: {
    active: TabKey;
    onChange: (k: TabKey) => void;
}) {
    const base =
        "flex-1 flex flex-col items-center justify-center gap-1 py-2 text-xs font-semibold";
    const activeCls = "text-emerald-400";
    const idleCls = "text-white/60 hover:text-white";

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-neutral-900/90 backdrop-blur border-t border-white/10">
            <div className="mx-auto max-w-5xl grid grid-cols-3">
                <button
                    className={`${base} ${active === "movies" ? activeCls : idleCls}`}
                    onClick={() => onChange("movies")}
                >
                    <Film className="w-5 h-5" />
                    <span>Movies</span>
                </button>
                <button
                    className={`${base} ${active === "music" ? activeCls : idleCls}`}
                    onClick={() => onChange("music")}
                >
                    <Music className="w-5 h-5" />
                    <span>Music</span>
                </button>
                <button
                    className={`${base} ${active === "books" ? activeCls : idleCls}`}
                    onClick={() => onChange("books")}
                >
                    <Book className="w-5 h-5" />
                    <span>Books</span>
                </button>
            </div>
        </nav>
    );
}