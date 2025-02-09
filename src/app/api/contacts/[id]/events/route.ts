import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const EventSchema = z.object({
  date: z.string(),
  title: z.string().min(1),
  description: z.string().nullable(),
})

type Props = {
  params: {
    id: string;
  };
  searchParams: { [key: string]: string | string[] | undefined };
}

export async function POST(
  request: NextRequest,
  props: Props
) {
  try {
    const body = await request.json()
    const validatedData = EventSchema.parse(body)

    const event = await prisma.event.create({
      data: {
        date: new Date(validatedData.date),
        title: validatedData.title,
        description: validatedData.description,
        contactId: props.params.id,
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
  request: NextRequest,
  props: Props
) {
  try {
    const events = await prisma.event.findMany({
      where: {
        contactId: props.params.id,
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