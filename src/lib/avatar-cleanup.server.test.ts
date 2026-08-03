import { describe, it, expect, vi, beforeEach } from 'vitest'

const connectDB = vi.fn()
const find = vi.fn()
const findByIdAndDelete = vi.fn()
const destroy = vi.fn()

vi.mock('@/lib/db', () => ({ connectDB: () => connectDB() }))
vi.mock('@/lib/models/Upload', () => ({
  default: {
    find: (...args: unknown[]) => find(...args),
    findByIdAndDelete: (...args: unknown[]) => findByIdAndDelete(...args),
  },
}))
vi.mock('@/lib/cloudinary', () => ({
  default: { uploader: { destroy: (...args: unknown[]) => destroy(...args) } },
}))

const { deleteSupersededAvatars } = await import('./avatar-cleanup.server')

function mockFindResult(rows: { _id: string; publicId: string }[]) {
  find.mockReturnValue({
    select: () => ({
      lean: () => Promise.resolve(rows),
    }),
  })
}

describe('deleteSupersededAvatars', () => {
  beforeEach(() => {
    connectDB.mockReset().mockResolvedValue(undefined)
    find.mockReset()
    findByIdAndDelete.mockReset().mockResolvedValue(undefined)
    destroy.mockReset().mockResolvedValue({ result: 'ok' })
  })

  it('does nothing when there are no other avatar uploads for the user', async () => {
    mockFindResult([])
    await deleteSupersededAvatars('user1', 'lingomatch/avatars/current')
    expect(destroy).not.toHaveBeenCalled()
    expect(findByIdAndDelete).not.toHaveBeenCalled()
  })

  it('excludes the just-uploaded public_id from the query', async () => {
    mockFindResult([])
    await deleteSupersededAvatars('user1', 'lingomatch/avatars/current')
    expect(find).toHaveBeenCalledWith({
      userId: 'user1',
      type: 'avatar',
      publicId: { $ne: 'lingomatch/avatars/current' },
    })
  })

  it('deletes every superseded asset from Cloudinary and its Upload row', async () => {
    mockFindResult([
      { _id: 'up1', publicId: 'lingomatch/avatars/old1' },
      { _id: 'up2', publicId: 'lingomatch/avatars/old2' },
    ])
    await deleteSupersededAvatars('user1', 'lingomatch/avatars/current')
    expect(destroy).toHaveBeenCalledWith('lingomatch/avatars/old1')
    expect(destroy).toHaveBeenCalledWith('lingomatch/avatars/old2')
    expect(findByIdAndDelete).toHaveBeenCalledWith('up1')
    expect(findByIdAndDelete).toHaveBeenCalledWith('up2')
  })

  it('still deletes the Upload row even if the Cloudinary asset is already gone', async () => {
    mockFindResult([{ _id: 'up1', publicId: 'lingomatch/avatars/old1' }])
    destroy.mockRejectedValueOnce(new Error('not found'))
    await deleteSupersededAvatars('user1', 'lingomatch/avatars/current')
    expect(findByIdAndDelete).toHaveBeenCalledWith('up1')
  })

  it('continues past one failing asset to clean up the rest', async () => {
    mockFindResult([
      { _id: 'up1', publicId: 'lingomatch/avatars/old1' },
      { _id: 'up2', publicId: 'lingomatch/avatars/old2' },
    ])
    destroy.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ result: 'ok' })
    await deleteSupersededAvatars('user1', 'lingomatch/avatars/current')
    expect(findByIdAndDelete).toHaveBeenCalledWith('up1')
    expect(findByIdAndDelete).toHaveBeenCalledWith('up2')
  })
})
