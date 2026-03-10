'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import AdminSidebar from '@/components/admin/Sidebar'
import {
  Terminal,
  RefreshCw,
  Trash2,
  Download,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  HardDrive,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogType, LogFileStats } from '@/lib/log-types'

// ── Tab configuration ─────────────────────────────────────────────────────────

const LOG_TABS: {
  id: LogType
  label: string
  icon: string
  activeClass: string
  badgeClass: string
}[] = [
  { id: 'app',    label: 'Application',      icon: '🖥️',  activeClass: 'border-blue-500 text-blue-300',    badgeClass: 'bg-blue-900/50 text-blue-300' },
  { id: 'api',    label: 'API',              icon: '🔌',  activeClass: 'border-green-500 text-green-300',  badgeClass: 'bg-green-900/50 text-green-300' },
  { id: 'db',     label: 'Base de données',  icon: '🗄️',  activeClass: 'border-yellow-500 text-yellow-300',badgeClass: 'bg-yellow-900/50 text-yellow-300' },
  { id: 'stripe', label: 'Stripe',           icon: '💳',  activeClass: 'border-purple-500 text-purple-300',badgeClass: 'bg-purple-900/50 text-purple-300' },
  { id: 'cron',   label: 'Cron',             icon: '⏰',  activeClass: 'border-orange-500 text-orange-300',badgeClass: 'bg-orange-900/50 text-orange-300' },
  { id: 'error',  label: 'Erreurs',          icon: '🚨',  activeClass: 'border-red-500 text-red-300',      badgeClass: 'bg-red-900/50 text-red-300' },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  if (bytes < k)       return bytes + ' B'
  if (bytes < k * k)   return (bytes / k).toFixed(1) + ' KB'
  if (bytes < k * k * k) return (bytes / (k * k)).toFixed(1) + ' MB'
  return (bytes / (k * k * k)).toFixed(2) + ' GB'
}

/** Classify a log line into a Tailwind colour class */
function lineColorClass(line: string): string {
  if (line.includes('[ERROR]')) return 'text-red-400'
  if (line.includes('[WARN ]')) return 'text-yellow-400'
  if (line.includes('[DEBUG]')) return 'text-cyan-400'
  return 'text-slate-300'
}

/** Parse `[ts] [LEVEL] message` into parts for nicer rendering */
function parseLine(line: string) {
  const m = line.match(/^(\[[^\]]+\])\s(\[[^\]]+\])\s(.*)$/)
  if (!m) return null
  return { ts: m[1], level: m[2], msg: m[3] }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SizeBar({ size, label }: { size: number; label: string }) {
  const MAX = 500 * 1024 * 1024
  const pct = Math.min(100, (size / MAX) * 100)
  const barClass =
    pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
      <span className="text-slate-500 shrink-0 w-14">{label}</span>
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all duration-300', barClass)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-400 shrink-0 w-28 text-right tabular-nums">
        {formatBytes(size)} / 500 MB
      </span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  initialStats: Record<LogType, LogFileStats>
}

interface TabData {
  lines: string[]
  stats: LogFileStats
}

