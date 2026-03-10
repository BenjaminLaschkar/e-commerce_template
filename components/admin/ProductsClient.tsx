'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Plus, Search, Pencil, Trash2, ToggleLeft, ToggleRight, Package, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import AdminSidebar from '@/components/admin/Sidebar'
import { formatPrice, formatDate } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { useRouter } from 'next/navigation'

interface Product {
  id: string
  name: string
  slug: string
  price: number
  comparePrice: number | null
  stock: number
  isActive: boolean
  images: string[]
  sku: string | null
  createdAt: Date
  _count: { orderItems: number; cartItems: number }
}

export default function AdminProductsClient({ products: initialProducts }: { products: Product[] }) {
  const [products, setProducts] = useState(initialProducts)
  const [search, setSearch] = useState('')
  const { toast } = useToast()
  const router = useRouter()

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase())
  )

  const toggleActive = async (id: string, current: boolean) => {
    const res = await fetch(`/api/products/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })

    if (res.ok) {
      setProducts(products.map((p) => (p.id === id ? { ...p, isActive: !current } : p)))
      toast({ title: !current ? '✅ Produit activé' : '⏸ Produit désactivé' })
    }
  }

  const deleteProduct = async (id: string, name: string) => {
    if (!confirm(`Supprimer "${name}" ? Cette action est irréversible.`)) return

    const res = await fetch(`/api/products/${id}`, { method: 'DELETE' })
    if (res.ok) {
      setProducts(products.filter((p) => p.id !== id))
      toast({ title: '🗑️ Produit supprimé' })
    } else {
      toast({ variant: 'destructive', title: 'Erreur suppression' })
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <AdminSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
              <p className="text-gray-500 text-sm">{products.length} produit{products.length > 1 ? 's' : ''} au total</p>
            </div>
            <Link href="/admin/products/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouveau produit
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit..."
              className="pl-9"
            />
          </div>

          {/* Products table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ventes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filtered.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                              {product.images[0] ? (
                                <Image
                                  src={product.images[0]}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                />
                              ) : (
                                <Package className="w-5 h-5 text-gray-400 m-auto mt-3" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{product.name}</p>
                              <p className="text-xs text-gray-400 font-mono">{product.sku || product.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-indigo-600">{formatPrice(product.price)}</p>
                          {product.comparePrice && (
                            <p className="text-xs text-gray-400 line-through">{formatPrice(product.comparePrice)}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-medium ${product.stock === 0 ? 'text-red-600' : product.stock < 10 ? 'text-orange-500' : 'text-gray-900'}`}>
                            {product.stock === 0 ? '⚠ Épuisé' : product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {product._count.orderItems} vente{product._count.orderItems > 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant={product.isActive ? 'success' : 'secondary'}>
                            {product.isActive ? '● Actif' : '○ Inactif'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/products/${product.slug}`} target="_blank" title="Voir la page produit">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-indigo-400 hover:text-indigo-600">
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Link href={`/admin/products/${product.id}/edit`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toggleActive(product.id, product.isActive)}
                            >
                              {product.isActive ? (
                                <ToggleRight className="w-4 h-4 text-green-500" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => deleteProduct(product.id, product.name)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>Aucun produit trouvé</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
