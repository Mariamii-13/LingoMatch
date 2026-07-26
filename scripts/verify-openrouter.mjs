/**
 * One-shot real provider verification.
 * Reads env from .env.local. Does NOT print the API key or raw response body.
 * Run: node scripts/verify-openrouter.mjs
 */
import { readFileSync } from 'node:fs'

// Minimal .env.local parser (no dotenv dep needed for a script)
const envLines = readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...rest] = line.trim().split('=')
  if (key && rest.length && !process.env[key]) {
    process.env[key] = rest.join('=').replace(/^["']|["']$/g, '')
  }
}

const apiKey = process.env.OPENROUTER_API_KEY
const modelId = process.env.AI_MODEL_DEFAULT

if (!apiKey) throw new Error('OPENROUTER_API_KEY not set in .env.local')
if (!modelId) throw new Error('AI_MODEL_DEFAULT not set in .env.local')

console.log('Model:', modelId)
console.log('Sending one real request to OpenRouter...')

const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 10_000)

let res
try {
  res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'system',
          content: 'You are a professional Spanish language tutor for beginner students.',
        },
        { role: 'user', content: 'Say hello and ask one very simple question in Spanish.' },
      ],
      max_tokens: 60,
    }),
    signal: controller.signal,
  })
} finally {
  clearTimeout(timeout)
}

console.log('HTTP status:', res.status)

if (!res.ok) {
  console.error('Provider error:', res.status, res.statusText)
  process.exit(1)
}

const data = await res.json()
const reply = data?.choices?.[0]?.message?.content

if (!reply || reply.trim().length === 0) {
  console.error('Empty or malformed reply')
  process.exit(1)
}

// Truncate reply before printing (no raw dump)
console.log('Reply (first 120 chars):', reply.slice(0, 120))
console.log('\n✓ Real OpenRouter request succeeded. Model is reachable and returning valid responses.')
