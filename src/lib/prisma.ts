import { PrismaClient } from '@prisma/client'

let prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient | null {
  try {
    if (!prisma) {
      prisma = new PrismaClient()
    }
    return prisma
  } catch (error) {
    console.warn('Prisma initialization failed:', error)
    return null
  }
}

// Vercel環境での安全な使用
export async function safePrismaOperation<T>(
  operation: (prisma: PrismaClient) => Promise<T>,
  fallback: T
): Promise<T> {
  try {
    const client = getPrismaClient()
    if (!client) {
      console.warn('Prisma client not available, using fallback')
      return fallback
    }
    return await operation(client)
  } catch (error) {
    console.error('Prisma operation failed:', error)
    return fallback
  }
}
