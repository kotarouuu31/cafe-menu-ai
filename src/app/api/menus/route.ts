import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createMenuSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  ingredients: z.array(z.string()),
  allergens: z.array(z.string()),
  keywords: z.array(z.string()),
  imageUrls: z.array(z.string()),
  price: z.number().optional(),
  category: z.string().min(1),
})

const updateMenuSchema = createMenuSchema.partial().extend({
  id: z.string(),
  active: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const active = searchParams.get('active')
    
    const menus = await prisma.menu.findMany({
      where: {
        ...(category && { category }),
        ...(active !== null && { active: active === 'true' }),
      },
      orderBy: { createdAt: 'desc' },
    })
    
    return NextResponse.json(menus)
  } catch (error) {
    console.error('Error fetching menus:', error)
    return NextResponse.json(
      { error: 'Failed to fetch menus' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = createMenuSchema.parse(body)
    
    const menu = await prisma.menu.create({
      data: validatedData,
    })
    
    return NextResponse.json(menu, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error creating menu:', error)
    return NextResponse.json(
      { error: 'Failed to create menu' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = updateMenuSchema.parse(body)
    const { id, ...updateData } = validatedData
    
    const menu = await prisma.menu.update({
      where: { id },
      data: updateData,
    })
    
    return NextResponse.json(menu)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error updating menu:', error)
    return NextResponse.json(
      { error: 'Failed to update menu' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Menu ID is required' },
        { status: 400 }
      )
    }
    
    await prisma.menu.delete({
      where: { id },
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting menu:', error)
    return NextResponse.json(
      { error: 'Failed to delete menu' },
      { status: 500 }
    )
  }
}
