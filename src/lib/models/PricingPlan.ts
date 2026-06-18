import mongoose, { Schema, Document } from 'mongoose'

export interface IPricingPlan extends Document {
  name: string
  planKey: string
  description: string
  price: number
  currency: string
  interval: 'month' | 'year' | 'one-time'
  features: string[]
  isActive: boolean
  stripePriceId: string | null
  maxDailySessions: number
  sortOrder: number
}

const PricingPlanSchema = new Schema<IPricingPlan>(
  {
    name: { type: String, required: true, trim: true },
    planKey: { type: String, required: true, unique: true, trim: true, lowercase: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD' },
    interval: { type: String, enum: ['month', 'year', 'one-time'], default: 'month' },
    features: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    stripePriceId: { type: String, default: null },
    maxDailySessions: { type: Number, default: 3 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

export default mongoose.models.PricingPlan ||
  mongoose.model<IPricingPlan>('PricingPlan', PricingPlanSchema)
