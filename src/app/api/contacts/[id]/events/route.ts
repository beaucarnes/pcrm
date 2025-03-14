import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const EventSchema = z.object({
  date: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validatedData = EventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        date: new Date(validatedData.date),
        title: validatedData.title,
        description: validatedData.description,
        contactId: id,
      },
    })

    return NextResponse.json(event)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating event:', error)
    return NextResponse.json({ error: 'Error creating event' }, { status: 500 })
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const events = await prisma.event.findMany({
      where: {
        contactId: id,
      },
      orderBy: {
        date: 'desc',
      },
    })
    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Error fetching events' }, { status: 500 })
  }
} 