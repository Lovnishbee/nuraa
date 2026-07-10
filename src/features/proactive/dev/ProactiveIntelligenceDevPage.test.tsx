import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from '@/app/RouteGuards'
import { appNavigationItems } from '@/components/app/navigation'
import { getAIInternalAccessStatus } from '@/services/aiGateway'
import { invokeProactiveEngine } from '@/services/proactiveIntelligenceService'
import { useAuthStore } from '@/stores/auth-store'
import { ProactiveIntelligenceDevPage } from './ProactiveIntelligenceDevPage'

vi.mock('@/services/aiGateway', () => ({
  getAIInternalAccessStatus: vi.fn(),
}))

vi.mock('@/services/proactiveIntelligenceService', () => ({
  invokeProactiveEngine: vi.fn(),
}))

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/dev/proactive-intelligence']}>
        <Routes>
          <Route path="/dev/proactive-intelligence" element={<ProactiveIntelligenceDevPage />} />
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

describe('ProactiveIntelligenceDevPage access guard', () => {
  it('redirects unauthenticated users to login through the protected route', async () => {
    useAuthStore.setState({ user: null, ready: true })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/dev/proactive-intelligence']}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/dev/proactive-intelligence" element={<ProactiveIntelligenceDevPage />} />
            </Route>
            <Route path="/login" element={<div>Login redirected</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Login redirected')).toBeInTheDocument()
    expect(getAIInternalAccessStatus).not.toHaveBeenCalled()
  })

  it('does not render controls while access is loading', () => {
    vi.mocked(getAIInternalAccessStatus).mockImplementation(() => new Promise(() => undefined))

    renderPage()

    expect(screen.getByText(/checking internal access/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /generate candidates/i })).not.toBeInTheDocument()
  })

  it('redirects authenticated non-testers to dashboard', async () => {
    vi.mocked(getAIInternalAccessStatus).mockResolvedValue({ enabled: false, consentGranted: false })

    renderPage()

    expect(await screen.findByText('Dashboard redirected')).toBeInTheDocument()
    expect(invokeProactiveEngine).not.toHaveBeenCalled()
  })

  it('allows enabled consented testers to see internal review controls', async () => {
    vi.mocked(getAIInternalAccessStatus).mockResolvedValue({ enabled: true, consentGranted: true })
    vi.mocked(invokeProactiveEngine).mockResolvedValue({
      requestId: 'request-1',
      status: 'completed',
      candidates: [],
    })

    renderPage()

    expect(await screen.findByRole('button', { name: /generate candidates/i })).toBeInTheDocument()
    expect(screen.getByText(/candidate review/i)).toBeInTheDocument()
  })

  it('does not add the proactive dev route to standard app navigation', () => {
    expect(appNavigationItems.map((item) => item.to)).not.toContain('/dev/proactive-intelligence')
  })
})
