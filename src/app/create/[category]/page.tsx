"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CreationPreviewModal, { CreationData } from "@/components/CreationPreviewModal";

interface MediaAsset {
  id: string;
  fileUrl: string;
  originalName: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  contextStatus: "NO_CONTEXT" | "CONTEXT_ADDED";
  contextDescription: string | null;
  peopleTags: string | null;
  locationTag: string | null;
  emotionTag: string | null;
}

interface AlbumData {
  id: string;
  name: string;
  assets: MediaAsset[];
}

const CATEGORY_CONFIG: Record<
  string,
  {
    type: "SONG" | "VIDEO" | "COMIC" | "MANGA";
    title: string;
    icon: string;
    description: string;
    genres: string[];
    defaultTitle: string;
    defaultPrompt: string;
  }
> = {
  song: {
    type: "SONG",
    title: "Compose a Song",
    icon: "🎵",
    description: "Generate emotional melodies and lyrics capturing the essence of your memories.",
    genres: ["Acoustic Ballad", "Lo-Fi Nostalgia", "Cinematic Orchestral", "Indie Folk", "Warm Ambient"],
    defaultTitle: "A Melody of Yesterday",
    defaultPrompt: "A heartwarming acoustic song reflecting on family gatherings and nostalgia.",
  },
  video: {
    type: "VIDEO",
    title: "Produce a Video",
    icon: "🎬",
    description: "Stitch and animate your photos and clips into a cohesive cinematic memory short.",
    genres: ["Cinematic Montage", "Vintage 8mm Film", "Documentary Narrative", "Dreamy Memory Reel"],
    defaultTitle: "Memories in Motion",
    defaultPrompt: "Dynamic cuts focusing on joyful smiles, warm sunlight, and shared laughter.",
  },
  comic: {
    type: "COMIC",
    title: "Generate a Comic",
    icon: "📚",
    description: "Turn your family anecdotes into an illustrated multi-panel comic book adventure.",
    genres: ["Classic Comic Strip", "Graphic Novel", "Sunday Paper Cartoon", "Indie Pop Art"],
    defaultTitle: "The Great Weekend Adventure",
    defaultPrompt: "Humorous panels telling the story of an unexpected family roadtrip mishap.",
  },
  manga: {
    type: "MANGA",
    title: "Create a Manga",
    icon: "📖",
    description: "Transform your moments into Japanese manga pages with stylized screentones.",
    genres: ["Slice of Life", "Shonen Emotion", "Seinen Drama", "Atmospheric Monochrome"],
    defaultTitle: "Chapters of Us",
    defaultPrompt: "Expressive characters remembering a quiet sunset after a long journey.",
  },
};

