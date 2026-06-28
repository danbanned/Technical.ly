/**
 * feedArticles.js — derives article objects from the real tract + insightEngine data.
 *
 * SWAP POINT: replace seedArticlesFromTracts() with live narrateInsight() output
 * when AI narration goes live. The returned shape is identical to what narrateTract()
 * returns augmented with tract metadata — no structural change needed anywhere else.
 *
 * Current shape (seed):
 *   { tractId, neighborhood, centroid, cbs, headline, body, category, badge }
 *
 * Future shape (AI):
 *   Same object, but body = narration.text from narrateTract()
 *   One-line change:  body: narration.text   (instead of insight.resident)
 */

import { buildTractInsightFromStore } from '../core/insightEngine.js';

const CATEGORY_PRIORITY = {
  opportunity_gap:  0,   // mismatch — most interesting first
  aligned_benefit:  1,
  strong_local:     2,
  underserved:      3,
};

export function seedArticlesFromTracts(tractsWithCBS) {
  if (!tractsWithCBS?.length) return [];

  return tractsWithCBS
    .map((tract) => {
      const insight = buildTractInsightFromStore(tract);
      return {
        tractId:      tract.id,
        neighborhood: tract.neighborhood,
        centroid:     tract.centroid,
        cbs:          tract.cbs,
        headline:     insight.headline,
        body:         insight.resident,   // SWAP: replace with narration.text for AI
        category:     insight.category,
        badge:        insight.badge,
      };
    })
    .sort(
      (a, b) =>
        (CATEGORY_PRIORITY[a.category] ?? 9) - (CATEGORY_PRIORITY[b.category] ?? 9)
    );
}
