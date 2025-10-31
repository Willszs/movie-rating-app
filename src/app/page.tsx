"use client";
import React, { useState } from "react";
import MovieGrid from "../components/movies/MovieGrid";
import MusicPanel from "../components/music/MusicPanel";
import BooksPanel from "../components/books/BooksPanel";
import BottomTabs from "../components/BottomTabs";

type TabKey = "movies" | "music" | "books";

export default function Home() {
  const [tab, setTab] = useState<TabKey>("movies");

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center p-6 pb-20">
      {tab === "movies" && <MovieGrid />}
      {tab === "music" && <MusicPanel />}
      {tab === "books" && <BooksPanel />}
      <BottomTabs active={tab} onChange={setTab} />
    </main>
  );
}

