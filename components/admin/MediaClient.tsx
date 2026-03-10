'use client'

import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Copy, Check, RefreshCw, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import AdminSidebar from '@/components/admin/Sidebar'

interface MediaFile {
  name: string
  url: string
  size: number
  createdAt: string
  modifiedAt: string
}

type SortMode = 'chrono-desc' | 'chrono-asc' | 'alpha-asc' | 'alpha-desc'

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function MediaClient() {
  const { toast } = useToast()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [sort, setSort] = useState<SortMode>('chrono-desc')
  const [perPage, setPerPage] = useState(20)
  const [page, setPage] = useState(1)
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const fetchFiles = async () => {
    setLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000) // 10 s
    try {
      const res = await fetch('/api/admin/media', { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFiles(data.files ?? [])
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        toast({ variant: 'destructive', title: 'Délai dépassé. Réessayez.' })
      } else {
        toast({ variant: 'destructive', title: 'Impossible de charger les médias.' })
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  useEffect(() => { fetchFiles() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sorted = [...files].sort((a, b) => {
    if (sort === 'chrono-desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    if (sort === 'chrono-asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    if (sort === 'alpha-asc') return a.name.localeCompare(b.name)
    return b.name.localeCompare(a.name)
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const currentPage = Math.min(page, totalPages)
  const paginated = sorted.slice((currentPage - 1) * perPage, currentPage * perPage)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files ?? [])
    if (!uploadedFiles.length) return
    setUploading(true)
    let count = 0
    try {
      for (const file of uploadedFiles) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
        if (res.ok) count++
      }
      toast({ title: `${count} fichier(s) uploadé(s)` })
      await fetchFiles()
      setPage(1)
    } catch {
      toast({ variant: 'destructive', title: 'Upload échoué' })
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url)
    setCopiedUrl(url)
    setTimeout(() => setCopiedUrl(null), 2000)
    toast({ title: 'URL copiée !' })
  }

  const handleDelete = async (name: string) => {
    if (!confirm(`Supprimer "${name}" définitivement ?`)) return
    setDeletingFile(name)
    try {
      const res = await fetch(`/api/admin/media?filename=${encodeURIComponent(name)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setFiles(f => f.filter(x => x.name !== name))
      toast({ title: 'Fichier supprimé' })
    } catch {
      toast({ variant: 'destructive', title: 'Suppression échouée' })
    } finally {
      setDeletingFile(null)
    }
  }

  // Pagination window: always show at most 5 page buttons
  const pageButtons = () => {
    if (totalPages <= 1) return []
    const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4))
    const end = Math.min(totalPages, start + 4)
    return Array.from({ length: end - start + 1 }, (_, i) => start + i)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">

          {/* ── Header ── */}
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Médiathèque</h1>
              <p className="text-gray-500 text-sm mt-0.5">
                {files.length} fichier{files.length !== 1 ? 's' : ''} —{' '}
                <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">/public/uploads/</code>
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={sort}
                onChange={e => { setSort(e.target.value as SortMode); setPage(1) }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="chrono-desc">Plus récent d&apos;abord</option>
                <option value="chrono-asc">Plus ancien d&apos;abord</option>
                <option value="alpha-asc">Alphabétique A → Z</option>
                <option value="alpha-desc">Alphabétique Z → A</option>
              </select>
              <select
                value={perPage}
                onChange={e => { setPerPage(Number(e.target.value)); setPage(1) }}
                className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value={10}>10 / page</option>
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading} className="gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualiser
              </Button>
              <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
              <Button size="sm" onClick={() => uploadRef.current?.click()} disabled={uploading} className="gap-2">
                <Upload className="w-4 h-4" />
                {uploading ? 'Upload...' : 'Ajouter des images'}
              </Button>
            </div>
          </div>

          {/* ── Grid ── */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-gray-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 opacity-40" />
              <p>Chargement...</p>
            </div>
          ) : paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
              <Images className="w-14 h-14 mb-3 opacity-25" />
              <p className="font-medium text-gray-500">Aucune image</p>
              <p className="text-sm mt-1">Cliquez &quot;Ajouter des images&quot; pour uploader.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {paginated.map(file => (
                <div
                  key={file.name}
                  className="group relative bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail */}
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="px-2.5 py-2">
                    <p className="text-xs font-medium text-gray-700 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <div className="flex items-center justify-between mt-0.5">
                      <span className="text-xs text-gray-400">{formatBytes(file.size)}</span>
                      <span className="text-xs text-gray-300">{formatDate(file.createdAt)}</span>
                    </div>
                  </div>

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all pointer-events-none group-hover:pointer-events-auto flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => handleCopy(file.url)}
                      className="p-2 bg-white rounded-lg shadow hover:bg-gray-50 transition-colors"
                      title="Copier l'URL"
                    >
                      {copiedUrl === file.url
                        ? <Check className="w-4 h-4 text-green-600" />
                        : <Copy className="w-4 h-4 text-gray-700" />
                      }
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(file.name)}
                      disabled={deletingFile === file.name}
                      className="p-2 bg-white rounded-lg shadow hover:bg-red-50 transition-colors disabled:opacity-50"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Page {currentPage} / {totalPages} &nbsp;·&nbsp; {sorted.length} fichier{sorted.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  ←
                </Button>
                {pageButtons().map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-indigo-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  →
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
