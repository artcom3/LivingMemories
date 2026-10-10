"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

interface MediaAsset {
  id: string;
  fileKey: string;
  fileUrl: string;
  originalName: string;
  mimeType: string;
  mediaType: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  size: number | null;
  contextStatus: "NO_CONTEXT" | "CONTEXT_ADDED";
  contextDescription: string | null;
  peopleTags: string | null;
  locationTag: string | null;
  dateTag: string | null;
  emotionTag: string | null;
  createdAt: string;
}

interface AlbumData {
  id: string;
  name: string;
  description: string | null;
  assets: MediaAsset[];
}

export default function AlbumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [album, setAlbum] = useState<AlbumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState("");

  // Context editing state
  const [editingAsset, setEditingAsset] = useState<MediaAsset | null>(null);
  const [descriptionInput, setDescriptionInput] = useState("");
  const [peopleInput, setPeopleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [emotionInput, setEmotionInput] = useState("");
  const [savingContext, setSavingContext] = useState(false);

  const fetchAlbum = async () => {
    try {
      const res = await fetch(`/api/albums/${id}`);
      const data = await res.json();
      if (data.album) {
        setAlbum(data.album);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbum();
  }, [id]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgressText(`Uploading ${files.length} file(s)...`);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }

    try {
      const res = await fetch(`/api/albums/${id}/upload`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        await fetchAlbum();
      } else {
        alert("Upload failed. Please check the files and try again.");
      }
    } catch (err) {
      console.error(err);
      alert("Error uploading files");
    } finally {
      setUploading(false);
      setUploadProgressText("");
      e.target.value = "";
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Remove this item from the album?")) return;

    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (res.ok) {
        setAlbum((prev) =>
          prev ? { ...prev, assets: prev.assets.filter((a) => a.id !== assetId) } : prev
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openContextModal = (asset: MediaAsset) => {
    setEditingAsset(asset);
    setDescriptionInput(asset.contextDescription || "");
    setPeopleInput(asset.peopleTags || "");
    setLocationInput(asset.locationTag || "");
    setEmotionInput(asset.emotionTag || "");
  };

  const handleSaveContext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAsset) return;

    setSavingContext(true);
    try {
      const res = await fetch(`/api/assets/${editingAsset.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextDescription: descriptionInput,
          peopleTags: peopleInput,
          locationTag: locationInput,
          emotionTag: emotionInput,
        }),
      });

      if (res.ok) {
        const { asset: updated } = await res.json();
        setAlbum((prev) =>
          prev
            ? {
                ...prev,
                assets: prev.assets.map((a) => (a.id === updated.id ? updated : a)),
              }
            : prev
        );
        setEditingAsset(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingContext(false);
    }
  };

  if (loading) {
    return <div className="max-w-6xl mx-auto px-4 py-20 text-center text-zinc-400">Loading album...</div>;
  }

  if (!album) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <p className="text-zinc-600 dark:text-zinc-400 mb-4">Album not found</p>
        <Link href="/albums" className="text-indigo-600 font-semibold hover:underline">
          &larr; Back to Albums
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <Link href="/albums" className="text-xs font-medium text-zinc-500 hover:text-indigo-600 mb-2 inline-block">
            &larr; All Albums
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">{album.name}</h1>
          {album.description && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-xl">
              {album.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="cursor-pointer px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition shadow-sm inline-flex items-center gap-2">
            <span>{uploading ? uploadProgressText : "+ Upload Media"}</span>
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              disabled={uploading}
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Media Grid */}
      {album.assets.length === 0 ? (
        <div className="py-24 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-base font-semibold text-zinc-700 dark:text-zinc-300">
            This album is currently empty
          </p>
          <p className="text-sm text-zinc-400 mt-1 mb-6">
            Upload photos, home videos, or audio memories to start creating.
          </p>
          <label className="cursor-pointer px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
            Choose Files to Upload
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {album.assets.map((asset) => {
            const hasContext = asset.contextStatus === "CONTEXT_ADDED";
            return (
              <div
                key={asset.id}
                className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition"
              >
                {/* Media Preview Box */}
                <div className="aspect-square bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden flex items-center justify-center">
                  {asset.mediaType === "IMAGE" ? (
                    <img
                      src={asset.fileUrl}
                      alt={asset.originalName}
                      className="w-full h-full object-cover"
                    />
                  ) : asset.mediaType === "VIDEO" ? (
                    <video
                      src={asset.fileUrl}
                      controls
                      className="w-full h-full object-cover"
                    />
                  ) : asset.mediaType === "AUDIO" ? (
                    <div className="p-4 w-full flex flex-col items-center justify-center text-center">
                      <span className="text-3xl mb-2">🎵</span>
                      <audio src={asset.fileUrl} controls className="w-full max-w-[200px]" />
                    </div>
                  ) : (
                    <div className="text-zinc-400 font-mono text-xs">{asset.originalName}</div>
                  )}

                  {/* Context Badge */}
                  <div className="absolute top-2 left-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase shadow-sm ${
                        hasContext
                          ? "bg-emerald-500/90 text-white backdrop-blur-sm"
                          : "bg-amber-500/90 text-white backdrop-blur-sm"
                      }`}
                    >
                      {hasContext ? "Context Added" : "No Context"}
                    </span>
                  </div>
                </div>

                {/* Info & Action Section */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate" title={asset.originalName}>
                      {asset.originalName}
                    </p>

                    {hasContext ? (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 italic">
                        "{asset.contextDescription}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                        Add context so AI knows who or what this memory represents!
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <button
                      onClick={() => openContextModal(asset)}
                      className={`font-semibold hover:underline ${
                        hasContext
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {hasContext ? "Edit Context" : "+ Add Context"}
                    </button>
                    <button
                      onClick={() => handleDeleteAsset(asset.id)}
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                      title="Delete asset"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Context Metadata Modal / Drawer */}
      {editingAsset && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-zinc-200 dark:border-zinc-800">
              <div>
                <h3 className="text-lg font-semibold">Memory Context & Story</h3>
                <p className="text-xs text-zinc-500">
                  {editingAsset.originalName}
                </p>
              </div>
              <button
                onClick={() => setEditingAsset(null)}
                className="text-zinc-400 hover:text-zinc-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveContext} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Story / What is happening in this memory? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  placeholder="e.g. This was Grandpa's 75th birthday party in the garden. He was laughing because the dog tried to steal the cake."
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    People / Characters
                  </label>
                  <input
                    type="text"
                    value={peopleInput}
                    onChange={(e) => setPeopleInput(e.target.value)}
                    placeholder="Grandpa Joe, Mom, Rex"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                    Location / Place
                  </label>
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Grandma's Backyard, Ohio"
                    className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                  Emotion / Mood / Vibe
                </label>
                <input
                  type="text"
                  value={emotionInput}
                  onChange={(e) => setEmotionInput(e.target.value)}
                  placeholder="Joyful, Nostalgic, Heartwarming, Humorous"
                  className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingAsset(null)}
                  className="px-4 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingContext}
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                >
                  {savingContext ? "Saving Context..." : "Save Context"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
