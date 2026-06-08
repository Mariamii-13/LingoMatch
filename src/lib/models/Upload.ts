import mongoose, { Schema } from 'mongoose'

const UploadSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    publicId: { type: String, required: true },
    url: { type: String, required: true },
    type: { type: String, enum: ['avatar', 'voice'], required: true },
    size: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.models.Upload || mongoose.model('Upload', UploadSchema)
