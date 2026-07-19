import { act, render, waitFor } from '@testing-library/react'
import { useQuery } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import { ApiProvider } from '@shared/lib/api'

const Probe = ({ load }: { load: () => Promise<string> }) => {
  useQuery({
    queryKey: ['window-focus-refresh-test'],
    queryFn: load,
  })
  return null
}

describe('ApiProvider', () => {
  it('refetches fresh query data when the tab becomes visible again', async () => {
    const load = vi.fn().mockResolvedValue('ok')
    render(
      <ApiProvider>
        <Probe load={load} />
      </ApiProvider>,
    )
    await waitFor(() => expect(load).toHaveBeenCalledTimes(1))

    act(() => {
      window.dispatchEvent(new Event('visibilitychange'))
    })

    await waitFor(() => expect(load).toHaveBeenCalledTimes(2))
  })
})
