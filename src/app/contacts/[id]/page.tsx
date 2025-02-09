'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContactDetails from './ContactDetails'
import { doc, getDoc, collection, query, where, getDocs, DocumentData } from 'firebase/firestore'
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
  relationships: any[]
  reverseRelationships: any[]
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default function ContactPage({ params }: PageProps) {
  const { id } = use(params)
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
        // Fetch contact data
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
          relationships: [], // We'll fetch these separately
          reverseRelationships: [], // We'll fetch these separately
        })

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
          const targetData = targetDocSnap.data() as DocumentData
          return {
            id: relationshipDoc.id,
            ...relationshipData,
            target: {
              id: targetDocSnap.id,
              name: targetData.name,
              birthday: targetData.birthday,
              photoUrl: targetData.photoUrl,
              email: targetData.email,
              phone: targetData.phone,
              address: targetData.address,
              company: targetData.company,
              jobTitle: targetData.jobTitle,
              notes: targetData.notes,
              tags: targetData.tags || [],
              userId: targetData.userId,
              createdAt: targetData.createdAt,
              updatedAt: targetData.updatedAt,
              relationships: [],
              reverseRelationships: []
            }
          }
        }))

        const reverseRelationships = await Promise.all(reverseRelationshipsSnap.docs.map(async relationshipDoc => {
          const relationshipData = relationshipDoc.data()
          const sourceDocRef = doc(db, 'contacts', relationshipData.sourceId)
          const sourceDocSnap = await getDoc(sourceDocRef)
          const sourceData = sourceDocSnap.data() as DocumentData
          return {
            id: relationshipDoc.id,
            ...relationshipData,
            source: {
              id: sourceDocSnap.id,
              name: sourceData.name,
              birthday: sourceData.birthday,
              photoUrl: sourceData.photoUrl,
              email: sourceData.email,
              phone: sourceData.phone,
              address: sourceData.address,
              company: sourceData.company,
              jobTitle: sourceData.jobTitle,
              notes: sourceData.notes,
              tags: sourceData.tags || [],
              userId: sourceData.userId,
              createdAt: sourceData.createdAt,
              updatedAt: sourceData.updatedAt,
              relationships: [],
              reverseRelationships: []
            }
          }
        }))

        // Update contact with relationships
        setContact(prev => prev ? {
          ...prev,
          relationships,
          reverseRelationships
        } : null)

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