import { useEffect, useRef } from 'react'

const focusableSelector = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus<T extends HTMLElement>(open: boolean) {
  const dialogRef = useRef<T>(null)

  useEffect(() => {
    if (!open) return

    const activeElement = document.activeElement
    const trigger = activeElement instanceof HTMLElement
      && activeElement !== document.body
      && activeElement !== document.documentElement
      ? activeElement
      : null
    const dialog = dialogRef.current
    if (!dialog) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusFirst = (last = false) => {
      const preferred = dialog.querySelector<HTMLElement>('[data-dialog-autofocus]:not([disabled])')
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
      const target = last ? focusable[focusable.length - 1] : preferred ?? focusable[0]
      ;(target ?? dialog).focus()
    }

    const focusInitial = window.requestAnimationFrame(() => {
      focusFirst()
    })

    const keepFocusInside = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
        .filter((element) => !element.hasAttribute('disabled'))
      if (focusable.length === 0) {
        event.preventDefault()
        dialog.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const active = document.activeElement
      if (!active || !dialog.contains(active)) {
        event.preventDefault()
        ;(event.shiftKey ? last : first).focus()
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || active === dialog)) {
        event.preventDefault()
        first.focus()
      }
    }

    const containProgrammaticFocus = (event: FocusEvent) => {
      if (!dialog.contains(event.target as Node)) focusFirst()
    }

    document.addEventListener('keydown', keepFocusInside)
    document.addEventListener('focusin', containProgrammaticFocus)
    return () => {
      window.cancelAnimationFrame(focusInitial)
      document.removeEventListener('keydown', keepFocusInside)
      document.removeEventListener('focusin', containProgrammaticFocus)
      document.body.style.overflow = previousOverflow
      window.requestAnimationFrame(() => {
        if (trigger?.isConnected) {
          trigger.focus()
        } else {
          document.getElementById('main-content')?.focus({ preventScroll: true })
        }
      })
    }
  }, [open])

  return dialogRef
}
