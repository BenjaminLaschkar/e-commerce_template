'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, X, Check, RefreshCw, Images } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'

interface MediaFile {
  name: string
  url: string
  size: number
  createdAt: string
}

interface MediaPickerProps {
  open: boolean
  onClose: () => void
  /** Called with the selected URL(s) */
  onSelect: (urls: string[]) => void
  /** Allow picking multiple images at once (default: false → single click = immediate select) */
  multiple?: boolean
}

export default function MediaPicker({ open, onClose, onSelect, multiple = false }: MediaPickerProps) {
  const { toast } = useToast()
  const [files, setFiles] = useState<MediaFile[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [uploading, setUploading] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/media')
      if (!res.ok) throw new Error()
      const { files: list } = await res.json()
      setFiles(
        [...(list ?? [])].sort(
          (a: MediaFile, b: MediaFile) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
      )
    } catch {
      // silent — let user retry with upload
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchFiles()
      setSelected(new Set())
    }
  }, [open, fetchFiles])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const toggleSelect = (url: string) => {
    if (!multiple) {
      onSelect([url])
      onClose()
      return
    }
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(url)) next.delete(url)
      else next.add(url)
      return next
    })
  }

  const handleConfirm = () => {
    if (selected.size === 0) return
    onSelect(Array.from(selected))
    onClose()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(e.target.files ?? [])
    if (!uploadedFiles.length) return
    setUploading(true)
    try {
      for (const file of uploadedFiles) {
        const fd = new FormData()
        fd.append('file', file)
        await fetch('/api/admin/upload', { method: 'POST', body: fd })
      }
      await fetchFiles()
    } catch {
      toast({ variant: 'destructive', title: 'Upload échoué' })
    } finally {
      setUploading(false)
      if (uploadRef.current) uploadRef.current.value = ''
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Médiathèque</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {multiple
                ? 'Sélectionnez une ou plusieurs images, puis cliquez Ajouter'
                : 'Cliquez sur une image pour la sélectionner'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
            <Button
              variant="outline" size="sm"
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Upload...' : 'Uploader'}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchFiles} disabled={loading} className="gap-1.5 px-2">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Fermer"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <RefreshCw className="w-7 h-7 animate-spin mb-2 opacity-40" />
              <p className="text-sm">Chargement...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Images className="w-10 h-10 mb-2 opacity-30" />
              <p className="text-sm">Aucune image. Uploadez-en avec le bouton ci-dessus.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
              {files.map(file => {
                const isSelected = selected.has(file.url)
                return (
                  <button
                    key={file.name}
                    type="button"
                    onClick={() => toggleSelect(file.url)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all focus:outline-none ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-200'
                        : 'border-transparent hover:border-indigo-300'
                    }`}
                    title={file.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.url}
                      alt={file.name}
                      className="w-full h-full object-cover bg-gray-100"
                      loading="lazy"
                    />
                    {isSelected && (
                      <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center shadow-md">
                        <Check className="w-3.5 h-3.5 text-white" />
                      </div>
                    )}
                    {/* Filename tooltip on hover */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                      <p className="text-white text-[10px] truncate">{file.name}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer (only in multiple mode) */}
        {multiple && (
          <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50 rounded-b-2xl shrink-0">
            <p className="text-sm text-gray-500">
              {selected.size > 0
                ? <><strong>{selected.size}</strong> image{selected.size > 1 ? 's' : ''} sélectionnée{selected.size > 1 ? 's' : ''}</>
                : 'Aucune sélection'}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>Annuler</Button>
              <Button
                size="sm"
                onClick={handleConfirm}
                disabled={selected.size === 0}
                className="gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Ajouter{selected.size > 0 ? ` (${selected.size})` : ''}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
