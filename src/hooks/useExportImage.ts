"use client";
import { useState } from "react";

const TRANSPARENT_PX =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2NgYGD4DwABBgEAf0cpmQAAAABJRU5ErkJggg==";

export function useExportImage() {
    const [busy, setBusy] = useState(false);

    async function exportNodeAsImage(node: HTMLElement | null, title: string) {
        if (!node) return;

        const box = node.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) {
            alert("Export target has zero size — nothing to capture.");
            return;
        }

        setBusy(true);
        try {
            const imgs = Array.from(node.querySelectorAll("img"));
            imgs.forEach((img) => {
                if (!img.crossOrigin) img.crossOrigin = "anonymous";
                // ts-expect-error: some DOM typings omit referrerPolicy
                if (!img.referrerPolicy) img.referrerPolicy = "no-referrer";
            });

            await Promise.all(
                imgs.map((img) =>
                    (img as any).decode
                        ? (img as any).decode().catch(() => {
                            img.src = TRANSPARENT_PX;
                        })
                        : new Promise<void>((res) => {
                            if (img.complete) return res();
                            img.onload = () => res();
                            img.onerror = () => {
                                img.src = TRANSPARENT_PX;
                                res();
                            };
                        })
                )
            );

            const htmlToImage = await import("html-to-image");
            let dataUrl: string;

            try {
                dataUrl = await htmlToImage.toPng(node, {
                    pixelRatio: 2,
                    cacheBust: true,
                    backgroundColor: "#000000",
                    skipFonts: true,
                    imagePlaceholder: TRANSPARENT_PX,
                });
            } catch (err) {
                console.warn("[export] toPng failed — falling back to JPEG:", err);
                dataUrl = await htmlToImage.toJpeg(node, {
                    pixelRatio: 2,
                    cacheBust: true,
                    backgroundColor: "#000000",
                    skipFonts: true,
                    imagePlaceholder: TRANSPARENT_PX,
                    quality: 0.95,
                });
            }

            const a = document.createElement("a");
            const fileSafe =
                (typeof title === "string" ? title : "movie-grid")
                    .trim()
                    .replace(/[^\w\-]+/g, "_") || "movie-grid";
            a.href = dataUrl;
            a.download = `${fileSafe}.png`;
            a.click();
        } finally {
            setBusy(false);
        }
    }

    return { busy, exportNodeAsImage };
}
