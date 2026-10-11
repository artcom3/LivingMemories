/** Languages available for translated editions. Existing originals keep their language. */
export const storyLanguages = {
  en: 'English', es: 'Español', it: 'Italiano', fr: 'Français', de: 'Deutsch', pt: 'Português',
} as const;
export type StoryLanguage = keyof typeof storyLanguages;
export const languageName = (language: string) => storyLanguages[language as StoryLanguage] || language;
export type LocalizedStoryText = {
  title: string;
  summary: string;
  pages: string[];
  songTitle: string;
  lyrics: string;
};
