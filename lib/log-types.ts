/**
 * Shared log type definitions — no Node.js dependencies.
 * Can be safely imported in both server and client code.
 */

export const LOG_TYPES = ['app', 'api', 'db', 'stripe', 'cron', 'error'] as const
export type LogType = (typeof LOG_TYPES)[number]
export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG'

export interface LogFileStats {
  file1: { size: number; path: string }
  file2: { size: number; path: string }
  totalSize: number
}
