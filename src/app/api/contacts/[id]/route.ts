import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { v2 as cloudinary } from 'cloudinary'
import { getServerSession } from 'next-auth'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const prisma = new PrismaClient()

const ContactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  birthday: z.string().nullable(),
  photoUrl: z.string().nullable(),
  email: z.string().email("Invalid email format").nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  company: z.string().nullable(),
  jobTitle: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.array(z.string()),
})

// Helper function to delete image from Cloudinary
async function deleteCloudinaryImage(photoUrl: string) {
  try {
    const publicId = photoUrl
      .split('/')
      .pop()
      ?.split('.')[0]

    if (publicId) {
      await cloudinary.uploader.destroy(publicId)
      console.log('Deleted image from Cloudinary:', publicId)
    }
  } catch (error) {
    console.error('Error deleting image from Cloudinary:', error)
  }
}

// Get a single contact
export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contact = await prisma.contact.findUnique({
      where: { 
        id,
        userId: session.user.id
      },
      include: { tags: true },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

// Update a contact
export async function PUT(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate the request body
    const validationResult = ContactSchema.safeParse(body)
    
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        },
        { status: 400 }
      )
    }

    const validatedData = validationResult.data

    // Get the current contact to check for existing photo and ownership
    const currentContact = await prisma.contact.findUnique({
      where: { id },
      select: { photoUrl: true, userId: true }
    })

    if (!currentContact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (currentContact.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // If there's an existing photo and it's different from the new one, delete it
    if (currentContact?.photoUrl && 
        currentContact.photoUrl !== validatedData.photoUrl) {
      await deleteCloudinaryImage(currentContact.photoUrl)
    }

    // First, delete all existing tag relationships
    await prisma.contact.update({
      where: { id },
      data: {
        tags: {
          set: [], // Remove all existing tags
        },
      },
    })

    // Then update the contact with new data
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        name: validatedData.name,
        birthday: validatedData.birthday ? new Date(validatedData.birthday) : null,
        photoUrl: validatedData.photoUrl,
        email: validatedData.email,
        phone: validatedData.phone,
        address: validatedData.address,
        company: validatedData.company,
        jobTitle: validatedData.jobTitle,
        notes: validatedData.notes,
        tags: {
          connectOrCreate: validatedData.tags.map(tagName => ({
            where: { name: tagName },
            create: { name: tagName },
          })),
        },
      },
      include: {
        tags: true,
      },
    })

    return NextResponse.json(updatedContact)
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

// Delete a contact
export async function DELETE(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const { id } = context.params
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // First, get the contact to get the photo URL and check ownership
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { photoUrl: true, userId: true }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    if (contact.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (contact?.photoUrl) {
      await deleteCloudinaryImage(contact.photoUrl)
    }

    // Delete the contact from the database
    await prisma.contact.delete({
      where: { id },
    })

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
} 