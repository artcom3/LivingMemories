"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CreationPreviewModal, { CreationData } from "@/components/CreationPreviewModal";

const CATEGORIES = [
  {
    id: "song",
    title: "Songs",
    icon: "🎵",
    path: "/create/song",
    description: "Compose emotional songs and acoustic melodies based on your favorite memories.",
    color: "from-blue-600 to-indigo-600",
  },
  {
    id: "video",
    title: "Videos",
    icon: "🎬",
    path: "/create/video",
    description: "Generate cinematic montages and nostalgic short films from your photos & videos.",
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "comic",
    title: "Comics",
    icon: "📚",
    path: "/create/comic",
    description: "Turn your family stories and adventures into illustrated comic book strips.",
    color: "from-amber-500 to-orange-600",
  },
  {
    id: "manga",
    title: "Mangas",
    icon: "📖",
    path: "/create/manga",
    description: "Transform your photos into Japanese manga pages with stylized panels and dialogue.",
    color: "from-emerald-500 to-teal-600",
  },
];

export default function HomePage() {
  const [creations, setCreations] = useState<CreationData[]>([]);
  const [loadingCreations, setLoadingCreations] = useState(true);
  const [selectedCreation, setSelectedCreation] = useState<CreationData | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  const fetchCreations = async () => {
    try {
      const res = await fetch("/api/creations");
      const data = await res.json();
      if (data.creations) {
        setCreations(data.creations);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCreations(false);
    }
  };

  useEffect(() => {
    fetchCreations();
  }, []);

  const handleDeleteCreation = async (id: string, title: string) => {
    if (!confirm(`Delete creation "${title}"?`)) return;

    try {
      const res = await fetch(`/api/creations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCreations((prev) => prev.filter((c) => c.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const scrollToCreations = () => {
    const el = document.getElementById("creations");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const filteredCreations = creations.filter((c) => {
    if (filterType === "ALL") return true;
    return c.type === filterType;
  });

  return (
    <div className="w-full">
      {/* Hero & Category Selector Section */}
      <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 text-center flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 mb-6">
          <span>✨ AI-Powered Memory Synthesis</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white max-w-3xl leading-tight">
          Turn your life memories into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">Living Art</span>
        </h1>

        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          Select a creative format below, pick photos from your albums with rich memory context, and let AI transform them into songs, stories, and videos.
        </p>

        {/* 4 Primary Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mt-12 text-left">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={cat.path}
              className="group relative p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
            >
              <div>
                <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </div>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {cat.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                  {cat.description}
                </p>
              </div>

              <div className="mt-6 flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                <span>Create {cat.title}</span>
                <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Jump Button to My Creations */}
        <div className="mt-16 flex flex-col items-center">
          <button
            onClick={scrollToCreations}
            className="group flex flex-col items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
          >
            <span className="mb-2">View Your Library of Art</span>
            <div className="w-10 h-10 rounded-full border border-zinc-300 dark:border-zinc-700 flex items-center justify-center group-hover:border-zinc-500 group-hover:translate-y-1 transition-all bg-white dark:bg-zinc-900 shadow-sm">
              <span className="text-base">&darr;</span>
            </div>
          </button>
        </div>
      </section>

      {/* "My Creations" Section */}
      <section
        id="creations"
        className="w-full bg-zinc-100/70 dark:bg-zinc-900/40 border-t border-zinc-200 dark:border-zinc-800 py-16"
      >
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">My Creations</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                All generated songs, videos, comics, and mangas saved to your collection.
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {["ALL", "SONG", "VIDEO", "COMIC", "MANGA"].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterType(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterType === f
                      ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-sm"
                      : "bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50"
                  }`}
                >
                  {f === "ALL" ? "All Formats" : f.toLowerCase() + "s"}
                </button>
              ))}
            </div>
          </div>

          {/* Creations Grid */}
          {loadingCreations ? (
            <div className="py-20 text-center text-zinc-400 text-sm">Loading creations...</div>
          ) : filteredCreations.length === 0 ? (
            <div className="py-20 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8 bg-white dark:bg-zinc-900/50">
              <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
                No creations yet
              </p>
              <p className="text-sm text-zinc-400 mt-1 mb-6">
                Pick a format above (Songs, Videos, Comics, Mangas) to generate your first piece.
              </p>
              <div className="flex justify-center gap-3">
                <Link
                  href="/create/song"
                  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Create a Song
                </Link>
                <Link
                  href="/create/video"
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
                >
                  Create a Video
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredCreations.map((creation) => (
                <div
                  key={creation.id}
                  className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                >
                  {/* Media Cover Box */}
                  <div
                    onClick={() => setSelectedCreation(creation)}
                    className="aspect-[4/3] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden cursor-pointer group-hover:opacity-95 transition"
                  >
                    {creation.coverUrl ? (
                      <img
                        src={creation.coverUrl}
                        alt={creation.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs font-mono">
                        {creation.type}
                      </div>
                    )}

                    {/* Play / Inspect overlay icon */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-white/90 text-black flex items-center justify-center shadow-lg font-bold">
                        {creation.type === "SONG" ? "▶" : creation.type === "VIDEO" ? "▶" : "📖"}
                      </div>
                    </div>

                    {/* Type Badge */}
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/70 text-white backdrop-blur-sm">
                      {creation.type}
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h3
                        onClick={() => setSelectedCreation(creation)}
                        className="font-bold text-sm text-zinc-900 dark:text-white line-clamp-1 cursor-pointer hover:text-indigo-600"
                      >
                        {creation.title}
                      </h3>
                      {creation.genreOrStyle && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {creation.genreOrStyle}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 text-[11px]">
                        {new Date(creation.createdAt).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleDeleteCreation(creation.id, creation.title)}
                          className="text-zinc-400 hover:text-red-500 transition-colors"
                          title="Delete creation"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => setSelectedCreation(creation)}
                          className="font-semibold text-indigo-600 hover:text-indigo-700"
                        >
                          Preview &rarr;
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Universal Modal Player / Viewer */}
      {selectedCreation && (
        <CreationPreviewModal
          creation={selectedCreation}
          onClose={() => setSelectedCreation(null)}
        />
      )}
    </div>
  );
}
