import { NextResponse } from 'next/server'
import { z } from 'zod'

export interface ApiError {
  message: string
  code?: string
  details?: any
  statusCode: number
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code?: string
  public readonly details?: any

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.name = 'AppError'
  }
}

/**
 * 統一されたエラーレスポンス生成
 */
export function createErrorResponse(error: unknown, defaultMessage: string = 'Internal Server Error'): NextResponse {
  console.error('API Error:', error)

  // Zodバリデーションエラー
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        message: 'Validation Error',
        code: 'VALIDATION_ERROR',
        details: error.issues,
      },
      { status: 400 }
    )
  }

  // カスタムアプリケーションエラー
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        message: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  // 一般的なエラー
  if (error instanceof Error) {
    return NextResponse.json(
      {
        message: error.message || defaultMessage,
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    )
  }

  // 不明なエラー
  return NextResponse.json(
    {
      message: defaultMessage,
      code: 'UNKNOWN_ERROR',
      details: error,
    },
    { status: 500 }
  )
}

/**
 * 非同期関数のエラーハンドリングラッパー
 */
export function withErrorHandler<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  defaultErrorMessage?: string
) {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await fn(...args)
    } catch (error) {
      return createErrorResponse(error, defaultErrorMessage)
    }
  }
}

/**
 * データベース操作のエラーハンドリング
 */
export function handleDatabaseError(error: unknown): never {
  console.error('Database Error:', error)
  
  if (error instanceof Error) {
    if (error.message.includes('unique constraint')) {
      throw new AppError('データが既に存在します', 409, 'DUPLICATE_ERROR')
    }
    if (error.message.includes('foreign key constraint')) {
      throw new AppError('関連データが見つかりません', 400, 'REFERENCE_ERROR')
    }
    if (error.message.includes('not found')) {
      throw new AppError('データが見つかりません', 404, 'NOT_FOUND')
    }
  }
  
  throw new AppError('データベースエラーが発生しました', 500, 'DATABASE_ERROR', error)
}

/**
 * 外部API呼び出しのエラーハンドリング
 */
export function handleExternalApiError(error: unknown, apiName: string): never {
  console.error(`${apiName} API Error:`, error)
  
  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      throw new AppError(`${apiName}がタイムアウトしました`, 408, 'TIMEOUT_ERROR')
    }
    if (error.message.includes('unauthorized')) {
      throw new AppError(`${apiName}の認証に失敗しました`, 401, 'AUTH_ERROR')
    }
    if (error.message.includes('rate limit')) {
      throw new AppError(`${apiName}のレート制限に達しました`, 429, 'RATE_LIMIT_ERROR')
    }
  }
  
  throw new AppError(`${apiName}でエラーが発生しました`, 502, 'EXTERNAL_API_ERROR', error)
}
