import mongoose, { Schema, Document } from 'mongoose'

export interface IThemeSettings extends Document {
  siteId: string
  primaryColor: string
  primaryForeground: string
  defaultMode: 'light' | 'dark' | 'system'
  fontFamily: string
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full'
  customCss: string
}

const ThemeSettingsSchema = new Schema<IThemeSettings>(
  {
    siteId: { type: String, default: 'default', unique: true },
    primaryColor: { type: String, default: '#f59e0b' },
    primaryForeground: { type: String, default: '#09090b' },
    defaultMode: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    fontFamily: { type: String, default: 'inter' },
    borderRadius: { type: String, enum: ['none', 'sm', 'md', 'lg', 'full'], default: 'md' },
    customCss: { type: String, default: '' },
  },
  { timestamps: true }
)

export default mongoose.models.ThemeSettings ||
  mongoose.model<IThemeSettings>('ThemeSettings', ThemeSettingsSchema)
