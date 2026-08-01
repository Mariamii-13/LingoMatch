import type { Metadata } from "next"
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { getDueReviews } from '@/lib/skill-review.server'
import { ReviewClient } from './ReviewClient'

export const metadata: Metadata = { title: "Review" }

export default async function ReviewPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const items = await getDueReviews(session.user.id)

  return (
    <div className="space-y-6">
      <ReviewClient
        initialItems={items.map((item) => ({ ...item, dueAt: item.dueAt.toISOString() }))}
      />
    </div>
  )
}
