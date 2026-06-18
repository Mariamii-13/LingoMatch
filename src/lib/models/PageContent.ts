import mongoose, { Schema, Document } from 'mongoose'

export interface IPageContent extends Document {
  slug: string
  title: string
  body: string
  page: string
  isPublished: boolean
  updatedBy: string
}

const PageContentSchema = new Schema<IPageContent>(
  {
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, default: '' },
    page: { type: String, default: 'global', trim: true },
    isPublished: { type: Boolean, default: true },
    updatedBy: { type: String, default: '' },
  },
  { timestamps: true }
)

PageContentSchema.index({ page: 1 })

export default mongoose.models.PageContent ||
  mongoose.model<IPageContent>('PageContent', PageContentSchema)
