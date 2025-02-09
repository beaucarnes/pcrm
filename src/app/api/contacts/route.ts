import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import { getServerSession } from 'next-auth'

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

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        tags: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    console.log('Received request body:', body);
    
    // Validate the request body
    const validationResult = ContactSchema.safeParse(body)
    
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error.errors);
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
    console.log('Validated data:', validatedData);

    // Create the contact with validated data
    const contact = await prisma.contact.create({
      data: {
        userId: session.user.id,
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

    console.log('Created contact:', contact);
    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error creating contact:', error)
    
    // Handle Prisma-specific errors
    if (error instanceof Error) {
      return NextResponse.json(
        { 
          error: 'Failed to create contact',
          details: error.message
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
} 