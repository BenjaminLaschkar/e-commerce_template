import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyToken } from '@/lib/auth'
import MediaClient from '@/components/admin/MediaClient'

export default async function AdminMediaPage() {
  const cookieStore = cookies()
  const token = cookieStore.get('admin_token')?.value
  if (!token || !verifyToken(token)) redirect('/admin/login')

  return <MediaClient />
}
