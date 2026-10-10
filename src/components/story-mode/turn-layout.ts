/** Physical sheets: front cover, story spreads, back cover. */
export function physicalPage(page: number, single: boolean) {
  return single ? page + 2 : page * 2 + 2;
}
export function storyPage(physical: number, count: number, single: boolean) {
  if (physical <= 1) return -1;
  return Math.min(count - 1, single ? physical - 2 : Math.floor((physical - 2) / 2));
}
