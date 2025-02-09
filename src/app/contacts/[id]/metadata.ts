import { Metadata } from 'next'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

async function getContact(id: string) {
  const docRef = doc(db, 'contacts', id)
  const docSnap = await getDoc(docRef)
  
  if (!docSnap.exists()) {
    return null
  }

  const data = docSnap.data()
  return {
    name: data.name,
  }
}

export async function generateMetadata(
  { params }: { params: { id: string } }
): Promise<Metadata> {
  const contact = await getContact(params.id)
  
  return {
    title: contact ? `${contact.name} - Personal CRM` : 'Contact Not Found - Personal CRM'
  }
} 