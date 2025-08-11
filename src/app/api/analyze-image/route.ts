import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const analyzeImageSchema = z.object({
  imageUrl: z.string().url(),
  imageData: z.string().optional(), // Base64 encoded image data
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validatedData = analyzeImageSchema.parse(body)
    
    // TODO: Implement actual AI image analysis
    // For now, return mock data
    const mockAnalysis = {
      detectedItems: ['coffee', 'sandwich', 'cake'],
      confidence: 0.85,
      suggestedMenus: [],
    }
    
    // Search for menus that match detected items
    const suggestedMenus = await prisma.menu.findMany({
      where: {
        active: true,
        OR: mockAnalysis.detectedItems.map(item => ({
          OR: [
            { name: { contains: item, mode: 'insensitive' } },
            { keywords: { has: item } },
            { ingredients: { has: item } },
          ],
        })),
      },
      take: 5,
    })
    
    const result = {
      ...mockAnalysis,
      suggestedMenus,
    }
    
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      )
    }
    
    console.error('Error analyzing image:', error)
    return NextResponse.json(
      { error: 'Failed to analyze image' },
      { status: 500 }
    )
  }
}
