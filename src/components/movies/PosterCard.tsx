"use client";
import React from "react";
import type { MovieCard } from "../../types";

function starsFromRating(r: number) {
    return Math.round(r / 2);
}

export default function PosterCard({ movie }: { movie: MovieCard }) {
    const stars = starsFromRating(movie.rating);
    return (
        <div className="bg-neutral-900 rounded-2xl overflow-hidden shadow-lg flex flex-col items-center p-4">
            <div className="w-full aspect-[2/3] bg-black flex items-center justify-center">
                <img
                    src={
                        movie.poster ??
                        `https://via.placeholder.com/300x450?text=${encodeURIComponent(movie.title)}`
                    }
                    alt={movie.title}
                    crossOrigin="anonymous"
                    referrerPolicy="no-referrer"
                    className="max-w-[100%] max-h-[100%] object-contain"
                />
            </div>

            <div className="mt-3 flex flex-col items-center justify-center text-center">
                <p className="text-base font-extrabold leading-tight mb-1 break-words whitespace-normal">
                    {movie.title}
                </p>
                <p className="text-white/70 text-xs mb-1">
                    {movie.rating ? `TMDb: ${movie.rating.toFixed(1)}/10` : "No rating"}
                </p>
                <div className="flex justify-center space-x-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                        <svg
                            key={n}
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill={n <= stars ? "#2DBD6E" : "gray"}
                            className="w-4 h-4"
                        >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.785.57-1.84-.197-1.54-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    ))}
                </div>
            </div>
        </div>
    );
}
