import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function HomePage() {
  if (typeof window !== 'undefined') {
    window.location.href = '/contacts'
    return null
  }
  
  redirect('/contacts')
}
