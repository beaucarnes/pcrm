'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'

type Contact = {
  id: string
  name: string
  photoUrl: string | null
  jobTitle: string | null
  company: string | null
  tags: Array<{
    id: string
    name: string
  }>
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(auth.currentUser)

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setUser(user)
      if (!user) {
        // Clear contacts when user signs out
        setContacts([])
        setIsLoading(false)
        return
      }

      // Create a query against the collection
      const q = query(
        collection(db, 'contacts'),
        where('userId', '==', user.uid)
      );

      // Listen to query
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const contactsData: Contact[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          contactsData.push({
            id: doc.id,
            name: data.name,
            photoUrl: data.photoUrl,
            jobTitle: data.jobTitle,
            company: data.company,
            tags: data.tags || [],
          });
        });
        setContacts(contactsData);
        setIsLoading(false);
      }, (error) => {
        console.error('Error fetching contacts:', error);
        setIsLoading(false);
      });

      return () => unsubscribe();
    });

    return () => unsubscribeAuth();
  }, []);

  const filteredContacts = contacts.filter(contact => {
    const searchLower = searchQuery.toLowerCase()
    return (
      contact.name.toLowerCase().includes(searchLower) ||
      (contact.company?.toLowerCase() || '').includes(searchLower) ||
      (contact.jobTitle?.toLowerCase() || '').includes(searchLower) ||
      contact.tags.some(tag => tag.name.toLowerCase().includes(searchLower))
    )
  })

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
        <div className="flex items-center gap-4">
          <div className="relative flex-1 sm:min-w-[300px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search contacts..."
              className="block w-full rounded-md border-0 px-4 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span className="sr-only">Clear search</span>
              </button>
            )}
          </div>
          {user && (
            <Link
              href="/contacts/new"
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap"
            >
              Add Contact
            </Link>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse text-gray-500">Loading contacts...</div>
        </div>
      ) : !user ? (
        <div className="text-center py-12">
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            Please sign in to view your contacts
          </h3>
        </div>
      ) : filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredContacts.map((contact) => (
            <div
              key={contact.id}
              className="group relative bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1"
            >
              <Link href={`/contacts/${contact.id}`} className="block">
                <div className="aspect-[4/3] relative overflow-hidden rounded-t-xl bg-gray-100">
                  {contact.photoUrl ? (
                    <Image
                      src={contact.photoUrl}
                      alt=""
                      fill
                      className="object-cover transition-transform duration-200 group-hover:scale-105"
                      sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      priority
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-indigo-100">
                      <span className="text-6xl font-medium text-indigo-600">
                        {contact.name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </div>
                
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors duration-200">
                    {contact.name}
                  </h2>
                  
                  {(contact.jobTitle || contact.company) && (
                    <p className="mt-2 text-sm text-gray-600">
                      {[contact.jobTitle, contact.company].filter(Boolean).join(' at ')}
                    </p>
                  )}
                  
                  {contact.tags.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {contact.tags.map(tag => (
                        <span
                          key={`${contact.id}-${tag.name}`}
                          className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>

              <Link
                href={`/contacts/${contact.id}/edit`}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0 inline-flex items-center rounded-full bg-white p-2 text-indigo-600 shadow-lg hover:bg-indigo-50 transition-colors duration-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                <span className="sr-only">Edit</span>
              </Link>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-semibold text-gray-900">
            {searchQuery ? 'No matching contacts found' : 'No contacts'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search terms' : 'Get started by creating a new contact.'}
          </p>
          {!searchQuery && (
            <div className="mt-6">
              <Link
                href="/contacts/new"
                className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add Contact
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 