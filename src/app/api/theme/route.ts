import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db'
import ThemeSettings from '@/lib/models/ThemeSettings'

const DEFAULTS = {
  primaryColor: '#f59e0b',
  primaryForeground: '#09090b',
  customCss: '',
}

export async function GET() {
  try {
    await connectDB()
    const settings = await ThemeSettings.findOne({ siteId: 'default' })
      .select('primaryColor primaryForeground customCss')
      .lean() as { primaryColor?: string; primaryForeground?: string; customCss?: string } | null

    return NextResponse.json({
      primaryColor: settings?.primaryColor ?? DEFAULTS.primaryColor,
      primaryForeground: settings?.primaryForeground ?? DEFAULTS.primaryForeground,
      customCss: settings?.customCss ?? DEFAULTS.customCss,
    })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}
