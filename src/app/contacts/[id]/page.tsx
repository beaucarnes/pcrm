'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContactDetails from './ContactDetails'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { use } from 'react'

type Tag = {
  id: string
  name: string
}

type Contact = {
  id: string
  name: string
  birthday: string | null
  photoUrl: string | null
  email: string | null
  phone: string | null
  address: string | null
  company: string | null
  jobTitle: string | null
  notes: string | null
  tags: Tag[]
  userId: string
  createdAt: string
  updatedAt: string
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default function ContactPage({ params }: PageProps) {
  const { id } = use(params)
  const [contact, setContact] = useState<Contact | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/')
        return
      }

      try {
        const docRef = doc(db, 'contacts', id)
        const docSnap = await getDoc(docRef)

        if (!docSnap.exists()) {
          setError('Contact not found')
          setIsLoading(false)
          return
        }

        const data = docSnap.data()
        if (data.userId !== user.uid) {
          setError('Unauthorized')
          setIsLoading(false)
          return
        }

        // Transform the data to match our Contact type
        setContact({
          id: docSnap.id,
          name: data.name,
          birthday: data.birthday,
          photoUrl: data.photoUrl,
          email: data.email,
          phone: data.phone,
          address: data.address,
          company: data.company,
          jobTitle: data.jobTitle,
          notes: data.notes,
          tags: Array.isArray(data.tags) ? data.tags : [],
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      } catch (error) {
        console.error('Error fetching contact:', error)
        setError('Failed to load contact')
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [id, router])

  if (isLoading) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    )
  }

  if (!contact) {
    return null
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ContactDetails contact={contact} />
      </div>
    </div>
  )
} 