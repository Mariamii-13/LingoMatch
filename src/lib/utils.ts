import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-indigo-600",
  "from-fuchsia-500 to-purple-600",
  "from-sky-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
]

export function avatarGradient(username: string) {
  let h = 0
  for (const c of username) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length]
}
