// src/app/api/books/routes.ts
import { NextResponse } from "next/server";

// GET /api/books/routes?q=harry+potter&page=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const page = searchParams.get("page") ?? "1";
    if (!q) return NextResponse.json({ results: [] });

    // Open Library Search API（无需密钥）
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(q)}&page=${page}`
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] }, { status: res.status });
    }

    const data = await res.json();

    // 统一映射为 BookCard
    const results = (data.docs || []).slice(0, 20).map((d: any) => {
      const id = d.key as string;                         // e.g. "/works/OL12345W"
      const title = (d.title as string) ?? "Untitled";
      const authors = (d.author_name as string[]) ?? [];
      const year = (d.first_publish_year as number) ?? null;
      const cover = d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg`
        : null;
      const isbn = Array.isArray(d.isbn) ? d.isbn[0] : undefined;

      return { id, title, authors, year, cover, isbn };
    });

    return NextResponse.json({ results });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "search failed", results: [] },
      { status: 500 }
    );
  }
}
