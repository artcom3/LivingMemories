"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface AlbumItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count: { assets: number };
  assets: Array<{ id: string; fileUrl: string; mediaType: string }>;
}

export default function AlbumsPage() {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creatingLoading, setCreatingLoading] = useState(false);

  const fetchAlbums = async () => {
    try {
      const res = await fetch("/api/albums");
      const data = await res.json();
      if (data.albums) {
        setAlbums(data.albums);
      }
    } catch (err) {
      console.error("Failed to load albums", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreatingLoading(true);
    try {
      const res = await fetch("/api/albums", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, description: newDescription }),
      });
      if (res.ok) {
        setNewName("");
        setNewDescription("");
        setIsCreating(false);
        fetchAlbums();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreatingLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete album "${name}" and all its media?`)) return;

    try {
      const res = await fetch(`/api/albums/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAlbums((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Memory Albums</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Organize your photos, videos, and audio clips before turning them into art.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-colors shadow-sm"
        >
          {isCreating ? "Cancel" : "+ New Album"}
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreate}
          className="mb-8 p-6 bg-white dark:bg-zinc-900 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold">Create a New Album</h2>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Album Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Summer Roadtrip 2024, Grandma's 80th Birthday"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 uppercase tracking-wider mb-1">
              Description (Optional)
            </label>
            <textarea
              placeholder="Brief overview of these memories..."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingLoading}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {creatingLoading ? "Creating..." : "Save Album"}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="py-20 text-center text-zinc-400 text-sm">Loading albums...</div>
      ) : albums.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-8">
          <p className="text-base font-medium text-zinc-600 dark:text-zinc-300">No albums yet</p>
          <p className="text-sm text-zinc-400 mt-1 mb-4">
            Create your first album to upload photos and videos for your creations.
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
          >
            Create Your First Album
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {albums.map((album) => (
            <div
              key={album.id}
              className="group flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 transition shadow-sm"
            >
              <Link href={`/albums/${album.id}`} className="block aspect-[16/9] bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                {album.assets.length > 0 ? (
                  <div className="w-full h-full grid grid-cols-3 gap-0.5 bg-zinc-200 dark:bg-zinc-800">
                    {album.assets.map((asset) => (
                      <div key={asset.id} className="relative w-full h-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
                        {asset.mediaType === "IMAGE" ? (
                          <img
                            src={asset.fileUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-zinc-400 font-mono">
                            {asset.mediaType}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-400 text-xs">
                    Empty Album
                  </div>
                )}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                  {album._count.assets} {album._count.assets === 1 ? "item" : "items"}
                </div>
              </Link>

              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <Link
                    href={`/albums/${album.id}`}
                    className="text-lg font-semibold hover:text-indigo-600 transition-colors line-clamp-1"
                  >
                    {album.name}
                  </Link>
                  {album.description && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                      {album.description}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">
                    {new Date(album.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDelete(album.id, album.name)}
                      className="text-red-500 hover:text-red-700 font-medium"
                    >
                      Delete
                    </button>
                    <Link
                      href={`/albums/${album.id}`}
                      className="font-semibold text-indigo-600 hover:text-indigo-700"
                    >
                      Open &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
