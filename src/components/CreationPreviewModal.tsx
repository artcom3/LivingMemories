"use client";

import { useState } from "react";

export interface CreationData {
  id: string;
  type: "SONG" | "VIDEO" | "COMIC" | "MANGA" | "BOOK";
  title: string;
  status: string;
  prompt: string | null;
  genreOrStyle: string | null;
  resultUrl: string | null;
  coverUrl: string | null;
  waveformJson: string | null;
  pagesJson: string | null;
  metadataJson: string | null;
  createdAt: string;
}

export default function CreationPreviewModal({
  creation,
  onClose,
}: {
  creation: CreationData;
  onClose: () => void;
}) {
  const [currentPage, setCurrentPage] = useState(0);

  // Parse pages if Comic / Manga
  let pages: string[] = [];
  if (creation.pagesJson) {
    try {
      pages = JSON.parse(creation.pagesJson);
    } catch {
      pages = creation.resultUrl ? [creation.resultUrl] : [];
    }
  } else if (creation.resultUrl) {
    pages = [creation.resultUrl];
  }

  // Parse waveform if audio
  let waveformBars: number[] = [];
  if (creation.waveformJson) {
    try {
      waveformBars = JSON.parse(creation.waveformJson);
    } catch {
      waveformBars = Array.from({ length: 48 }, () => 30);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md transition-all">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                {creation.type}
              </span>
              {creation.genreOrStyle && (
                <span className="text-xs text-zinc-400 font-medium">
                  {creation.genreOrStyle}
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-white mt-1">{creation.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition text-lg"
          >
            ✕
          </button>
        </div>

        {/* Content Body Based on Type */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center bg-black/40">
          {creation.type === "VIDEO" && (
            <div className="w-full max-w-2xl aspect-video rounded-xl overflow-hidden bg-black shadow-lg">
              {creation.resultUrl ? (
                <video
                  src={creation.resultUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-500">
                  Video preview not available
                </div>
              )}
            </div>
          )}

          {creation.type === "SONG" && (
            <div className="w-full max-w-lg p-6 bg-zinc-900/80 border border-zinc-800 rounded-2xl flex flex-col items-center text-center space-y-6">
              {creation.coverUrl && (
                <img
                  src={creation.coverUrl}
                  alt={creation.title}
                  className="w-48 h-48 rounded-xl object-cover shadow-2xl border border-zinc-700"
                />
              )}

              {/* Dynamic Waveform Spectrum Visualization */}
              <div className="w-full flex items-end justify-center gap-1 h-20 px-4 py-2 bg-zinc-950 rounded-xl border border-zinc-800">
                {waveformBars.map((height, i) => (
                  <div
                    key={i}
                    style={{ height: `${height}%` }}
                    className="w-1.5 rounded-full bg-gradient-to-t from-indigo-500 to-pink-500 opacity-80 animate-pulse"
                  />
                ))}
              </div>

              {/* Audio Controls */}
              {creation.resultUrl && (
                <audio
                  src={creation.resultUrl}
                  controls
                  autoPlay
                  className="w-full"
                />
              )}
            </div>
          )}

          {(creation.type === "COMIC" || creation.type === "MANGA" || creation.type === "BOOK") && (
            <div className="w-full flex flex-col items-center space-y-4">
              <div className="relative max-h-[60vh] rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900">
                {pages.length > 0 ? (
                  <img
                    src={pages[currentPage] || pages[0]}
                    alt={`Page ${currentPage + 1}`}
                    className="max-h-[60vh] w-auto object-contain"
                  />
                ) : (
                  <div className="p-20 text-zinc-500">No pages generated yet</div>
                )}
              </div>

              {/* Page Controls */}
              {pages.length > 1 && (
                <div className="flex items-center gap-4 bg-zinc-900/90 px-4 py-2 rounded-full border border-zinc-800 text-sm">
                  <button
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30"
                  >
                    &larr; Prev
                  </button>
                  <span className="text-zinc-400 font-mono text-xs">
                    Page {currentPage + 1} of {pages.length}
                  </span>
                  <button
                    disabled={currentPage >= pages.length - 1}
                    onClick={() => setCurrentPage((p) => Math.min(pages.length - 1, p + 1))}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-white disabled:opacity-30"
                  >
                    Next &rarr;
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Prompt/Story context details */}
          {creation.prompt && (
            <div className="mt-6 w-full max-w-2xl p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 text-left">
              <p className="text-xs uppercase font-semibold text-zinc-500 tracking-wider mb-1">
                Story Prompt & Context
              </p>
              <p className="text-xs text-zinc-300 leading-relaxed italic">
                "{creation.prompt}"
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
          >
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
}
