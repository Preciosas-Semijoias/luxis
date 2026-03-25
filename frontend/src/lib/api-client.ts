import { useAuthStore } from '@/stores/use-auth-store'
import { notifySessionExpired } from '@/lib/session-feedback'

export class ApiError extends Error {
  status: number
  data: any
  constructor(message: string, status: number, data?: any) {
    super(message)
    this.status = status
    this.data = data
  }
}

const API = (
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'
).replace(/\/+$/, '')
const REQUEST_TIMEOUT_MS = 15000
const RETRYABLE_METHODS = new Set(['GET', 'HEAD'])
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504])

function buildHeaders(options: RequestInit): Record<string, string> {
  let headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (
    options.headers &&
    typeof options.headers === 'object' &&
    !Array.isArray(options.headers)
  ) {
    headers = { ...headers, ...(options.headers as Record<string, string>) }
  }

  return headers
}

function shouldRetry(method: string, status?: number, attempt = 0) {
  if (!RETRYABLE_METHODS.has(method) || attempt >= 2) {
    return false
  }

  if (status === undefined) {
    return true
  }

  return RETRYABLE_STATUS.has(status)
}

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  requireAuth = false,
  method?: string
): Promise<T> {
  const requestMethod = (method ?? options.method ?? 'GET').toUpperCase()
  const headers = buildHeaders(options)

  for (let attempt = 0; attempt <= 2; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      const response = await fetch(`${API}${url}`, {
        ...options,
        method: requestMethod,
        headers,
        credentials: options.credentials ?? 'include',
        signal: controller.signal
      })

      clearTimeout(timeout)

      let data
      try {
        data = await response.json()
      } catch {
        data = undefined
      }

      if (!response.ok) {
        if (response.status === 401 && requireAuth) {
          useAuthStore.getState().logout()
          notifySessionExpired()
        }

        if (shouldRetry(requestMethod, response.status, attempt)) {
          await wait((attempt + 1) * 300)
          continue
        }

        throw new ApiError(
          data?.message || 'Erro inesperado',
          response.status,
          data
        )
      }

      return data as T
    } catch (error) {
      clearTimeout(timeout)

      if (
        error instanceof ApiError &&
        !shouldRetry(requestMethod, error.status, attempt)
      ) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        if (shouldRetry(requestMethod, 408, attempt)) {
          await wait((attempt + 1) * 300)
          continue
        }

        throw new ApiError('Tempo limite da requisição excedido', 408)
      }

      if (shouldRetry(requestMethod, undefined, attempt)) {
        await wait((attempt + 1) * 300)
        continue
      }

      if (error instanceof ApiError) {
        throw error
      }

      throw new ApiError('Falha de conexão com a API', 0, error)
    }
  }

  throw new ApiError('Erro inesperado', 500)
}
