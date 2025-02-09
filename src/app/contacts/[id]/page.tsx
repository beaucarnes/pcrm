'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ContactDetails from './ContactDetails'
import { doc, getDoc, collection, query, where, getDocs, DocumentData } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { use } from 'react'
import { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

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

export async function generateMetadata(
  { params }: { params: { id: string } },
  parent: ResolvingMetadata
): Promise<Metadata> {
  const contact = await getContact(params.id)
  
  return {
    title: contact ? `${contact.name} - Personal CRM` : 'Contact Not Found - Personal CRM'
  }
}

export default async function ContactPage({ params }: { params: { id: string } }) {
  try {
    const contact = await getContact(params.id)
    if (!contact) {
      notFound()
    }
    return <ContactDetails contact={contact} />
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred'
    console.error('Error loading contact:', error)
    return <div>Error loading contact: {errorMessage}</div>
  }
} 