export default function CreateCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = use(params);
  const router = useRouter();

  const config = CATEGORY_CONFIG[category.toLowerCase()] || CATEGORY_CONFIG.song;

  const [albums, setAlbums] = useState<AlbumData[]>([]);
  const [loadingAlbums, setLoadingAlbums] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Form states
  const [title, setTitle] = useState(config.defaultTitle);
  const [selectedGenre, setSelectedGenre] = useState(config.genres[0]);
  const [prompt, setPrompt] = useState(config.defaultPrompt);

  // Generation state
  const [generating, setGenerating] = useState(false);
  const [progressMessage, setProgressMessage] = useState("");
  const [completedCreation, setCompletedCreation] = useState<CreationData | null>(null);

  useEffect(() => {
    const fetchAlbumsAndAssets = async () => {
      try {
        const res = await fetch("/api/albums");
        const data = await res.json();
        if (data.albums) {
          // Fetch full assets for each album
          const fullAlbums: AlbumData[] = await Promise.all(
            data.albums.map(async (alb: { id: string }) => {
              const r = await fetch(`/api/albums/${alb.id}`);
              const d = await r.json();
              return d.album;
            })
          );
          setAlbums(fullAlbums.filter(Boolean));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingAlbums(false);
      }
    };

    fetchAlbumsAndAssets();
  }, []);

  const toggleSelectAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setGenerating(true);
    setProgressMessage("Reading memory contexts and stories...");

    try {
      setTimeout(() => {
        setProgressMessage("Connecting with ElevenLabs & AI synthesis engine...");
      }, 1200);

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: config.type,
          title: title.trim(),
          prompt: prompt.trim(),
          genreOrStyle: selectedGenre,
          assetIds: selectedAssetIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCompletedCreation(data.creation);
      } else {
        alert("Generation failed. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error during generation.");
    } finally {
      setGenerating(false);
      setProgressMessage("");
    }
  };

  const allAssetsCount = albums.reduce((acc, a) => acc + a.assets.length, 0);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <Link href="/" className="text-xs font-medium text-zinc-500 hover:text-indigo-600 mb-2 inline-block">
          &larr; Back to Home
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-4xl">{config.icon}</span>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {config.description}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-8">
        {/* Step 1: Select Memory Assets from Albums */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold">Step 1: Select Memory Sources</h2>
              <p className="text-xs text-zinc-500">
                Pick photos, videos, or audio clips. Their attached context stories will guide the AI generation.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {selectedAssetIds.length} Selected
            </span>
          </div>

          {loadingAlbums ? (
            <div className="py-12 text-center text-zinc-400 text-sm">Loading your albums...</div>
          ) : allAssetsCount === 0 ? (
            <div className="py-10 text-center rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                You have no media in your albums yet
              </p>
              <p className="text-xs text-zinc-400 mt-1 mb-4">
                You can still generate using just prompts, or upload photos to albums first for personalized stories.
              </p>
              <Link
                href="/albums"
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
              >
                Go to Albums to Upload
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {albums.map((album) => {
                if (album.assets.length === 0) return null;
                return (
                  <div key={album.id} className="space-y-3">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                      📁 {album.name} ({album.assets.length} items)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                      {album.assets.map((asset) => {
                        const isSelected = selectedAssetIds.includes(asset.id);
                        const hasContext = asset.contextStatus === "CONTEXT_ADDED";
                        return (
                          <div
                            key={asset.id}
                            onClick={() => toggleSelectAsset(asset.id)}
                            className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all p-1 ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm"
                                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                            }`}
                          >
                            <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden relative">
                              {asset.mediaType === "IMAGE" ? (
                                <img
                                  src={asset.fileUrl}
                                  alt={asset.originalName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs font-mono text-zinc-400">
                                  {asset.mediaType}
                                </div>
                              )}

                              {/* Selection Checkbox */}
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shadow-md transition-colors bg-white text-black dark:bg-zinc-900 dark:text-white">
                                {isSelected ? "✓" : ""}
                              </div>

                              {/* Context status indicator */}
                              <div className="absolute bottom-1.5 left-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                    hasContext
                                      ? "bg-emerald-500 text-white"
                                      : "bg-amber-500 text-white"
                                  }`}
                                >
                                  {hasContext ? "Story Ready" : "No Context"}
                                </span>
                              </div>
                            </div>

                            <p className="text-[11px] font-medium text-zinc-800 dark:text-zinc-200 truncate mt-1 px-1">
                              {asset.originalName}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Step 2: Generation Setup */}
        <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold">Step 2: Generation Style & Direction</h2>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Creation Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Genre / Artistic Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {config.genres.map((g) => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold border text-left transition ${
                    selectedGenre === g
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Creative Prompt & Emotional Tone
            </label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the desired mood, tempo, or central narrative..."
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </section>

        {/* Generate Button & Progress */}
        <div className="flex flex-col items-center gap-3">
          <button
            type="submit"
            disabled={generating}
            className="w-full sm:w-auto px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 text-white font-bold text-base shadow-lg transition-transform active:scale-95 disabled:opacity-50"
          >
            {generating ? "Synthesizing with AI..." : `✨ Generate ${config.title}`}
          </button>

          {generating && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
              {progressMessage}
            </p>
          )}
        </div>
      </form>

      {/* Completion Modal / Quick View */}
      {completedCreation && (
        <CreationPreviewModal
          creation={completedCreation}
          onClose={() => {
            setCompletedCreation(null);
            router.push("/#creations");
          }}
        />
      )}
    </div>
  );
}
