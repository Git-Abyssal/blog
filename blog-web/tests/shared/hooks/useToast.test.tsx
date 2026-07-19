import { fireEvent, render, screen } from '@testing-library/react'
import { ToastProvider, useToast } from '@shared/hooks/useToast'

const ToastHarness = () => {
  const { success, error } = useToast()

  return (
    <>
      <button type="button" onClick={() => success('保存成功')}>显示成功提示</button>
      <button type="button" onClick={() => error('保存失败')}>显示失败提示</button>
    </>
  )
}

describe('ToastProvider', () => {
  it('renders operation feedback in the centered top container', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '显示成功提示' }))

    expect(screen.getByRole('status')).toHaveTextContent('保存成功')
    expect(screen.getByText('保存成功').closest('[aria-live="polite"]')).toHaveClass(
      'left-1/2',
      'top-20',
      '-translate-x-1/2',
    )
  })

  it('announces errors assertively', () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    )

    fireEvent.click(screen.getByRole('button', { name: '显示失败提示' }))

    expect(screen.getByRole('alert')).toHaveTextContent('保存失败')
  })
})
