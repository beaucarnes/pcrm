'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, limit } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { use } from 'react'
import { CloudinaryWidgetOptions } from '@/types/cloudinary'
import { DocumentData } from 'firebase/firestore'

type Tag = {
  id: string;
  name: string;
}

type Contact = {
  id: string;
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
  relationships: RelatedContact[];
  reverseRelationships: RelatedContact[];
}

type FormData = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  jobTitle: string;
  notes: string;
  photoUrl: string;
  birthday: Date | null;
  tags: Tag[];
}

type CloudinaryCallbackResult = {
  event: string;
  info?: {
    secure_url: string;
  };
}

type PageProps = {
  params: Promise<{ id: string }>
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryWidgetOptions,
        callback: (error: Error | null, result: CloudinaryCallbackResult) => void
      ) => { open: () => void };
    };
  }
}

type RelatedContact = {
  id: string;
  sourceId: string;
  targetId: string;
  type: string;
  isMutual: boolean;
  source: Contact;
  target: Contact;
  createdAt: string;
}

export default function EditContactPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    id: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    jobTitle: '',
    notes: '',
    photoUrl: '',
    birthday: null,
    tags: [],
  })
  const [newTag, setNewTag] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Contact[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [allRelationships, setAllRelationships] = useState<RelatedContact[]>([])

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
          if (!targetData) {
            console.error('Target contact data not found')
            return null
          }
          return {
            id: relationshipDoc.id,
            sourceId: relationshipData.sourceId,
            targetId: relationshipData.targetId,
            type: relationshipData.type,
            isMutual: relationshipData.isMutual,
            createdAt: relationshipData.createdAt,
            target: {
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
          }
        }))

        const reverseRelationships = await Promise.all(reverseRelationshipsSnap.docs.map(async relationshipDoc => {
          const relationshipData = relationshipDoc.data()
          const sourceDocRef = doc(db, 'contacts', relationshipData.sourceId)
          const sourceDocSnap = await getDoc(sourceDocRef)
          const sourceData = sourceDocSnap.data() as DocumentData
          if (!sourceData) {
            console.error('Source contact data not found')
            return null
          }
          return {
            id: relationshipDoc.id,
            sourceId: relationshipData.sourceId,
            targetId: relationshipData.targetId,
            type: relationshipData.type,
            isMutual: relationshipData.isMutual,
            createdAt: relationshipData.createdAt,
            source: {
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
          }
        }))

        // Filter out any null values and combine relationships
        const validRelationships = (
          [...relationships, ...reverseRelationships]
            .filter((r): r is NonNullable<typeof r> => r !== null)
            .filter((relationship, index, self) => {
              // Keep only the first occurrence of each relationship pair
              return index === self.findIndex(r => 
                (r.sourceId === relationship.sourceId && r.targetId === relationship.targetId) ||
                (r.sourceId === relationship.targetId && r.targetId === relationship.sourceId)
              );
            })
            .map(r => {
              const isForwardRelationship = 'target' in r;
              return {
                id: r.id,
                sourceId: r.sourceId,
                targetId: r.targetId,
                type: r.type,
                isMutual: r.isMutual,
                createdAt: r.createdAt,
                source: isForwardRelationship ? formData : r.source,
                target: isForwardRelationship ? r.target : formData
              };
            })
        ) as RelatedContact[]
        
        setAllRelationships(validRelationships)

        // Set form data
        const birthday = data.birthday ? new Date(data.birthday) : null
        setFormData({
          id: docSnap.id,
          name: data.name,
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          company: data.company || '',
          jobTitle: data.jobTitle || '',
          notes: data.notes || '',
          photoUrl: data.photoUrl || '',
          birthday,
          tags: Array.isArray(data.tags) ? data.tags : [],
        })

        setIsLoading(false)
      } catch (error) {
        console.error('Error:', error)
        setError(error instanceof Error ? error.message : 'An error occurred')
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [id, router])

  // Reset selected index when search results change
  useEffect(() => {
    setSelectedIndex(-1)
  }, [searchResults])

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < searchResults.length) {
          handleAddRelationship(searchResults[selectedIndex])
        }
        break
      case 'Escape':
        setSearchQuery('')
        setSearchResults([])
        break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!auth.currentUser) {
      setError('You must be signed in to update a contact')
      return
    }

    try {
      const contactData = {
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        address: formData.address || null,
        company: formData.company || null,
        jobTitle: formData.jobTitle || null,
        notes: formData.notes || null,
        photoUrl: formData.photoUrl || null,
        birthday: formData.birthday?.toISOString() || null,
        tags: formData.tags,
        updatedAt: new Date().toISOString(),
      }

      const docRef = doc(db, 'contacts', id)
      await updateDoc(docRef, contactData)

      router.push(`/contacts/${id}`)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update contact')
      console.error('Error updating contact:', error)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTag.trim()) {
      e.preventDefault()
      if (!formData.tags.some(tag => tag.name === newTag.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, { id: '', name: newTag.trim() }]
        }))
      }
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: Tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.name !== tagToRemove.name)
    }))
  }

  async function handleDelete() {
    if (!window.confirm('Are you sure you want to delete this contact? This action cannot be undone.')) {
      return
    }

    if (!auth.currentUser) {
      setError('You must be signed in to delete a contact')
      return
    }

    setIsDeleting(true)
    try {
      const docRef = doc(db, 'contacts', id)
      await deleteDoc(docRef)
      router.push('/contacts')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to delete contact')
      setIsDeleting(false)
    }
  }

  const handleSearch = async (searchText: string) => {
    setSearchQuery(searchText)
    setIsSearching(true)

    try {
      if (!auth.currentUser) {
        setError('You must be signed in to search contacts')
        return
      }

      const contactsRef = collection(db, 'contacts')
      const q = query(
        contactsRef,
        where('userId', '==', auth.currentUser.uid)
      )
      
      const querySnapshot = await getDocs(q)
      const results: Contact[] = []
      
      querySnapshot.forEach((doc) => {
        const data = doc.data() as DocumentData
        // Only include contacts that match the search query and aren't the current contact
        if (doc.id !== id && 
            data.name.toLowerCase().includes(searchText.toLowerCase())) {
          results.push({
            id: doc.id,
            name: data.name || '',
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
          })
        }
      })
      
      setSearchResults(results)
    } catch (error) {
      console.error('Error searching contacts:', error)
      setSearchResults([])
      setError(error instanceof Error ? error.message : 'Failed to search contacts')
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddRelationship = async (targetContact: Contact) => {
    if (!auth.currentUser) {
      setError('You must be signed in to add a relationship')
      return
    }

    try {
      // Create the relationship
      const relationshipData = {
        sourceId: id,
        targetId: targetContact.id,
        type: 'connected',
        isMutual: true,
        createdAt: new Date().toISOString(),
      }

      const relationshipRef = await addDoc(collection(db, 'relationships'), relationshipData)

      // If mutual, create the reverse relationship
      await addDoc(collection(db, 'relationships'), {
        sourceId: targetContact.id,
        targetId: id,
        type: 'connected',
        isMutual: true,
        createdAt: new Date().toISOString(),
      })

      const newRelationship: RelatedContact = {
        id: relationshipRef.id,
        sourceId: id,
        targetId: targetContact.id,
        type: 'connected',
        isMutual: true,
        createdAt: new Date().toISOString(),
        source: {
          ...formData,
          userId: auth.currentUser.uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          relationships: [],
          reverseRelationships: [],
          birthday: formData.birthday?.toISOString() || null,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          company: formData.company || null,
          jobTitle: formData.jobTitle || null,
          notes: formData.notes || null,
          photoUrl: formData.photoUrl || null,
        },
        target: targetContact
      }

      setAllRelationships(prev => [...prev, newRelationship])

      // Clear search
      setSearchQuery('')
      setSearchResults([])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to add relationship')
      console.error('Error adding relationship:', error)
    }
  }

  const handleRemoveRelationship = async (relationship: RelatedContact) => {
    if (!window.confirm('Are you sure you want to remove this relationship? This action cannot be undone.')) {
      return
    }

    if (!auth.currentUser) {
      setError('You must be signed in to remove a relationship')
      return
    }

    try {
      // Delete the relationship document
      await deleteDoc(doc(db, 'relationships', relationship.id))

      // If it's mutual, find and delete the reverse relationship
      if (relationship.isMutual) {
        const reverseQuery = query(
          collection(db, 'relationships'),
          where('sourceId', '==', relationship.targetId),
          where('targetId', '==', relationship.sourceId),
          where('type', '==', relationship.type)
        )
        const reverseSnapshot = await getDocs(reverseQuery)
        if (!reverseSnapshot.empty) {
          await deleteDoc(doc(db, 'relationships', reverseSnapshot.docs[0].id))
        }
      }

      setAllRelationships(prev => prev.filter(r => r.id !== relationship.id))
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to remove relationship')
    }
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error}</div>
  }

  if (!auth.currentUser) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-semibold text-gray-900">
          Please sign in to edit contacts
        </h3>
      </div>
    )
  }

  return (
    <div className="py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg overflow-hidden">
            <div className="px-8 py-6 bg-indigo-50 border-b border-indigo-100">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Edit Contact</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Update the contact information below.
                  </p>
                </div>
                <div className="flex items-center gap-x-4">
                  <Link
                    href={`/contacts/${id}`}
                    className="text-sm font-semibold text-gray-900 hover:text-gray-700"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  >
                    Save changes
                  </button>
                </div>
              </div>
            </div>

            <div className="px-8 py-6">
              <div className="space-y-6">
                {/* Photo upload section */}
                <div className="flex items-center gap-x-3">
                  <div className="relative">
                    {formData.photoUrl ? (
                      <Image
                        src={formData.photoUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center">
                        <span className="text-indigo-600 font-medium text-xl">
                          {formData.name ? formData.name.substring(0, 2).toUpperCase() : 'Add'}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsUploading(true);
                      setError('');
                      
                      const uploadWidget = window.cloudinary.createUploadWidget(
                        {
                          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
                          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
                          maxFiles: 1,
                          sources: ['local', 'url', 'camera'],
                          cropping: true,
                          croppingAspectRatio: 1,
                          croppingShowDimensions: true,
                          croppingValidateDimensions: true,
                          croppingShowBackButton: true,
                          croppingDefaultSelectionRatio: 1,
                          croppingCoordinatesMode: 'custom',
                          showSkipCropButton: false,
                          multiple: false,
                          clientAllowedFormats: ['image'],
                          maxImageFileSize: 10000000, // 10MB
                          showAdvancedOptions: false,
                          defaultSource: 'local',
                          singleUploadAutoClose: true,
                          showCompletedButton: false,
                          theme: 'minimal',
                          resourceType: 'image',
                          folder: 'contacts',
                          eager: [{ crop: 'custom', gravity: 'custom', width: 250, height: 250 }],
                          eagerAsync: false,
                          styles: {
                            palette: {
                              window: "#FFFFFF",
                              windowBorder: "#90A0B3",
                              tabIcon: "#0078FF",
                              menuIcons: "#5A616A",
                              textDark: "#000000",
                              textLight: "#FFFFFF",
                              link: "#0078FF",
                              action: "#FF620C",
                              inactiveTabIcon: "#0E2F5A",
                              error: "#F44235",
                              inProgress: "#0078FF",
                              complete: "#20B832",
                              sourceBg: "#E4EBF1"
                            },
                            fonts: {
                              default: null,
                              "'Inter', sans-serif": {
                                url: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap",
                                active: true
                              }
                            }
                          }
                        },
                        async (error: Error | null, result: CloudinaryCallbackResult) => {
                          if (error) {
                            console.error('Upload error:', error);
                            setError('Failed to upload image');
                            setIsUploading(false);
                            return;
                          }
                          
                          if (result.event === 'success') {
                            console.log('Upload result:', result);
                            
                            // Store the new URL before deleting the old one
                            const newPhotoUrl = result?.info?.secure_url;
                            
                            if (newPhotoUrl) {
                              // Update the database first
                              const contactData = {
                                ...formData,
                                photoUrl: newPhotoUrl,
                                tags: formData.tags.map(tag => tag.name),
                              }
                              const docRef = doc(db, 'contacts', id)
                              await updateDoc(docRef, contactData)

                              // After successful database update, delete the old image
                              if (formData.photoUrl) {
                                // Extract public ID from URL
                                const urlParts = formData.photoUrl.split('/');
                                const uploadIndex = urlParts.indexOf('upload');
                                if (uploadIndex !== -1) {
                                  // Get all parts after 'upload', excluding the version number
                                  const relevantParts = urlParts.slice(uploadIndex + 2);
                                  // Get the full filename without extension
                                  const lastPart = relevantParts[relevantParts.length - 1];
                                  const filenameParts = lastPart.split('.');
                                  filenameParts.pop(); // Remove the extension
                                  relevantParts[relevantParts.length - 1] = filenameParts.join('.'); // Keep any dots in the filename
                                  const publicId = relevantParts.join('/');
                                  
                                  console.log('Deleting image with public ID:', publicId);
                                  
                                  try {
                                    const deleteResponse = await fetch('/api/cloudinary/delete', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                      },
                                      body: JSON.stringify({ publicId }),
                                    });
                                    const deleteData = await deleteResponse.json();
                                    console.log('Delete response:', deleteData);
                                  } catch (error) {
                                    console.error('Error deleting old image:', error);
                                  }
                                }
                              }

                              // Update local state after successful database update
                              setFormData(prev => ({
                                ...prev,
                                photoUrl: newPhotoUrl
                              }));
                            }
                            setIsUploading(false);
                          }
                        }
                      );
                      
                      uploadWidget.open();
                    }}
                    disabled={isUploading}
                    className={`rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? 'Uploading...' : 'Change photo'}
                  </button>
                </div>

                {/* Basic Information */}
                <div className="border-b border-gray-900/10 pb-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Basic Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-900">
                        Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        required
                        value={formData.name}
                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>

                    <div>
                      <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
                        Notes
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        rows={4}
                        value={formData.notes || ''}
                        onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="border-b border-gray-900/10 pb-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Contact Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-900">
                        Email
                      </label>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={formData.email || ''}
                        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium text-gray-900">
                        Phone
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        id="phone"
                        value={formData.phone || ''}
                        onChange={e => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="address" className="block text-sm font-medium text-gray-900">
                        Address
                      </label>
                      <input
                        type="text"
                        name="address"
                        id="address"
                        value={formData.address || ''}
                        onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>

                {/* Professional Information */}
                <div className="border-b border-gray-900/10 pb-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Professional Information</h3>
                  <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="company" className="block text-sm font-medium text-gray-900">
                        Company
                      </label>
                      <input
                        type="text"
                        name="company"
                        id="company"
                        value={formData.company || ''}
                        onChange={e => setFormData(prev => ({ ...prev, company: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>

                    <div>
                      <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-900">
                        Job Title
                      </label>
                      <input
                        type="text"
                        name="jobTitle"
                        id="jobTitle"
                        value={formData.jobTitle || ''}
                        onChange={e => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="border-b border-gray-900/10 pb-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Tags</h3>
                  <div className="mt-4">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {formData.tags.map(tag => (
                        <span
                          key={tag.name}
                          className="inline-flex items-center gap-x-0.5 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-700/10"
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => handleRemoveTag(tag)}
                            className="group relative -mr-1 h-3.5 w-3.5 rounded-sm hover:bg-indigo-600/20"
                          >
                            <span className="sr-only">Remove</span>
                            <svg viewBox="0 0 14 14" className="h-3.5 w-3.5 stroke-indigo-700/50 group-hover:stroke-indigo-700/75">
                              <path d="M4 4l6 6m0-6l-6 6" />
                            </svg>
                          </button>
                        </span>
                      ))}
                    </div>
                    <input
                      type="text"
                      value={newTag}
                      onChange={e => setNewTag(e.target.value)}
                      onKeyDown={handleAddTag}
                      placeholder="Add tags (press Enter)"
                      className="block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>

                {/* Related Contacts */}
                <div className="border-b border-gray-900/10 pb-6">
                  <h3 className="text-base font-semibold leading-7 text-gray-900">Related Contacts</h3>
                  <div className="mt-4">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="Search contacts to add..."
                        className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                      />
                      {searchQuery && searchResults.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                          {searchResults.map((result, index) => (
                            <button
                              key={result.id}
                              onClick={() => handleAddRelationship(result)}
                              className={`block w-full px-4 py-2 text-left text-sm ${
                                index === selectedIndex
                                  ? 'bg-indigo-600 text-white'
                                  : 'text-gray-900 hover:bg-gray-100'
                              }`}
                            >
                              {result.name}
                            </button>
                          ))}
                        </div>
                      )}
                      {searchQuery && isSearching && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-2 text-center text-sm text-gray-500">
                          Searching...
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4 space-y-3">
                      {allRelationships.length > 0 ? (
                        allRelationships.map((relationship) => {
                          const relatedContact = relationship.sourceId === id ? relationship.target : relationship.source
                          return (
                            <div key={relationship.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-900">
                                {relatedContact.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRelationship(relationship)}
                                className="text-sm text-red-600 hover:text-red-500"
                              >
                                Remove
                              </button>
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-gray-500">No related contacts yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Birthday */}
                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-900">
                    Birthday
                  </label>
                  <DatePicker
                    selected={formData.birthday}
                    onChange={(date: Date | null) => setFormData(prev => ({ ...prev, birthday: date }))}
                    className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    placeholderText="Select birthday"
                    dateFormat="MMMM d, yyyy"
                  />
                </div>
              </div>
            </div>

            <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between gap-x-4">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Contact'}
              </button>
            </div>

            {error && (
              <div className="px-8 py-4 bg-red-50 border-t border-red-200">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
} 