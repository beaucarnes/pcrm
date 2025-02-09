'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { use } from 'react'

declare global {
  interface Window {
    cloudinary: any;
  }
}

type Tag = {
  id: string;
  name: string;
}

type Contact = {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
  jobTitle?: string;
  notes?: string;
  tags: Tag[];
  photoUrl?: string;
  birthday?: string | null;
}

type PageProps = {
  params: Promise<{ id: string }>
}

export default function EditContactPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [formData, setFormData] = useState<Contact>({
    id,
    name: '',
    tags: [],
    birthday: null,
  })
  const [newTag, setNewTag] = useState('')

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
        
        setFormData({
          id: docSnap.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          address: data.address,
          company: data.company,
          jobTitle: data.jobTitle,
          notes: data.notes,
          photoUrl: data.photoUrl,
          birthday: data.birthday,
          tags: data.tags || [],
        })
        setIsLoading(false)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load contact')
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [id, router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!auth.currentUser) {
      setError('You must be signed in to update a contact')
      return
    }

    try {
      const contactData = {
        ...formData,
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        address: formData.address?.trim() || null,
        company: formData.company?.trim() || null,
        jobTitle: formData.jobTitle?.trim() || null,
        notes: formData.notes?.trim() || null,
        photoUrl: formData.photoUrl ? formData.photoUrl.trim() : null,
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
                          singleUploadAutoClose: false,
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
                        async (error: any, result: any) => {
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

                {/* Birthday */}
                <div>
                  <label htmlFor="birthday" className="block text-sm font-medium text-gray-900">
                    Birthday
                  </label>
                  <DatePicker
                    selected={formData.birthday ? new Date(formData.birthday) : null}
                    onChange={(date: Date | null) => setFormData(prev => ({ ...prev, birthday: date?.toISOString() || null }))}
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