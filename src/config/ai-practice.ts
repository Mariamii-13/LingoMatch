export type SupportedLanguage = string

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export type CEFRLevel = (typeof CEFR_LEVELS)[number]
export type TutorLevel = CEFRLevel | 'unsure'

export const PRACTICE_MODES = [
  'Free Conversation',
  'Daily Life',
  'Travel',
  'Job Interview',
  'Vocabulary Practice',
  'Grammar Practice',
] as const
export type PracticeMode = (typeof PRACTICE_MODES)[number]

export const MODE_DESCRIPTIONS: Record<PracticeMode, string> = {
  'Free Conversation': 'Open-ended conversation on any topic you choose.',
  'Daily Life': 'Practice everyday situations like shopping, cooking, and routines.',
  'Travel': 'Prepare for airports, hotels, restaurants, and asking for directions.',
  'Job Interview': 'Practice professional vocabulary and interview techniques.',
  'Vocabulary Practice': 'Build your word bank with contextual examples and practice.',
  'Grammar Practice': 'Work through grammar patterns with guided explanations.',
}

export const LEVEL_LABELS: Record<CEFRLevel, string> = {
  A1: 'A1 – Beginner',
  A2: 'A2 – Elementary',
  B1: 'B1 – Intermediate',
  B2: 'B2 – Upper Intermediate',
  C1: 'C1 – Advanced',
  C2: 'C2 – Proficient',
}
