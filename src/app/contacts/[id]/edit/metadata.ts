import { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  try {
    const docRef = doc(db, 'contacts', params.id)
    const docSnap = await getDoc(docRef)
    const data = docSnap.data()

    if (!docSnap.exists() || !data) {
      return {
        title: 'Edit Contact - Not Found',
      }
    }

    return {
      title: `Edit ${data.name} - PCRM`,
      description: `Edit contact information for ${data.name}`,
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Edit Contact - Error',
    }
  }
} 