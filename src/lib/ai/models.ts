import 'server-only'

export type ModelRole =
  | 'defaultTutor'
  | 'freeTutor'
  | 'budgetTutor'
  | 'advancedTutor'
  | 'grammarTutor'
  | 'fallbackTutor'

export function resolveModel(role: ModelRole = 'defaultTutor'): string {
  const modelId = process.env.AI_MODEL_DEFAULT
  if (!modelId) {
    throw new Error('AI_MODEL_DEFAULT environment variable is not configured')
  }
  // Future roles will map to distinct model IDs once provisioned.
  switch (role) {
    case 'defaultTutor':
    case 'freeTutor':
    case 'budgetTutor':
    case 'advancedTutor':
    case 'grammarTutor':
    case 'fallbackTutor':
      return modelId
  }
}
