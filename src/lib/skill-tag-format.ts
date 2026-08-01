/**
 * "preterite-vs-present" -> "Preterite vs present" — a plain-language label.
 * Shared between the review deck UI (`(app)/review/ReviewClient.tsx`) and the
 * tutor's own weak-areas context summary (§20.8 item 5), so a raw model-
 * assigned skill tag is never shown to anyone verbatim. No `server-only`
 * import — this is pure and used from both a Client Component and a
 * server-only module.
 */
export function formatSkillTag(tag: string): string {
  const spaced = tag.replace(/-/g, ' ')
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}
