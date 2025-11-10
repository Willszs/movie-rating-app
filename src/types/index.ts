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

export type BookCard = {
  id: string;
  title: string;
  authors?: string[];
  cover: string | null;
  year?: number;
  isbn?: string;
};



export type Selected = { id: number | string } | null;