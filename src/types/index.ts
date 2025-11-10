export type MovieCard = {
    title: string;
    poster: string | null;
    rating: number; // TMDb 0–10
};

export type AlbumCard = {
  title: string;
  artist?: string;
  cover: string | null;
  year?: number;
};


export type Selected = { id: number | string } | null;