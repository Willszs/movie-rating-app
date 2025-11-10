// app/api/music/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const limit = Number(url.searchParams.get("limit") || "20");
  if (!q) return NextResponse.json({ ok: false, error: "Missing q" }, { status: 400 });

  const itunes = new URL("https://itunes.apple.com/search");
  itunes.searchParams.set("term", q);
  itunes.searchParams.set("entity", "album");
  itunes.searchParams.set("limit", String(limit));

  const r = await fetch(itunes.toString(), { cache: "no-store" });
  if (!r.ok) return NextResponse.json({ ok: false, error: "iTunes search failed" }, { status: 502 });

  const data = await r.json();
  const items = (data.results || []).map((it: any) => {
    const cover100 = it.artworkUrl100 as string | undefined;
    const cover = cover100 ? cover100.replace(/\/\d+x\d+bb\./, "/1000x1000bb.") : null;
    return {
      id: String(it.collectionId),
      title: it.collectionName || "",
      artist: it.artistName || "",
      year: it.releaseDate ? new Date(it.releaseDate).getFullYear() : undefined,
      cover,
      url: it.collectionViewUrl,
    };
  });

  return NextResponse.json({ ok: true, items });
}