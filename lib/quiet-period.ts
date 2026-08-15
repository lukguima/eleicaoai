import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'
import { QUIET_PERIOD_MESSAGE } from './compliance-text'

export { QUIET_PERIOD_MESSAGE }

const WINDOWS: { start: number; end: number }[] = [
  { start: Date.parse('2026-10-01T03:00:00.000Z'), end: Date.parse('2026-10-05T20:00:00.000Z') },
  { start: Date.parse('2026-10-22T03:00:00.000Z'), end: Date.parse('2026-10-26T20:00:00.000Z') },
]

export function isSyntheticQuietPeriod(now = new Date()): boolean {
  const t = now.getTime()
  return WINDOWS.some(w => t >= w.start && t <= w.end)
}

export function quietPeriodResponse() {
  if (!isSyntheticQuietPeriod()) return null
  return NextResponse.json<ApiResponse>(
    { success: false, error: QUIET_PERIOD_MESSAGE },
    { status: 403 },
  )
}
