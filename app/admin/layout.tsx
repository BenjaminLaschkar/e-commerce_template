// La protection est gérée par middleware.ts
// (évite la boucle infinie sur /admin/login)
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
