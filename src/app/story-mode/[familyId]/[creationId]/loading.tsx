import "@/components/story-mode/story-mode.css";
export default function StoryLoading() {
  return (
    <main className="story-mode story-unavailable" aria-busy="true">
      <span className="story-eyebrow">LivingMemories</span>
      <p role="status">Preparing your book…</p>
    </main>
  );
}
