import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { useDialogFocus } from '@shared/hooks/useDialogFocus'

const DialogHarness = () => {
  const [open, setOpen] = useState(false)
  const [showTrigger, setShowTrigger] = useState(true)
  const dialogRef = useDialogFocus<HTMLDivElement>(open)

  return (
    <>
      <main id="main-content" tabIndex={-1}>
        {showTrigger && (
          <button type="button" onClick={() => setOpen(true)}>
            打开弹窗
          </button>
        )}
        <button type="button">弹窗外按钮</button>
      </main>
      {open && (
        <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1}>
          <button type="button" data-dialog-autofocus>
            取消
          </button>
          <button
            type="button"
            onClick={() => {
              setShowTrigger(false)
              setOpen(false)
            }}
          >
            删除并关闭
          </button>
        </div>
      )}
    </>
  )
}

describe('useDialogFocus', () => {
  it('moves escaped focus back inside an open dialog', async () => {
    render(<DialogHarness />)
    fireEvent.click(screen.getByRole('button', { name: '打开弹窗' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(screen.getByRole('button', { name: '取消' })).toHaveFocus())

    screen.getByRole('button', { name: '弹窗外按钮' }).focus()

    await waitFor(() => {
      expect(dialog).toContainElement(document.activeElement as HTMLElement)
    })
  })

  it('focuses main when the original trigger disappears as the dialog closes', async () => {
    render(<DialogHarness />)
    const main = screen.getByRole('main')
    const trigger = screen.getByRole('button', { name: '打开弹窗' })
    trigger.focus()
    expect(trigger).toHaveFocus()
    fireEvent.click(trigger)
    await waitFor(() => expect(screen.getByRole('button', { name: '取消' })).toHaveFocus())

    fireEvent.click(screen.getByRole('button', { name: '删除并关闭' }))

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(main).toHaveFocus()
    })
  })
})
