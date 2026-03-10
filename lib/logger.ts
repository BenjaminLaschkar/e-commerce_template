/**
 * Rotating file logger  ·  SERVER-SIDE ONLY
 *
 * Strategy per log type:
 *   • {type}.1.log  ──►  {type}.2.log  ──►  truncate {type}.1.log  ──►  …
 *   • Each file capped at MAX_FILE_SIZE (500 MB)
 *   • Tail reads only the last TAIL_BYTES (200 KB) of each file for display
 *
 * ⚠️  Never import this module in client components or Edge runtimes.
 */

import fs from 'fs'
import path from 'path'
import { LOG_TYPES, LogType, LogLevel, LogFileStats } from './log-types'

const LOG_DIR = path.join(process.cwd(), 'logs')
const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500 MB
const TAIL_BYTES = 200 * 1024 // 200 KB read per file when tailing

// ── Helpers ───────────────────────────────────────────────────────────────────

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function safeSize(filePath: string): number {
  try {
    return fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
  } catch {
    return 0
  }
}

/**
 * Returns the file path to append to next.
 * Rotation order:  file1  →  (full)  →  file2  →  (both full)  →  truncate file1  →  file1 …
 */
function getActiveFilePath(type: LogType): string {
  ensureLogDir()
  const file1 = path.join(LOG_DIR, `${type}.1.log`)
  const file2 = path.join(LOG_DIR, `${type}.2.log`)

  if (safeSize(file1) < MAX_FILE_SIZE) return file1   // file1 still has room
  if (safeSize(file2) < MAX_FILE_SIZE) return file2   // file2 still has room

  // Both full → truncate file1 (oldest slot) and reuse it
  fs.writeFileSync(file1, '')
  return file1
}

function formatLine(level: LogLevel, message: string, data?: unknown): string {
  const ts = new Date().toISOString()
  const suffix = data !== undefined ? ' | ' + JSON.stringify(data) : ''
  return `[${ts}] [${level.padEnd(5)}] ${message}${suffix}\n`
}

function writeEntry(type: LogType, level: LogLevel, message: string, data?: unknown): void {
  try {
    ensureLogDir()
    const filePath = getActiveFilePath(type)
    // Use async appendFile to never block the Node.js event loop.
    // Fire-and-forget: logging must never slow down request handling.
    fs.appendFile(filePath, formatLine(level, message, data), 'utf-8', () => { /* ignore write errors */ })
  } catch {
    // Logging must never crash the application
  }
}

// ── Public logger API ─────────────────────────────────────────────────────────

export const logger = {
  info:  (type: LogType, message: string, data?: unknown) => writeEntry(type, 'INFO',  message, data),
  warn:  (type: LogType, message: string, data?: unknown) => writeEntry(type, 'WARN',  message, data),
  error: (type: LogType, message: string, data?: unknown) => writeEntry(type, 'ERROR', message, data),
  debug: (type: LogType, message: string, data?: unknown) => writeEntry(type, 'DEBUG', message, data),
}

// ── Read helpers ──────────────────────────────────────────────────────────────

/**
 * Read the last `maxLines` lines for a log type.
 * Reads only the last TAIL_BYTES of each file to avoid loading 500 MB into memory.
 * The "older" file (lower mtime) is placed first so the result is chronological.
 */
export function readLogLines(type: LogType, maxLines = 500): string[] {
  ensureLogDir()

  function tailFile(filePath: string): string {
    const size = safeSize(filePath)
    if (size === 0) return ''
    const readSize = Math.min(TAIL_BYTES, size)
    const offset = size - readSize
    const buf = Buffer.alloc(readSize)
    const fd = fs.openSync(filePath, 'r')
    fs.readSync(fd, buf, 0, readSize, offset)
    fs.closeSync(fd)
    let text = buf.toString('utf-8')
    // Drop a potentially truncated first line when we did not start from byte 0
    if (offset > 0) {
      const nl = text.indexOf('\n')
      if (nl !== -1) text = text.slice(nl + 1)
    }
    return text
  }

  const file1 = path.join(LOG_DIR, `${type}.1.log`)
  const file2 = path.join(LOG_DIR, `${type}.2.log`)
  const mtime1 = fs.existsSync(file1) ? fs.statSync(file1).mtimeMs : 0
  const mtime2 = fs.existsSync(file2) ? fs.statSync(file2).mtimeMs : 0

  // Newer file goes last so tail keeps the most recent lines
  let combined: string
  if (mtime2 > 0 && mtime1 >= mtime2) {
    combined = tailFile(file2) + tailFile(file1)  // file2 older, file1 newer
  } else {
    combined = tailFile(file1) + tailFile(file2)  // file1 older, file2 newer
  }

  const lines = combined.split('\n').filter(Boolean)
  return lines.slice(-maxLines)
}

// ── Management helpers ────────────────────────────────────────────────────────

export function clearLogs(type: LogType): void {
  ensureLogDir()
  const file1 = path.join(LOG_DIR, `${type}.1.log`)
  const file2 = path.join(LOG_DIR, `${type}.2.log`)
  if (fs.existsSync(file1)) fs.writeFileSync(file1, '')
  if (fs.existsSync(file2)) fs.writeFileSync(file2, '')
}

export function getLogsStats(): Record<LogType, LogFileStats> {
  ensureLogDir()
  const result = {} as Record<LogType, LogFileStats>
  for (const type of LOG_TYPES) {
    const file1 = path.join(LOG_DIR, `${type}.1.log`)
    const file2 = path.join(LOG_DIR, `${type}.2.log`)
    const s1 = safeSize(file1)
    const s2 = safeSize(file2)
    result[type] = {
      file1: { size: s1, path: file1 },
      file2: { size: s2, path: file2 },
      totalSize: s1 + s2,
    }
  }
  return result
}

export { LOG_TYPES }
export type { LogType, LogLevel, LogFileStats }
