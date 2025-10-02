import { NextResponse } from "next/server";

const V3 = process.env.TMDB_API_KEY;
const V4 = process.env.TMDB_BEARER;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const page = searchParams.get("page") || "1";
  const single = searchParams.get("single") === "1";
  const id = searchParams.get("id"); // ✅ 新增：按 TMDb 电影 ID 精确查

  if (!V3 && !V4) {
    return NextResponse.json(
      { error: "Missing TMDB credentials (set TMDB_API_KEY or TMDB_BEARER in .env.local)" },
      { status: 500 }
    );
  }

  // ====== 精确查询：/api/search?id=12345 ======
  if (id) {
    const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?language=en-US`;
    const resp = await fetch(url, {
      headers: V4 ? { Authorization: `Bearer ${V4}` } : undefined,
      cache: "no-store",
    });
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: "TMDb movie lookup failed", status: resp.status, body: body.slice(0, 200) },
        { status: 502 }
      );
    }
    const r = await resp.json();
    const year = r.release_date ? r.release_date.slice(0, 4) : "";
    const obj = {
      id: r.id,
      title: year ? `${r.title} (${year})` : r.title,
      year,
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
      rating: typeof r.vote_average === "number" ? r.vote_average : 0,
      release_date: r.release_date ?? null,
      poster_path: r.poster_path ?? null,
      vote_average: r.vote_average ?? null,
    };
    return NextResponse.json(obj); // 精确返回单对象
  }

  // ====== 关键词搜索：/api/search?q=xxx[&single=1] ======
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const url = V4
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`
    : `https://api.themoviedb.org/3/search/movie?api_key=${V3}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`;

  const resp = await fetch(url, {
    headers: V4 ? { Authorization: `Bearer ${V4}` } : undefined,
    cache: "no-store",
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "TMDb search failed", status: resp.status, body: body.slice(0, 200) },
      { status: 502 }
    );
  }

  const data = await resp.json();

  const results = (data.results || [])
    .filter((r: any) => !!r.title)
    .map((r: any) => {
      const year = r.release_date ? r.release_date.slice(0, 4) : "";
      return {
        id: r.id,
        title: year ? `${r.title} (${year})` : r.title,
        year,
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w342${r.poster_path}` : null,
        rating: typeof r.vote_average === "number" ? r.vote_average : 0,
        release_date: r.release_date ?? null,
        poster_path: r.poster_path ?? null,
        vote_average: r.vote_average ?? null,
      };
    });

  if (single) {
    const first = results[0];
    if (!first) return NextResponse.json({ error: "No result" }, { status: 404 });
    return NextResponse.json(first);
  }

  return NextResponse.json({
    page: data.page ?? 1,
    total_pages: data.total_pages ?? 1,
    results,
  });
}








