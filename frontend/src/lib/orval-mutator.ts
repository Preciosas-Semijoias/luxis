import { useAuthStore } from '@/stores/use-auth-store'
import { notifySessionExpired } from '@/lib/session-feedback'

export type ErrorType<T> = T & {
  message: string
  status: number
}

const API = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 15000
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

function shouldRetry(method: string, status?: number, attempt = 0) {
  if (!RETRYABLE_METHODS.has(method) || attempt >= 2) return false
  if (status === undefined) return true
  return RETRYABLE_STATUS.has(status)
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Mutador customizado do Orval.
 * Retorna o formato { data, status, headers } esperado pelos tipos gerados.
 * Usa cookies para autenticação (credentials: 'include').
 */
export const customInstance = async <T>(
  url: string,
  options?: RequestInit
): Promise<T> => {
  const method = ((options?.method as string) ?? 'GET').toUpperCase()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options?.headers as Record<string, string>) ?? {})
  }

  for (let attempt = 0; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    const signal = options?.signal ?? controller.signal

    try {
      const response = await fetch(`${API}${url}`, {
        ...options,
        method,
        headers,
        credentials: 'include',
        signal
      })

      clearTimeout(timeout)

      let body: unknown
      try {
        body = await response.json()
      } catch {
        body = undefined
      }

      if (!response.ok) {
        if (response.status === 401) {
          useAuthStore.getState().logout()
          notifySessionExpired()
        }

        if (shouldRetry(method, response.status, attempt)) {
          await wait((attempt + 1) * 300)
          continue
        }

        const err = new Error(
          (body as { message?: string })?.message ?? 'Erro inesperado'
        ) as Error & { status: number; data: unknown }
        err.status = response.status
        err.data = body
        throw err
      }

      return {
        data: body,
        status: response.status,
        headers: response.headers
      } as T
    } catch (error) {
      clearTimeout(timeout)

      if (error instanceof Error && (error as any).status) {
        if (!shouldRetry(method, (error as any).status, attempt)) throw error
        await wait((attempt + 1) * 300)
        continue
      }

      if (error instanceof Error && error.name === 'AbortError') {
        if (shouldRetry(method, 408, attempt)) {
          await wait((attempt + 1) * 300)
          continue
        }
        const err = Object.assign(new Error('Tempo limite excedido'), {
          status: 408
        })
        throw err
      }

      if (shouldRetry(method, undefined, attempt)) {
        await wait((attempt + 1) * 300)
        continue
      }

      throw error
    }
  }

  throw Object.assign(new Error('Erro inesperado'), { status: 500 })
}
