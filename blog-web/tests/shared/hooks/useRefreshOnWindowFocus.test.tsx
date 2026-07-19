import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'

const Probe = ({ refresh }: { refresh: () => void }) => {
  useRefreshOnWindowFocus(refresh)
  return null
}

describe('useRefreshOnWindowFocus', () => {
  it('refreshes when the browser window regains focus', () => {
    const refresh = vi.fn()
    render(<Probe refresh={refresh} />)

    window.dispatchEvent(new Event('focus'))

    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('deduplicates the visibility and focus events from one tab switch', () => {
    const refresh = vi.fn()
    render(<Probe refresh={refresh} />)

    document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new Event('focus'))

    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