export default function AdminLogsClient({ initialStats }: Props) {
  const [activeTab, setActiveTab] = useState<LogType>('app')
  const [tabData, setTabData] = useState<Partial<Record<LogType, TabData>>>({})
  const [stats, setStats] = useState<Record<LogType, LogFileStats>>(initialStats)
  const [loading, setLoading] = useState(false)
  const [linesCount, setLinesCount] = useState(500)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const [search, setSearch] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [clearConfirm, setClearConfirm] = useState<LogType | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchLogs = useCallback(
    async (type: LogType, silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`/api/admin/logs?type=${type}&lines=${linesCount}`)
        if (res.ok) {
          const json: TabData = await res.json()
          setTabData(prev => ({ ...prev, [type]: json }))
          setStats(prev => ({ ...prev, [type]: json.stats }))
        }
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [linesCount]
  )

  const refreshStats = useCallback(async () => {
    const res = await fetch('/api/admin/logs?stats=true')
    if (res.ok) {
      const json = await res.json()
      setStats(json.stats)
    }
  }, [])

  // Load on tab change
  useEffect(() => {
    fetchLogs(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, linesCount])

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [tabData, autoScroll])

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => fetchLogs(activeTab, true), refreshInterval * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshInterval, activeTab, fetchLogs])

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleClear = async (type: LogType) => {
    await fetch(`/api/admin/logs?type=${type}`, { method: 'DELETE' })
    const empty: LogFileStats = {
      file1: { size: 0, path: '' },
      file2: { size: 0, path: '' },
      totalSize: 0,
    }
    setTabData(prev => ({ ...prev, [type]: { lines: [], stats: empty } }))
    setClearConfirm(null)
    refreshStats()
  }

  const handleDownload = () => {
    const current = tabData[activeTab]
    if (!current?.lines.length) return
    const blob = new Blob([current.lines.join('\n')], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeTab}-${new Date().toISOString().replace(/[:.]/g, '-')}.log`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // ── Derived values ─────────────────────────────────────────────────────────

  const current = tabData[activeTab]
  const currentStats = stats[activeTab]
  const filteredLines = current?.lines.filter(
    line => !search || line.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const activeTabCfg = LOG_TABS.find(t => t.id === activeTab)!

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen bg-slate-950">
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── Page header ── */}
        <div className="px-6 py-5 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/40 border border-emerald-800/60 flex items-center justify-center">
              <Terminal className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Logs Système</h1>
              <p className="text-slate-400 text-sm">
                Rotation automatique · 2 × 500 MB par canal · lecture temps réel
              </p>
            </div>
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto shrink-0">
          {LOG_TABS.map(tab => {
            const tabStats = stats[tab.id]
            const hasData = tabStats.totalSize > 0
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  setSearch('')
                }}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0',
                  isActive
                    ? cn('bg-slate-800/60', tab.activeClass)
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                )}
              >
                <span className="text-base leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
                {hasData && (
                  <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-normal', tab.badgeClass)}>
                    {formatBytes(tabStats.totalSize)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* ── Controls bar ── */}
        <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center gap-2 shrink-0">
          {/* Lines count */}
          <select
            value={linesCount}
            onChange={e => setLinesCount(Number(e.target.value))}
            className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
          >
            {[100, 500, 1000, 2000].map(n => (
              <option key={n} value={n}>{n.toLocaleString('fr')} lignes</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filtrer les logs…"
              className="w-full bg-slate-800 text-slate-200 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-slate-500 hover:text-slate-200" />
              </button>
            )}
          </div>

          {/* Auto-refresh */}
          <button
            onClick={() => setAutoRefresh(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all border',
              autoRefresh
                ? 'bg-emerald-900/40 text-emerald-300 border-emerald-700'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            )}
          >
            {autoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {autoRefresh ? 'Live' : 'Auto'}
          </button>

          {autoRefresh && (
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="bg-slate-800 text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none"
            >
              {[5, 10, 30, 60].map(s => (
                <option key={s} value={s}>{s}s</option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            onClick={() => fetchLogs(activeTab)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            Rafraîchir
          </button>

          {/* Auto-scroll */}
          <button
            onClick={() => setAutoScroll(v => !v)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-all',
              autoScroll
                ? 'bg-indigo-900/40 text-indigo-300 border-indigo-700'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            )}
            title={autoScroll ? 'Désactiver le défilement auto' : 'Activer le défilement auto'}
          >
            {autoScroll ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            Scroll
          </button>

          <div className="flex-1" />

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!current?.lines.length}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-lg text-sm transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exporter
          </button>

          {/* Clear with confirm */}
          {clearConfirm === activeTab ? (
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs text-red-400 font-medium">Confirmer la suppression ?</span>
              <button
                onClick={() => handleClear(activeTab)}
                className="px-2.5 py-1.5 bg-red-800 hover:bg-red-700 text-red-100 rounded-lg text-xs font-medium transition-colors"
              >
                Effacer
              </button>
              <button
                onClick={() => setClearConfirm(null)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors"
              >
                Annuler
              </button>
            </div>
          ) : (
            <button
              onClick={() => setClearConfirm(activeTab)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-700/60 rounded-lg text-sm transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Effacer
            </button>
          )}
        </div>

        {/* ── Stats bar ── */}
        {currentStats && (
          <div className="px-4 py-2.5 border-b border-slate-800/50 bg-slate-900/20 flex items-center gap-4 shrink-0">
            <SizeBar label="Fichier 1" size={currentStats.file1.size} />
            <div className="w-px h-4 bg-slate-700 shrink-0" />
            <SizeBar label="Fichier 2" size={currentStats.file2.size} />
            <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0 ml-2">
              <HardDrive className="w-3.5 h-3.5" />
              <span className="text-slate-400 font-medium">{formatBytes(currentStats.totalSize)}</span>
              {search && current && (
                <span className="ml-1 text-slate-600">
                  · {filteredLines.length} / {current.lines.length} lignes
                </span>
              )}
            </div>
          </div>
        )}

        {/* ── Log display ── */}
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto font-mono text-xs leading-5 p-4 space-y-0.5 bg-[#0d1117]"
          style={{ minHeight: 0 }}
        >
          {/* Loading state */}
          {loading && !current && (
            <div className="flex items-center justify-center h-40 text-slate-600">
              <RefreshCw className="w-5 h-5 animate-spin mr-2 text-slate-500" />
              <span>Chargement des logs…</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredLines.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-slate-700 gap-2">
              <Terminal className="w-8 h-8 opacity-30" />
              <p className="text-sm">
                {search
                  ? `Aucune ligne ne contient « ${search} »`
                  : `Aucun log pour le canal ${activeTabCfg.label}.`}
              </p>
              {!search && (
                <p className="text-xs text-slate-600">
                  Les événements seront enregistrés ici au fur et à mesure.
                </p>
              )}
            </div>
          )}

          {/* Log lines */}
          {filteredLines.map((line, i) => {
            const colorClass = lineColorClass(line)
            const parsed = parseLine(line)

            if (parsed) {
              return (
                <div
                  key={i}
                  className="flex gap-2 hover:bg-white/[0.03] px-1 rounded group"
                >
                  <span className="text-slate-700 group-hover:text-slate-600 shrink-0 select-none">
                    {parsed.ts}
                  </span>
                  <span className={cn('font-bold shrink-0', colorClass)}>
                    {parsed.level}
                  </span>
                  <span className={cn(
                    colorClass === 'text-slate-300' ? 'text-slate-200' : colorClass,
                    'break-all'
                  )}>
                    {parsed.msg}
                  </span>
                </div>
              )
            }

            return (
              <div key={i} className={cn('px-1 hover:bg-white/[0.03] rounded break-all', colorClass)}>
                {line}
              </div>
            )
          })}

          {/* Bottom anchor */}
          {filteredLines.length > 0 && (
            <div className="pt-4 text-center text-slate-700 text-xs select-none">
              ─── {filteredLines.length} ligne{filteredLines.length > 1 ? 's' : ''} ─── fin des logs ───
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
