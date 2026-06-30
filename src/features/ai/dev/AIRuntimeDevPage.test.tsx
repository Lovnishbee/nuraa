import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/app/RouteGuards'
import { appNavigationItems } from '@/components/app/navigation'
import { getAIInternalAccessStatus } from '@/services/aiGateway'
import { useAuthStore } from '@/stores/auth-store'
import { AIRuntimeDevPage } from './AIRuntimeDevPage'

vi.mock('@/services/aiGateway', () => ({
  getAIInternalAccessStatus: vi.fn(),
  invokeAIGateway: vi.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dev/ai-runtime']}>
        <Routes>
          <Route path="/dev/ai-runtime" element={<AIRuntimeDevPage />} />
          <Route path="/app/dashboard" element={<div>Dashboard redirected</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return queryClient
}

afterEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, ready: false })
})

describe('AIRuntimeDevPage access guard', () => {
  it('redirects unauthenticated users to login through the protected route', async () => {
    useAuthStore.setState({ user: null, ready: true })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dev/ai-runtime']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dev/ai-runtime" element={<AIRuntimeDevPage />} />
            </Route>
            <Route path="/login" element={<div>Login redirected</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Login redirected')).toBeInTheDocument()
    expect(getAIInternalAccessStatus).not.toHaveBeenCalled()
  })

  it('does not render runtime controls while access is loading', () => {
    vi.mocked(getAIInternalAccessStatus).mockImplementation(() => new Promise(() => undefined))

    renderPage()

    expect(screen.getByText(/checking internal access/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /run internal task/i })).not.toBeInTheDocument()
  })

  it('redirects authenticated non-testers to the dashboard', async () => {
    vi.mocked(getAIInternalAccessStatus).mockResolvedValue({ enabled: false, consentGranted: false })

    renderPage()

    expect(await screen.findByText('Dashboard redirected')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /run internal task/i })).not.toBeInTheDocument()
  })

  it('allows enabled consented testers to see the internal runtime controls', async () => {
    vi.mocked(getAIInternalAccessStatus).mockResolvedValue({ enabled: true, consentGranted: true })

    renderPage()

    expect(await screen.findByRole('button', { name: /run internal task/i })).toBeInTheDocument()
    expect(screen.getByText(/approved output only/i)).toBeInTheDocument()
  })

  it('does not add the internal AI route to standard app navigation', () => {
    expect(appNavigationItems.map((item) => item.to)).not.toContain('/dev/ai-runtime')
  })
})
