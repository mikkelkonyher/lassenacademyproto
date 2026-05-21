/**
 * Tag label helper.
 *
 * `courses.tags` stores canonical lowercase keys (e.g. `guitar`, `beginner`).
 * Translations live under `t.tags` in src/translations.ts. This helper looks
 * up the localized label and falls back to the raw key if the tag is new and
 * hasn't been added to translations yet — so unknown tags still render
 * (just untranslated) instead of disappearing.
 */
import type { translations } from "../translations";

type Translations = typeof translations.da;

export function getTagLabel(tag: string, t: Translations): string {
  const tags = (t.tags ?? {}) as Record<string, string | undefined>;
  return tags[tag] ?? tag;
}
