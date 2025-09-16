import { NextResponse } from "next/server";

// GET /api/search?q=MovieName
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const apiKey = process.env.TMDB_API_KEY;
  const resp = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
      query
    )}&language=en-US`
  );
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
    rating: result.vote_average, // 0–10, e.g., 8.4
  });
}
