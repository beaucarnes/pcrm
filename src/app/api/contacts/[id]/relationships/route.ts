import { NextResponse, NextRequest } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'

const prisma = new PrismaClient()

const RelationshipSchema = z.object({
  targetId: z.string(),
  type: z.string().min(1),
  isMutual: z.boolean(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const validatedData = RelationshipSchema.parse(body)

    // Check if relationship already exists
    const existingRelationship = await prisma.relationship.findFirst({
      where: {
        sourceId: id,
        targetId: validatedData.targetId,
        type: validatedData.type,
      },
    })

    if (existingRelationship) {
      return NextResponse.json(
        { error: 'Relationship already exists' },
        { status: 400 }
      )
    }

    const relationship = await prisma.relationship.create({
      data: {
        sourceId: id,
        targetId: validatedData.targetId,
        type: validatedData.type,
        isMutual: validatedData.isMutual,
      },
      include: {
        target: true,
      },
    })

    // If it's a mutual relationship, create the reverse relationship
    if (validatedData.isMutual) {
      await prisma.relationship.create({
        data: {
          sourceId: validatedData.targetId,
          targetId: id,
          type: validatedData.type,
          isMutual: true,
        },
      })
    }

    return NextResponse.json(relationship)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error('Error creating relationship:', error)
    return NextResponse.json(
      { error: 'Error creating relationship' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const relationships = await prisma.relationship.findMany({
      where: {
        OR: [
          { sourceId: id },
          { targetId: id },
        ],
      },
      include: {
        source: true,
        target: true,
      },
    })
    return NextResponse.json(relationships)
  } catch (error) {
    console.error('Error fetching relationships:', error)
    return NextResponse.json(
      { error: 'Error fetching relationships' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { targetId, type } = await request.json()

    const relationship = await prisma.relationship.findFirst({
      where: {
        sourceId: id,
        targetId,
        type,
      },
    })

    if (!relationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      )
    }

    // Delete the relationship
    await prisma.relationship.delete({
      where: {
        id: relationship.id,
      },
    })

    // If it's a mutual relationship, delete the reverse relationship
    if (relationship.isMutual) {
      const reverseRelationship = await prisma.relationship.findFirst({
        where: {
          sourceId: targetId,
          targetId: id,
          type,
        },
      })

      if (reverseRelationship) {
        await prisma.relationship.delete({
          where: {
            id: reverseRelationship.id,
          },
        })
      }
    }

    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Error deleting relationship:', error)
    return NextResponse.json(
      { error: 'Error deleting relationship' },
      { status: 500 }
    )
  }
} 