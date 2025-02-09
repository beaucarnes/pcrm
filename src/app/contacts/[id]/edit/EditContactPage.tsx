'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import DatePicker from 'react-datepicker'
import "react-datepicker/dist/react-datepicker.css"
import { doc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { CloudinaryWidgetOptions } from '@/types/cloudinary'
import { DocumentData } from 'firebase/firestore'

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
  tags: string[];
}

type EditContactPageProps = {
  id: string
}

export default function EditContactPage({ id }: EditContactPageProps) {
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
        console.error('Error fetching contact:', error)
        setError('Failed to fetch contact')
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const docRef = doc(db, 'contacts', id)
      await updateDoc(docRef, {
        ...formData,
        birthday: formData.birthday ? formData.birthday.toISOString() : null,
      })
      router.push(`/contacts/${id}`)
    } catch (error) {
      console.error('Error updating contact:', error)
      setError('Failed to update contact')
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this contact?')) {
      return
    }

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, 'contacts', id))
      router.push('/contacts')
    } catch (error) {
      console.error('Error deleting contact:', error)
      setError('Failed to delete contact')
      setIsDeleting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>{error}</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto">
        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              id="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="birthday" className="block text-sm font-medium text-gray-700">
              Birthday
            </label>
            <DatePicker
              selected={formData.birthday}
              onChange={(date: Date | null) => setFormData(prev => ({ ...prev, birthday: date }))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="company" className="block text-sm font-medium text-gray-700">
              Company
            </label>
            <input
              type="text"
              name="company"
              id="company"
              value={formData.company}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="jobTitle" className="block text-sm font-medium text-gray-700">
              Job Title
            </label>
            <input
              type="text"
              name="jobTitle"
              id="jobTitle"
              value={formData.jobTitle}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Address
            </label>
            <textarea
              name="address"
              id="address"
              value={formData.address}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>

          <div className="flex justify-between">
            <button
              type="submit"
              className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
} 