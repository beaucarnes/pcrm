'use client'

import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { useState } from 'react'
import { doc, updateDoc, collection, query, where, getDocs, addDoc, deleteDoc, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type Tag = {
  id: string
  name: string
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

export default function ContactDetails({ contact }: { contact: Contact }) {
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [notes, setNotes] = useState(contact.notes || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Get all relationships (both directions)
  const allRelationships = [...(contact.relationships || []), ...(contact.reverseRelationships || [])]
    .filter((relationship, index, self) => {
      // Keep only the first occurrence of each relationship pair
      return index === self.findIndex(r => 
        (r.sourceId === relationship.sourceId && r.targetId === relationship.targetId) ||
        (r.sourceId === relationship.targetId && r.targetId === relationship.sourceId)
      );
    });

  const handleSearch = async (searchText: string) => {
    setSearchQuery(searchText)
    if (!searchText.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const contactsRef = collection(db, 'contacts')
      const searchQuery = query(
        contactsRef,
        where('userId', '==', contact.userId)
      )
      const querySnapshot = await getDocs(searchQuery)
      
      const results: Contact[] = []
      querySnapshot.forEach((doc) => {
        const data = doc.data() as {
          name: string;
          birthday: string | null;
          photoUrl: string | null;
          email: string | null;
          phone: string | null;
          address: string | null;
          company: string | null;
          jobTitle: string | null;
          notes: string | null;
          tags: Tag[];
          userId: string;
          createdAt: string;
          updatedAt: string;
        }
        
        // Filter by name client-side
        if (doc.id !== contact.id && 
            data.name.toLowerCase().includes(searchText.toLowerCase())) {
          results.push({
            id: doc.id,
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
            relationships: [],
            reverseRelationships: [],
          })
        }
      })
      
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching contacts:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddRelationship = async (targetContact: Contact) => {
    try {
      // Create the relationship
      await addDoc(collection(db, 'relationships'), {
        sourceId: contact.id,
        targetId: targetContact.id,
        type: 'connected',
        isMutual: true,
        createdAt: new Date().toISOString(),
      })

      // If mutual, create the reverse relationship
      await addDoc(collection(db, 'relationships'), {
        sourceId: targetContact.id,
        targetId: contact.id,
        type: 'connected',
        isMutual: true,
        createdAt: new Date().toISOString(),
      })

      // Clear search
      setSearchQuery('')
      setSearchResults([])
      
      // Refresh the page to show new relationship
      window.location.reload()
    } catch (error) {
      console.error('Error adding relationship:', error)
    }
  }

  const handleRemoveRelationship = async (relatedContact: RelatedContact) => {
    try {
      // Delete the relationship document
      await deleteDoc(doc(db, 'relationships', relatedContact.id))

      // If it's mutual, find and delete the reverse relationship
      if (relatedContact.isMutual) {
        const reverseQuery = query(
          collection(db, 'relationships'),
          where('sourceId', '==', relatedContact.targetId),
          where('targetId', '==', relatedContact.sourceId),
          where('type', '==', relatedContact.type)
        )
        const reverseSnapshot = await getDocs(reverseQuery)
        if (!reverseSnapshot.empty) {
          await deleteDoc(doc(db, 'relationships', reverseSnapshot.docs[0].id))
        }
      }
      
      // Refresh the page to show updated relationships
      window.location.reload()
    } catch (error) {
      console.error('Error removing relationship:', error)
    }
  }

  const handleSaveNotes = async () => {
    setIsSaving(true)
    setError('')
    try {
      const docRef = doc(db, 'contacts', contact.id)
      await updateDoc(docRef, {
        notes: notes.trim() || null,
        updatedAt: new Date().toISOString(),
      })
      setIsEditingNotes(false)
    } catch (error) {
      console.error('Error updating notes:', error)
      setError('Failed to save notes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-8 py-6 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
        <div className="flex items-center gap-x-4">
          {contact.photoUrl ? (
            <Image
              src={contact.photoUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
              unoptimized
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
              <span className="text-xl font-medium text-indigo-600">
                {contact.name.substring(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{contact.name}</h2>
            {contact.jobTitle && contact.company && (
              <p className="mt-1 text-sm text-gray-600">
                {contact.jobTitle} at {contact.company}
              </p>
            )}
          </div>
        </div>
        <Link
          href={`/contacts/${contact.id}/edit`}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Edit
        </Link>
      </div>

      <div className="px-8 py-6">
        <div className="space-y-8">
          {/* Notes */}
          <div>
            <div className="flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-900">Notes</h3>
              {!isEditingNotes && (
                <button
                  onClick={() => setIsEditingNotes(true)}
                  className="text-indigo-600 hover:text-indigo-500 p-1 rounded-full hover:bg-indigo-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  <span className="sr-only">Edit notes</span>
                </button>
              )}
            </div>
            {isEditingNotes ? (
              <div className="mt-3 space-y-3">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholder="Add notes about this contact..."
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="flex justify-end gap-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingNotes(false)
                      setNotes(contact.notes || '')
                      setError('')
                    }}
                    className="text-sm font-semibold text-gray-900 hover:text-gray-700"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNotes}
                    disabled={isSaving}
                    className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-gray-600 whitespace-pre-wrap">
                {notes || 'No notes added yet.'}
              </div>
            )}
          </div>

          {/* Contact Information */}
          {(contact.email || contact.phone || contact.address || contact.birthday) && (
            <div>
              <h3 className="text-base font-semibold text-gray-900">Contact Information</h3>
              <dl className="mt-3 space-y-3">
                {contact.email && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:text-indigo-500">
                        {contact.email}
                      </a>
                    </dd>
                  </div>
                )}
                {contact.phone && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      <a href={`tel:${contact.phone}`} className="text-indigo-600 hover:text-indigo-500">
                        {contact.phone}
                      </a>
                    </dd>
                  </div>
                )}
                {contact.address && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Address</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contact.address}</dd>
                  </div>
                )}
                {contact.birthday && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Birthday</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {format(new Date(contact.birthday), 'MMMM do, yyyy')}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Professional Information */}
          {(contact.company || contact.jobTitle) && (
            <div>
              <h3 className="text-base font-semibold text-gray-900">Professional Information</h3>
              <dl className="mt-3 space-y-3">
                {contact.company && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Company</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contact.company}</dd>
                  </div>
                )}
                {contact.jobTitle && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Job Title</dt>
                    <dd className="mt-1 text-sm text-gray-900">{contact.jobTitle}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Related Contacts */}
          {allRelationships.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900">Related Contacts</h3>
              <div className="mt-3 space-y-3">
                {allRelationships.map((relationship) => {
                  const relatedContact = relationship.sourceId === contact.id ? relationship.target : relationship.source
                  return (
                    <div key={relationship.id} className="flex items-center">
                      <Link
                        href={`/contacts/${relatedContact.id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-500"
                      >
                        {relatedContact.name}
                      </Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {contact.tags?.length > 0 && (
            <div>
              <h3 className="text-base font-semibold text-gray-900">Tags</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {contact.tags.map(tag => (
                  <span
                    key={`${contact.id}-${tag.name}`}
                    className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 