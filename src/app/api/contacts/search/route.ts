import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getServerSession } from 'next-auth'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  try {
    const session = await getServerSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json([])
    }

    const contacts = await prisma.contact.findMany({
      where: {
        userId: session.user.id,
        name: {
          contains: query,
          mode: 'insensitive',
        },
      },
      include: {
        tags: true,
      },
      take: 5, // Limit to 5 results
    })

    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error searching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    )
  }
} 