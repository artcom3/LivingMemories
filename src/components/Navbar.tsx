import Link from "next/link";

export default function Navbar() {
  return (
    <header className="w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Living<span className="text-indigo-600 dark:text-indigo-400">Memories</span>
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800 font-mono">
            demo
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            Home
          </Link>
          <Link
            href="/#creations"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            My Creations
          </Link>
          <Link
            href="/albums"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 transition-colors shadow-sm"
          >
            Albums
          </Link>
        </div>
      </div>
    </header>
  );
}
