import type { Artifact, CreativeDraft } from "./shared";

export type StoryBookPage = {
  text: string;
  imageUrl: string | null;
  narrationUrl: string | null;
};
export type StoryBook = {
  title: string;
  language: string;
  pages: StoryBookPage[];
  musicMoment?: { afterPage: number; title: string; url: string };
};

/** Only the reader projection crosses the server/client boundary. */
export function storyBook(
  familyId: string,
  creationId: string,
  language: string,
  draft: CreativeDraft,
  artifacts: Omit<Artifact, "key">[],
): StoryBook {
  const assetUrl = (id: string) =>
    `/api/families/${encodeURIComponent(familyId)}/content/creations/${encodeURIComponent(creationId)}/assets/${encodeURIComponent(id)}`;
  const music = artifacts.find(a=>a.type === "MUSIC");
  return {
    ...(draft.musicMoment && music ? {musicMoment:{afterPage:draft.musicMoment.afterPage,title:draft.musicMoment.title,url:assetUrl(music.id)}} : {}),
    title: draft.title,
    language,
    pages: draft.pages.map((page, index) => {
      const image = artifacts.find((a) => a.type === "IMAGE" && a.page === index);
      const narration = artifacts.find((a) => a.type === "NARRATION" && a.page === index);
      return { text: page.text, imageUrl: image ? assetUrl(image.id) : null, narrationUrl: narration ? assetUrl(narration.id) : null };
    }),
  };
}
