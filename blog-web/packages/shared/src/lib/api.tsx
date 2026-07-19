import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'

// 开发走 Vite 代理，生产走 Nginx，同域发送 httpOnly Cookie。
axios.defaults.withCredentials = true
axios.defaults.timeout = 30000

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: 'always',
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
})

// Response interceptor to handle expired or invalid sessions without reloading the login page.
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const requestUrl = String(error.config?.url || '')
    const isSessionProbe = requestUrl.endsWith('/api/auth/me')
    if (error.response?.status === 401 && !isSessionProbe && !window.location.pathname.startsWith('/admin/login')) {
      window.location.href = '/admin/login'
    }
    return Promise.reject(error)
  }
)

export const api = {
  get: <T,>(url: string, params?: any) =>
    axios.get<T>(url, { params }).then(res => res.data),
}

export function ApiProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
