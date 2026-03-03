import { z } from '../../lib/ai.js';
import { SearchAllOutputSchema } from '@serapeum/shared-schemas';

type FeaturedResult = NonNullable<z.infer<typeof SearchAllOutputSchema>['featured']>;
type AnySearchResult =
  | z.infer<typeof SearchAllOutputSchema>['media'][number]
  | z.infer<typeof SearchAllOutputSchema>['books'][number]
  | z.infer<typeof SearchAllOutputSchema>['games'][number];

/**
 * Computes the normalized Levenshtein similarity between two strings.
 * Returns a value in [0, 1] where 1 means identical.
 */
export function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (!a || !b) return 0;

  const la = a.length;
  const lb = b.length;
  const maxLen = Math.max(la, lb);

  let prev = Array.from({ length: lb + 1 }, (_, j) => j);

  for (let i = 1; i <= la; i++) {
    const curr = Array.from({ length: lb + 1 }, (_, j) => (j === 0 ? i : 0));
    for (let j = 1; j <= lb; j++) {
      // Non-null assertions are safe: indices are bounded by loop invariants
      curr[j] =
        a[i - 1] === b[j - 1] ? prev[j - 1]! : 1 + Math.min(prev[j]!, curr[j - 1]!, prev[j - 1]!);
    }
    prev = curr;
  }

  return 1 - prev[lb]! / maxLen;
}

/**
 * Returns a popularity/quality bonus (0–10) based on API-specific fields.
 * Used as a tiebreaker when text scores are equal or close.
 *  - TMDB:         `popularity`        (log scale, 0–∞)
 *  - IGDB:         `aggregated_rating` / `rating` (0–100)
 *  - Google Books: `averageRating`     (0–5)
 */
function getPopularityBonus(item: AnySearchResult, type: 'media' | 'book' | 'game'): number {
  if (type === 'media') {
    const pop = (item as { popularity?: number }).popularity ?? 0;
    // log scale: ~0 at pop=0, ~4 at pop=14, ~10 at pop=1000
    return Math.min(10, Math.log1p(pop) * 1.44);
  }
  if (type === 'game') {
    const g = item as { aggregated_rating?: number; rating?: number };
    const rating = g.aggregated_rating ?? g.rating ?? 0;
    return rating / 10; // 0–100 → 0–10
  }
  if (type === 'book') {
    const b = item as { averageRating?: number };
    return (b.averageRating ?? 0) * 2; // 0–5 → 0–10
  }
  return 0;
}

/**
 * Finds the best match to feature among search results.
 *
 * Scoring tiers (text match):
 *  - Exact match:           100
 *  - Partial/substring:      60
 *  - Fuzzy (sim ≥ 0.55):   30–55
 *  - No match:               0
 *
 * A category boost (+200) is applied when the result type matches the
 * targeted category (e.g. MOVIE_TV → media), ensuring the right content
 * type wins in cross-category searches.
 *
 * Popularity/rating bonus (0–10) resolves ties within the same text tier.
 *
 * Returns undefined if no result reaches the minimum threshold of 30.
 */
export function findBestMatch(
  query: string,
  category: 'MOVIE_TV' | 'GAME' | 'BOOK' | 'ALL',
  results: z.infer<typeof SearchAllOutputSchema>
): FeaturedResult | undefined {
  const queryLower = query.trim().toLowerCase();
  if (!queryLower) return undefined;

  const getMatchScore = (title: string): number => {
    const tLower = title.trim().toLowerCase();
    if (!tLower) return 0;
    if (tLower === queryLower) return 100;
    if (tLower.includes(queryLower) || queryLower.includes(tLower)) return 60;
    const sim = levenshteinSimilarity(queryLower, tLower);
    if (sim >= 0.55) return Math.round(sim * 55); // 30–55
    return 0;
  };

  let bestScore = -1;
  let bestMatch: FeaturedResult | undefined;

  const evaluateAndSet = (items: AnySearchResult[], type: 'media' | 'book' | 'game'): void => {
    for (const item of items) {
      const rec = item as { title?: string; name?: string };
      const itemTitle = rec.title ?? rec.name ?? '';
      let score = getMatchScore(itemTitle);

      // Category boost: ensures the right content type wins for targeted queries
      if (
        score >= 30 &&
        ((category === 'MOVIE_TV' && type === 'media') ||
          (category === 'GAME' && type === 'game') ||
          (category === 'BOOK' && type === 'book'))
      ) {
        score += 200;
      }

      // Popularity bonus (0–10): tiebreaker using API-native quality signals
      score += getPopularityBonus(item, type);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = { type, item } as FeaturedResult;
      }
    }
  };

  evaluateAndSet(results.media ?? [], 'media');
  evaluateAndSet(results.games ?? [], 'game');
  evaluateAndSet(results.books ?? [], 'book');

  if (bestScore < 30) return undefined;
  return bestMatch;
}
