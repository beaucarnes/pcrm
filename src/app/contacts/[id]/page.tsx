'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContactDetails from './ContactDetails'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

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
  relationships: RelatedContact[]
  reverseRelationships: RelatedContact[]
}

type RelatedContact = {
  id: string
  sourceId: string
  targetId: string
  type: string
  isMutual: boolean
  source: Contact
  target: Contact
  createdAt: string
}

type PageProps = {
  params: { id: string }
}

async function getContact(id: string): Promise<Contact | null> {
  const docRef = doc(db, 'contacts', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()
  return {
    id: docSnap.id,
    name: data.name,
    birthday: data.birthday || null,
    photoUrl: data.photoUrl || null,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
    company: data.company || null,
    jobTitle: data.jobTitle || null,
    notes: data.notes || null,
    tags: Array.isArray(data.tags) ? data.tags : [],
    userId: data.userId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    relationships: [],
    reverseRelationships: []
  }
}

export default function ContactPage({ params }: PageProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/')
        return
      }

      try {
        const contact = await getContact(params.id)
        if (!contact) {
          setError('Contact not found')
          return
        }
        if (contact.userId !== user.uid) {
          setError('Unauthorized')
          return
        }
        setContact(contact)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [params.id, router])

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