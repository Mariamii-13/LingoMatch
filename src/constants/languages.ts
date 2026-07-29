// ── Proficiency levels ────────────────────────────────────────────────────────

/** Levels for languages the user speaks — only native vs other, no CEFR. */
export const SPOKEN_LEVELS = ["native", "other"] as const
export type SpokenLevel = (typeof SPOKEN_LEVELS)[number]

/** Levels for languages the user is learning. Stored lowercase in DB. */
export const LEARNING_LEVELS = ["unsure", "a1", "a2", "b1", "b2", "c1", "c2"] as const
export type LearningLevel = (typeof LEARNING_LEVELS)[number]

export type ProficiencyLevel = SpokenLevel | LearningLevel

const LEVEL_LABELS: Record<string, string> = {
  native:   "Native",
  other:    "Other",
  c2:       "C2",
  c1:       "C1",
  b2:       "B2",
  b1:       "B1",
  a2:       "A2",
  a1:       "A1",
  beginner: "Complete Beginner",
  unsure:   "I'm not sure",
}

/**
 * Plain-language meaning for each CEFR code.
 *
 * "A1" tells a learner nothing unless they already know the framework, and the
 * level pickers offered nothing else. Compact badges keep the bare code, where
 * space is tight and the picker has already explained it.
 */
const LEVEL_MEANINGS: Record<string, string> = {
  a1: "Beginner",
  a2: "Elementary",
  b1: "Intermediate",
  b2: "Upper intermediate",
  c1: "Advanced",
  c2: "Proficient",
}

/** Short label for a stored level string, e.g. "B1" or "I'm not sure". */
export function formatLevel(level: string): string {
  return LEVEL_LABELS[level.toLowerCase()] ?? level.toUpperCase()
}

/**
 * Label for choosing a level, e.g. "B1 · Intermediate". Falls back to the short
 * label for values that are already plain words, such as "I'm not sure".
 */
export function formatLevelWithMeaning(level: string): string {
  const key = level.toLowerCase()
  const meaning = LEVEL_MEANINGS[key]
  return meaning ? `${formatLevel(key)} · ${meaning}` : formatLevel(key)
}

/**
 * Maps legacy Beginner/Intermediate/Advanced values (stored before CEFR
 * was introduced) to the nearest CEFR equivalent.
 */
export function migrateLegacyLevel(level: string): string {
  const map: Record<string, string> = {
    beginner:     "unsure",
    intermediate: "b1",
    advanced:     "c1",
    native:       "native",
  }
  return map[level.toLowerCase()] ?? level.toLowerCase()
}

/** A language+level pair — the shape stored in the DB and used throughout the UI. */
export interface LanguageLevelEntry {
  code:  string  // language code, e.g. "ko"
  level: string  // proficiency level, e.g. "a1"
}

// ── Language interface ────────────────────────────────────────────────────────
// Matches the shape stored in the DB (code only). Display fields come from here.
// To add more fields later (popularity, family, script, region) extend this
// interface — no DB schema changes needed because only `code` is persisted.

export interface Language {
  code: string       // lowercase ISO 639-1 / BCP 47 (en, ko, zh-tw, yue)
  name: string       // English display name — used for sorting and search
  nativeName: string // name in the language's own script
  flag: string       // representative emoji flag
}

// Internal registry entry — aliases improve search without polluting the
// public interface. When this list grows to ISO-639-3 scale (~7 000 entries)
// replace the linear scan in searchLanguages() with a trie or fuzzy index.
interface LanguageEntry extends Language {
  readonly aliases?: readonly string[]
}

// ── Registry ─────────────────────────────────────────────────────────────────
// Sorted alphabetically by English name.
// To add a language: insert in the correct alphabetical position.

