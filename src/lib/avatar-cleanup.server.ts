import 'server-only'
import { connectDB } from '@/lib/db'
import Upload from '@/lib/models/Upload'
import cloudinary from '@/lib/cloudinary'

/**
 * Every avatar upload overwrites User.avatar but nothing ever deleted the
 * asset it replaced — a real storage-cost leak (roadmap #12) confirmed by a
 * bundle/asset audit that found orphaned Cloudinary files going back to this
 * app's earliest test uploads. Called after a new avatar upload succeeds:
 * deletes every other `avatar`-type Upload row for this user, both from
 * Cloudinary and from the Upload log. Best-effort per asset — one bad
 * public_id (already deleted, malformed) must not block cleanup of the rest.
 */
export async function deleteSupersededAvatars(userId: string, keepPublicId: string): Promise<void> {
  await connectDB()
  const superseded = await Upload.find({ userId, type: 'avatar', publicId: { $ne: keepPublicId } })
    .select('_id publicId')
    .lean()

  for (const upload of superseded) {
    try {
      await cloudinary.uploader.destroy(upload.publicId as string)
    } catch {
      // Best-effort: an already-gone or malformed asset shouldn't block the rest.
    }
    await Upload.findByIdAndDelete(upload._id)
  }
}
