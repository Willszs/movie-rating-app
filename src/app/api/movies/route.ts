import { NextResponse } from "next/server";

// ====== TMDb API Credentials ======
// TMDb offers two types of authentication:
// - V3: traditional API key (passed via query parameter)
// - V4: modern Bearer token (passed via Authorization header)
const V3 = process.env.TMDB_API_KEY;
const V4 = process.env.TMDB_BEARER;

/**
 * Handles GET requests to /api/search
 *
 * Supported query parameters:
 *   - q: movie title (for keyword search)
 *   - id: TMDb movie ID (for exact movie lookup)
 *   - page: page number (default "1")
 *   - single: "1" means return only the first result object
 *
 * Example usage:
 *   /api/search?q=Inception&page=1
 *   /api/search?single=1&q=Joker
 *   /api/search?id=12345
 */
export async function GET(req: Request) {
  // Parse URL and query parameters
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");
  const page = searchParams.get("page") || "1";
  const single = searchParams.get("single") === "1";
  const id = searchParams.get("id"); // ✅ Added for exact lookup by TMDb movie ID

  // ====== Credential check ======
  if (!V3 && !V4) {
    // If neither API key nor Bearer token is available, abort early
    return NextResponse.json(
      { error: "Missing TMDB credentials (set TMDB_API_KEY or TMDB_BEARER in .env.local)" },
      { status: 500 }
    );
  }

  // ====== Exact movie lookup mode ======
  // Example: /api/search?id=550 → fetch details for TMDb movie ID 550 ("Fight Club")
  if (id) {
    const url = `https://api.themoviedb.org/3/movie/${encodeURIComponent(id)}?language=en-US`;

    // TMDb API requires Authorization header for V4 tokens
    const resp = await fetch(url, {
      headers: V4 ? { Authorization: `Bearer ${V4}` } : undefined,
      cache: "no-store", // Disable caching for up-to-date results
    });

    // Handle API errors
    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return NextResponse.json(
        { error: "TMDb movie lookup failed", status: resp.status, body: body.slice(0, 200) },
        { status: 502 }
      );
    }

    // Parse and format the movie object
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

    // Return a single object instead of a list
    return NextResponse.json(obj);
  }

  // ====== Keyword search mode ======
  // Example: /api/search?q=Inception&page=2
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Build TMDb search URL (V3 uses API key, V4 uses Bearer token)
  const url = V4
    ? `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`
    : `https://api.themoviedb.org/3/search/movie?api_key=${V3}&query=${encodeURIComponent(query)}&include_adult=false&language=en-US&page=${page}`;

  const resp = await fetch(url, {
    headers: V4 ? { Authorization: `Bearer ${V4}` } : undefined,
    cache: "no-store",
  });

  // Handle failed HTTP responses
  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    return NextResponse.json(
      { error: "TMDb search failed", status: resp.status, body: body.slice(0, 200) },
      { status: 502 }
    );
  }

  // ====== Format response results ======
  const data = await resp.json();

  // Map each movie to a simplified object
  const results = (data.results || [])
    .filter((r: any) => !!r.title) // Skip invalid entries
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

  // ====== Optional single-result mode ======
  // /api/search?q=Titanic&single=1 → returns only the top result
  if (single) {
    const first = results[0];
    if (!first) return NextResponse.json({ error: "No result" }, { status: 404 });
    return NextResponse.json(first);
  }

  // ====== Full paginated response ======
  return NextResponse.json({
    page: data.page ?? 1,
    total_pages: data.total_pages ?? 1,
    results,
  });
}









