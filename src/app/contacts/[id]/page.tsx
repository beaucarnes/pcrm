'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import ContactDetails from './ContactDetails'
import { doc, getDoc, query, collection, getDocs, where } from 'firebase/firestore'
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
  params: Promise<{ id: string }>
}

async function getContact(id: string): Promise<Contact | null> {
  const docRef = doc(db, 'contacts', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()

  // Fetch relationships
  const relationshipsQuery = query(
    collection(db, 'relationships'),
    where('sourceId', '==', id)
  )
  const reverseRelationshipsQuery = query(
    collection(db, 'relationships'),
    where('targetId', '==', id)
  )

  const [relationshipsSnap, reverseRelationshipsSnap] = await Promise.all([
    getDocs(relationshipsQuery),
    getDocs(reverseRelationshipsQuery)
  ])

  // Fetch related contacts data
  const relationships = await Promise.all(relationshipsSnap.docs.map(async relationshipDoc => {
    const relationshipData = relationshipDoc.data()
    const targetDocRef = doc(db, 'contacts', relationshipData.targetId)
    const targetDocSnap = await getDoc(targetDocRef)
    const targetData = targetDocSnap.data()
    if (!targetData) {
      console.error('Target contact data not found')
      return null
    }
    const target = {
      id: targetDocSnap.id,
      name: targetData.name || '',
      birthday: targetData.birthday || null,
      photoUrl: targetData.photoUrl || null,
      email: targetData.email || null,
      phone: targetData.phone || null,
      address: targetData.address || null,
      company: targetData.company || null,
      jobTitle: targetData.jobTitle || null,
      notes: targetData.notes || null,
      tags: targetData.tags || [],
      userId: targetData.userId,
      createdAt: targetData.createdAt,
      updatedAt: targetData.updatedAt,
      relationships: [],
      reverseRelationships: []
    }
    return {
      id: relationshipDoc.id,
      sourceId: relationshipData.sourceId,
      targetId: relationshipData.targetId,
      type: relationshipData.type,
      isMutual: relationshipData.isMutual,
      createdAt: relationshipData.createdAt,
      source: data as Contact,
      target
    }
  }))

  const reverseRelationships = await Promise.all(reverseRelationshipsSnap.docs.map(async relationshipDoc => {
    const relationshipData = relationshipDoc.data()
    const sourceDocRef = doc(db, 'contacts', relationshipData.sourceId)
    const sourceDocSnap = await getDoc(sourceDocRef)
    const sourceData = sourceDocSnap.data()
    if (!sourceData) {
      console.error('Source contact data not found')
      return null
    }
    const source = {
      id: sourceDocSnap.id,
      name: sourceData.name || '',
      birthday: sourceData.birthday || null,
      photoUrl: sourceData.photoUrl || null,
      email: sourceData.email || null,
      phone: sourceData.phone || null,
      address: sourceData.address || null,
      company: sourceData.company || null,
      jobTitle: sourceData.jobTitle || null,
      notes: sourceData.notes || null,
      tags: sourceData.tags || [],
      userId: sourceData.userId,
      createdAt: sourceData.createdAt,
      updatedAt: sourceData.updatedAt,
      relationships: [],
      reverseRelationships: []
    }
    return {
      id: relationshipDoc.id,
      sourceId: relationshipData.sourceId,
      targetId: relationshipData.targetId,
      type: relationshipData.type,
      isMutual: relationshipData.isMutual,
      createdAt: relationshipData.createdAt,
      source,
      target: data as Contact
    }
  }))

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
    relationships: relationships.filter((r): r is NonNullable<typeof r> => r !== null),
    reverseRelationships: reverseRelationships.filter((r): r is NonNullable<typeof r> => r !== null)
  }
}

export default function ContactPage({ params }: PageProps) {
  const [contact, setContact] = useState<Contact | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const { id } = use(params)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        router.push('/')
        return
      }

      try {
        const contact = await getContact(id)
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