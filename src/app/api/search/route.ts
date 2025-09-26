import { NextResponse } from "next/server";

// 支持两种方式：
// 1. V3 API Key:  短的32字符 key
// 2. V4 Token:   很长的一串 JWT (Bearer token)

const V3 = process.env.TMDB_API_KEY;
const V4 = process.env.TMDB_BEARER;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  if (!V3 && !V4) {
    return NextResponse.json(
      { error: "Missing TMDB credentials (set TMDB_API_KEY or TMDB_BEARER in .env.local)" },
      { status: 500 }
    );
  }

  // 构造 URL，不同鉴权方式有差异
  const url = V4
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(
        query
      )}&language=en-US`
    : `https://api.themoviedb.org/3/search/movie?api_key=${V3}&query=${encodeURIComponent(
        query
      )}&language=en-US`;

  // V4 需要 Authorization header，V3 不需要
  const resp = await fetch(url, {
    headers: V4 ? { Authorization: `Bearer ${V4}` } : undefined,
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "TMDb request failed", status: resp.status, body: body.slice(0, 200) },
      { status: 502 }
    );
  }

  const data = await resp.json();
  const result = data.results?.[0];
  if (!result) {
    return NextResponse.json({ error: "No result" }, { status: 404 });
  }

  return NextResponse.json({
    title: result.title,
    year: result.release_date?.slice(0, 4),
    poster: result.poster_path
      ? `https://image.tmdb.org/t/p/w500${result.poster_path}`
      : null,
    rating: result.vote_average, // 0–10
  });
}

