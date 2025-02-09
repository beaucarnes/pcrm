'use client'

import { useState } from 'react'
import { CldUploadWidget } from 'next-cloudinary'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { useRouter } from 'next/navigation'
import { collection, addDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { CloudinaryWidgetOptions } from '@/types/cloudinary'

type CloudinaryUploadResult = {
  info: {
    secure_url: string;
  };
}

declare global {
  interface Window {
    cloudinary: {
      createUploadWidget: (
        options: CloudinaryWidgetOptions,
        callback: (error: Error | null, result: { event: string; info?: { secure_url: string } }) => void
      ) => { open: () => void };
    };
  }
}

export default function NewContactPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    birthday: null as Date | null,
    photoUrl: '',
    email: '',
    phone: '',
    address: '',
    company: '',
    jobTitle: '',
    notes: '',
    tags: [] as { id: string, name: string }[],
  })
  const [newTag, setNewTag] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!auth.currentUser) {
      setError('You must be signed in to create a contact')
      return
    }

    try {
      // Format the data properly
      const formattedData = {
        ...formData,
        birthday: formData.birthday ? formData.birthday.toISOString() : null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        company: formData.company.trim() || null,
        jobTitle: formData.jobTitle.trim() || null,
        notes: formData.notes.trim() || null,
        photoUrl: formData.photoUrl ? formData.photoUrl.trim() : null,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Add the contact to Firestore
      const docRef = await addDoc(collection(db, 'contacts'), formattedData);
      
      // Redirect to the contact's page
      router.push(`/contacts/${docRef.id}`)
    } catch (error) {
      setError('Error creating contact. Please try again.')
      console.error('Error creating contact:', error)
    }
  }

  const handleAddTag = (e: React.KeyboardEvent) => {
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

  const handleRemoveTag = (tagToRemove: { id: string, name: string }) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag.name !== tagToRemove.name)
    }))
  }

  if (!auth.currentUser) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-semibold text-gray-900">
          Please sign in to create contacts
        </h3>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-8 py-6 bg-indigo-50 border-b border-indigo-100">
        <h2 className="text-xl font-semibold text-gray-900">New Contact</h2>
        <p className="mt-1 text-sm text-gray-600">
          Add a new contact to your personal CRM.
        </p>
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
            <CldUploadWidget
              uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
              onSuccess={(result) => {
                console.log('Upload result:', result);
                const uploadResult = result as CloudinaryUploadResult;
                if (uploadResult?.info?.secure_url) {
                  setFormData(prev => ({
                    ...prev,
                    photoUrl: uploadResult.info.secure_url
                  }));
                }
              }}
              onQueuesEnd={() => {
                setIsUploading(false);
              }}
              options={{
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
                showCloseButton: true,
                theme: 'minimal',
                resourceType: 'image',
                folder: 'contacts',
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
              }}
            >
              {({ open }) => {
                function handleOnClick() {
                  setIsUploading(true);
                  setError('');
                  open();
                }
                return (
                  <button
                    type="button"
                    onClick={handleOnClick}
                    disabled={isUploading}
                    className={`rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isUploading ? 'Uploading...' : 'Change photo'}
                  </button>
                );
              }}
            </CldUploadWidget>

            {/* Remove duplicate preview since we already show the image above */}
            <div className="ml-4">
              {formData.photoUrl && (
                <p className="text-sm text-gray-500">Photo uploaded successfully</p>
              )}
            </div>
          </div>

          {/* Add error message display */}
          {error && (
            <div className="mt-4 text-sm text-red-600">
              {error}
            </div>
          )}

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
                <label htmlFor="birthday" className="block text-sm font-medium text-gray-900">
                  Birthday
                </label>
                <DatePicker
                  selected={formData.birthday}
                  onChange={(date: Date | null) => setFormData(prev => ({ ...prev, birthday: date }))}
                  className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                  placeholderText="Select birthday"
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
                  value={formData.email}
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
                  value={formData.phone}
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
                  value={formData.address}
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
                  value={formData.company}
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
                  value={formData.jobTitle}
                  onChange={e => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                  className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="border-b border-gray-900/10 pb-6">
            <label htmlFor="tags" className="block text-sm font-medium text-gray-900">
              Tags
            </label>
            <div className="mt-2">
              <div className="flex flex-wrap gap-2 mb-2">
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

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
              Notes
            </label>
            <textarea
              name="notes"
              id="notes"
              rows={4}
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="mt-1 block w-full rounded-md border-0 px-3 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      </div>

      <div className="px-8 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-x-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-semibold text-gray-900 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Save contact
        </button>
      </div>
    </form>
  )
} 