const REGISTRY: readonly LanguageEntry[] = [
  { code: "af",    name: "Afrikaans",             nativeName: "Afrikaans",          flag: "🇿🇦" },
  { code: "sq",    name: "Albanian",              nativeName: "Shqip",              flag: "🇦🇱" },
  { code: "am",    name: "Amharic",               nativeName: "አማርኛ",               flag: "🇪🇹" },
  { code: "ar",    name: "Arabic",                nativeName: "العربية",             flag: "🇸🇦", aliases: ["arab", "fusha", "msa"] },
  { code: "hy",    name: "Armenian",              nativeName: "Հայերեն",             flag: "🇦🇲" },
  { code: "az",    name: "Azerbaijani",           nativeName: "Azərbaycan",          flag: "🇦🇿", aliases: ["azeri"] },
  { code: "eu",    name: "Basque",                nativeName: "Euskara",             flag: "🇪🇸" },
  { code: "be",    name: "Belarusian",            nativeName: "Беларуская",          flag: "🇧🇾" },
  { code: "bn",    name: "Bengali",               nativeName: "বাংলা",               flag: "🇧🇩", aliases: ["bangla"] },
  { code: "bs",    name: "Bosnian",               nativeName: "Bosanski",            flag: "🇧🇦" },
  { code: "bg",    name: "Bulgarian",             nativeName: "Български",           flag: "🇧🇬" },
  { code: "my",    name: "Burmese",               nativeName: "မြန်မာဘာသာ",          flag: "🇲🇲", aliases: ["myanmar"] },
  { code: "yue",   name: "Cantonese",             nativeName: "粵語",                flag: "🇭🇰", aliases: ["hong kong", "guangdong", "jyutping"] },
  { code: "ca",    name: "Catalan",               nativeName: "Català",              flag: "🇪🇸" },
  { code: "zh",    name: "Chinese (Mandarin)",    nativeName: "普通话",              flag: "🇨🇳", aliases: ["mandarin", "putonghua", "simplified", "prc", "mainland"] },
  { code: "zh-tw", name: "Chinese (Traditional)", nativeName: "繁體中文",            flag: "🇹🇼", aliases: ["traditional", "taiwan", "bopomofo"] },
  { code: "hr",    name: "Croatian",              nativeName: "Hrvatski",            flag: "🇭🇷" },
  { code: "cs",    name: "Czech",                 nativeName: "Čeština",             flag: "🇨🇿" },
  { code: "da",    name: "Danish",                nativeName: "Dansk",               flag: "🇩🇰" },
  { code: "nl",    name: "Dutch",                 nativeName: "Nederlands",          flag: "🇳🇱", aliases: ["flemish"] },
  { code: "en",    name: "English",               nativeName: "English",             flag: "🇬🇧", aliases: ["british", "american"] },
  { code: "et",    name: "Estonian",              nativeName: "Eesti",               flag: "🇪🇪" },
  { code: "fi",    name: "Finnish",               nativeName: "Suomi",               flag: "🇫🇮" },
  { code: "fr",    name: "French",                nativeName: "Français",            flag: "🇫🇷" },
  { code: "gl",    name: "Galician",              nativeName: "Galego",              flag: "🇪🇸" },
  { code: "ka",    name: "Georgian",              nativeName: "ქართული",             flag: "🇬🇪", aliases: ["kartuli"] },
  { code: "de",    name: "German",                nativeName: "Deutsch",             flag: "🇩🇪" },
  { code: "el",    name: "Greek",                 nativeName: "Ελληνικά",            flag: "🇬🇷", aliases: ["hellenic"] },
  { code: "he",    name: "Hebrew",                nativeName: "עברית",               flag: "🇮🇱", aliases: ["ivrit"] },
  { code: "hi",    name: "Hindi",                 nativeName: "हिन्दी",               flag: "🇮🇳", aliases: ["devanagari"] },
  { code: "hu",    name: "Hungarian",             nativeName: "Magyar",              flag: "🇭🇺" },
  { code: "is",    name: "Icelandic",             nativeName: "Íslenska",            flag: "🇮🇸" },
  { code: "id",    name: "Indonesian",            nativeName: "Bahasa Indonesia",    flag: "🇮🇩", aliases: ["bahasa"] },
  { code: "ga",    name: "Irish",                 nativeName: "Gaeilge",             flag: "🇮🇪", aliases: ["gaelic"] },
  { code: "it",    name: "Italian",               nativeName: "Italiano",            flag: "🇮🇹" },
  { code: "ja",    name: "Japanese",              nativeName: "日本語",              flag: "🇯🇵", aliases: ["nihongo", "kanji", "hiragana"] },
  { code: "kn",    name: "Kannada",               nativeName: "ಕನ್ನಡ",               flag: "🇮🇳" },
  { code: "kk",    name: "Kazakh",                nativeName: "Қазақ тілі",          flag: "🇰🇿" },
  { code: "km",    name: "Khmer",                 nativeName: "ភាសាខ្មែរ",           flag: "🇰🇭", aliases: ["cambodian"] },
  { code: "ko",    name: "Korean",                nativeName: "한국어",              flag: "🇰🇷", aliases: ["hangul", "hangugeo", "k-pop"] },
  { code: "ku",    name: "Kurdish",               nativeName: "Kurdî",               flag: "🇮🇶", aliases: ["kurmanji", "sorani"] },
  { code: "lo",    name: "Lao",                   nativeName: "ລາວ",                 flag: "🇱🇦", aliases: ["laotian"] },
  { code: "lv",    name: "Latvian",               nativeName: "Latviešu",            flag: "🇱🇻" },
  { code: "lt",    name: "Lithuanian",            nativeName: "Lietuvių",            flag: "🇱🇹" },
  { code: "mk",    name: "Macedonian",            nativeName: "Македонски",          flag: "🇲🇰" },
  { code: "ms",    name: "Malay",                 nativeName: "Bahasa Melayu",       flag: "🇲🇾" },
  { code: "ml",    name: "Malayalam",             nativeName: "മലയാളം",              flag: "🇮🇳" },
  { code: "mt",    name: "Maltese",               nativeName: "Malti",               flag: "🇲🇹" },
  { code: "mn",    name: "Mongolian",             nativeName: "Монгол хэл",          flag: "🇲🇳" },
  { code: "ne",    name: "Nepali",                nativeName: "नेपाली",              flag: "🇳🇵" },
  { code: "no",    name: "Norwegian",             nativeName: "Norsk",               flag: "🇳🇴", aliases: ["bokmal", "nynorsk"] },
  { code: "fa",    name: "Persian (Farsi)",        nativeName: "فارسی",               flag: "🇮🇷", aliases: ["farsi", "iran", "dari"] },
  { code: "pl",    name: "Polish",                nativeName: "Polski",              flag: "🇵🇱" },
  { code: "pt",    name: "Portuguese",            nativeName: "Português",           flag: "🇵🇹", aliases: ["brasileiro"] },
  { code: "pa",    name: "Punjabi",               nativeName: "ਪੰਜਾਬੀ",              flag: "🇮🇳", aliases: ["panjabi"] },
  { code: "ro",    name: "Romanian",              nativeName: "Română",              flag: "🇷🇴" },
  { code: "ru",    name: "Russian",               nativeName: "Русский",             flag: "🇷🇺" },
  { code: "sr",    name: "Serbian",               nativeName: "Српски",              flag: "🇷🇸" },
  { code: "si",    name: "Sinhala",               nativeName: "සිංහල",               flag: "🇱🇰", aliases: ["sinhalese"] },
  { code: "sk",    name: "Slovak",                nativeName: "Slovenčina",          flag: "🇸🇰" },
  { code: "sl",    name: "Slovenian",             nativeName: "Slovenščina",         flag: "🇸🇮" },
  { code: "es",    name: "Spanish",               nativeName: "Español",             flag: "🇪🇸", aliases: ["castellano"] },
  { code: "sw",    name: "Swahili",               nativeName: "Kiswahili",           flag: "🇹🇿", aliases: ["kiswahili"] },
  { code: "sv",    name: "Swedish",               nativeName: "Svenska",             flag: "🇸🇪" },
  { code: "tl",    name: "Tagalog",               nativeName: "Tagalog",             flag: "🇵🇭", aliases: ["filipino", "pilipino"] },
  { code: "ta",    name: "Tamil",                 nativeName: "தமிழ்",               flag: "🇮🇳", aliases: ["thamizh"] },
  { code: "te",    name: "Telugu",                nativeName: "తెలుగు",              flag: "🇮🇳" },
  { code: "th",    name: "Thai",                  nativeName: "ภาษาไทย",             flag: "🇹🇭" },
  { code: "tr",    name: "Turkish",               nativeName: "Türkçe",              flag: "🇹🇷" },
  { code: "uk",    name: "Ukrainian",             nativeName: "Українська",          flag: "🇺🇦" },
  { code: "ur",    name: "Urdu",                  nativeName: "اردو",                flag: "🇵🇰" },
  { code: "uz",    name: "Uzbek",                 nativeName: "Oʻzbek",              flag: "🇺🇿" },
  { code: "vi",    name: "Vietnamese",            nativeName: "Tiếng Việt",          flag: "🇻🇳" },
  { code: "cy",    name: "Welsh",                 nativeName: "Cymraeg",             flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
]

// ── Public exports ────────────────────────────────────────────────────────────

/** Immutable array of all supported languages, sorted A→Z by English name. */
export const LANGUAGES: readonly Language[] = REGISTRY

// Pre-built lookup map — O(1) per getLanguage() call
const BY_CODE = new Map<string, LanguageEntry>(
  REGISTRY.map((l) => [l.code, l])
)

const FALLBACK = (code: string): Language => ({ code, name: code, nativeName: code, flag: "" })

/** Look up one language by code. Returns a stub on miss so callers never get null. */
export function getLanguage(code: string): Language {
  return BY_CODE.get(code.toLowerCase()) ?? FALLBACK(code)
}

/** Look up multiple languages by code array, preserving order. */
export function getLanguages(codes: readonly string[]): Language[] {
  return codes.map(getLanguage)
}

/**
 * Search languages by a free-text query.
 * Matches against: English name, native name, code prefix, and aliases.
 * Returns the full list when query is empty.
 *
 * Scaling note: the linear scan is fast enough for hundreds of entries.
 * If the registry grows to ISO 639-3 scale (~7 000 languages), replace
 * this function body with a trie or a library like fuse.js — the call
 * sites don't need to change.
 */
/**
 * Full display label for selectors, search lists, onboarding, settings.
 * Skips the native-name parenthetical when it's identical to the English name.
 * Examples: "Korean (한국어)"  "English"  "Tagalog"
 */
export function formatLanguageFull(lang: Language): string {
  if (lang.name === lang.nativeName || !lang.nativeName) return lang.name
  return `${lang.name} (${lang.nativeName})`
}

/**
 * Compact label for chips, badges, and profile cards.
 * Example: "Korean"
 */
export function formatLanguageCompact(lang: Language): string {
  return lang.name
}

export function searchLanguages(query: string): Language[] {
  const q = query.toLowerCase().trim()
  if (!q) return REGISTRY as Language[]
  return REGISTRY.filter(
    (l) =>
      l.code.startsWith(q) ||
      l.name.toLowerCase().includes(q) ||
      l.nativeName.toLowerCase().includes(q) ||
      l.aliases?.some((a) => a.includes(q))
  )
}
