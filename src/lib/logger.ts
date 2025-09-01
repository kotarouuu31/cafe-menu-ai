type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  component?: string
  action?: string
  data?: any
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const prefix = context?.component ? `[${context.component}]` : ''
    const action = context?.action ? ` ${context.action}:` : ''
    return `${timestamp} ${level.toUpperCase()} ${prefix}${action} ${message}`
  }

  debug(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.log(this.formatMessage('debug', message, context), context?.data || '')
    }
  }

  info(message: string, context?: LogContext) {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context), context?.data || '')
    }
  }

  warn(message: string, context?: LogContext) {
    console.warn(this.formatMessage('warn', message, context), context?.data || '')
  }

  error(message: string, context?: LogContext) {
    console.error(this.formatMessage('error', message, context), context?.data || '')
  }

  // カメラ専用ログ
  camera(message: string, data?: any) {
    this.debug(message, { component: 'Camera', data })
  }

  // Vision API専用ログ
  vision(message: string, data?: any) {
    this.debug(message, { component: 'VisionAPI', data })
  }

  // データベース専用ログ
  db(message: string, data?: any) {
    this.debug(message, { component: 'Database', data })
  }
}

export const logger = new Logger()
