import React, { useEffect, useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { Lock, KeyRound, Eye, EyeOff, AlertCircle, ArrowLeft, CheckCircle, Info } from 'lucide-react'
import { useToast } from '@shared/hooks/useToast'
import { useAuth } from '@shared/hooks/useAuth'

const inputBase =
  'control-field login-input h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-12 text-slate-950 placeholder:text-slate-500 outline-none transition-colors hover:border-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:hover:border-slate-500 dark:focus:border-blue-400 dark:focus:ring-blue-400/15'

const ChangePassword: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const currentInputRef = useRef<HTMLInputElement>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const confirmInputRef = useRef<HTMLInputElement>(null)
  const { success } = useToast()
  const { owner, login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPassword.trim()) {
      setError('请输入当前密码')
      return
    }
    if (!newPassword.trim()) {
      setError('请输入新密码')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的新密码不一致')
      return
    }
    if (newPassword.length < 8) {
      setError('新密码至少 8 个字符')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/auth/change-password', {
        currentPassword,
        newPassword,
      })
      if (owner) login({ ...owner, mustChangePassword: false })
      success('密码修改成功')
      navigate('/articles', { replace: true })
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
        const payload = err.response.data as {
          message?: unknown
          data?: { errors?: Record<string, unknown> }
        }
        const fieldErrors = payload.data?.errors
        const fieldMessage = fieldErrors?.currentPassword ?? fieldErrors?.newPassword
        setError(typeof fieldMessage === 'string'
          ? fieldMessage
          : typeof payload.message === 'string'
            ? payload.message
            : '修改失败，请稍后重试')
      } else {
        setError('修改失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const currentInvalid = error === '请输入当前密码' || /^当前密码(?:不正确|不能为空)/.test(error)
  const confirmInvalid = error === '两次输入的新密码不一致'
  const newInvalid = confirmInvalid
    || error === '请输入新密码'
    || error === '新密码至少 8 个字符'
    || /^(?:新密码|密码(?:长度|必须|不能为空|不符合)|不能重复使用)/.test(error)
  const isValidationError = currentInvalid || newInvalid || confirmInvalid

  useEffect(() => {
    if (!error) return
    if (currentInvalid) currentInputRef.current?.focus()
    else if (confirmInvalid) confirmInputRef.current?.focus()
    else if (newInvalid) newInputRef.current?.focus()
  }, [confirmInvalid, currentInvalid, error, newInvalid])

  const inputClass = (invalid: boolean) => `${inputBase} ${
    invalid
      ? '!border-red-500 focus:!border-red-500 focus:!ring-red-500/15 dark:!border-red-500'
      : ''
  }`

  return (
    <div className="admin-auth-page flex items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-md">
        {!owner?.mustChangePassword && (
          <Link
            to="/articles"
            className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-xl text-sm font-medium text-slate-600 transition-colors hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-blue-400"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            返回后台
          </Link>
        )}
        <section className="admin-auth-card rounded-3xl border border-slate-300 bg-white px-6 py-9 dark:border-slate-700 dark:bg-slate-900 sm:px-10 sm:py-11">
          <header className="mb-7 flex items-start gap-4 border-b border-slate-200 pb-6 dark:border-slate-700">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <Lock className="h-5 w-5" aria-hidden />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">修改密码</h1>
          </header>

          {error && (
            <div
              id="change-password-error"
              role="alert"
              className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
                isValidationError
                  ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200'
                  : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
              }`}
            >
              {isValidationError ? <Info className="h-5 w-5 shrink-0" aria-hidden /> : <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />}
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 flex items-start gap-3 rounded-r-2xl border-l-2 border-brand-blue bg-blue-50/60 px-4 py-3 dark:bg-blue-500/10">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue dark:text-blue-400" aria-hidden />
            <p className="text-xs leading-5 text-slate-600 dark:text-slate-300">
              新密码需 8～100 位，且包含<strong>大写字母、小写字母、数字</strong>和<strong>特殊字符</strong>
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="group">
                <label htmlFor="current" className="mb-2 block text-sm font-medium text-slate-700 transition-colors group-focus-within:text-brand-blue dark:text-slate-300 dark:group-focus-within:text-blue-300">
                  当前密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue dark:group-focus-within:text-blue-300" aria-hidden />
                  <input
                    ref={currentInputRef}
                    id="current"
                    type={showCurrent ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => {
                      setCurrentPassword(e.target.value)
                      setError('')
                    }}
                    maxLength={100}
                    autoComplete="current-password"
                    aria-invalid={currentInvalid}
                    aria-describedby={currentInvalid ? 'change-password-error' : undefined}
                    className={inputClass(currentInvalid)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent((s) => !s)}
                    className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-blue-300"
                    aria-label={showCurrent ? '隐藏密码' : '显示密码'}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="group">
                <label htmlFor="new" className="mb-2 block text-sm font-medium text-slate-700 transition-colors group-focus-within:text-brand-blue dark:text-slate-300 dark:group-focus-within:text-blue-300">
                  新密码
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue dark:group-focus-within:text-blue-300" aria-hidden />
                  <input
                    ref={newInputRef}
                    id="new"
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      setError('')
                    }}
                    maxLength={100}
                    autoComplete="new-password"
                    aria-invalid={newInvalid}
                    aria-describedby={newInvalid ? 'change-password-error' : undefined}
                    className={inputClass(newInvalid)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((s) => !s)}
                    className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-blue-300"
                    aria-label={showNew ? '隐藏密码' : '显示密码'}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="group">
                <label htmlFor="confirm" className="mb-2 block text-sm font-medium text-slate-700 transition-colors group-focus-within:text-brand-blue dark:text-slate-300 dark:group-focus-within:text-blue-300">
                  确认新密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue dark:group-focus-within:text-blue-300" aria-hidden />
                  <input
                    ref={confirmInputRef}
                    id="confirm"
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      setError('')
                    }}
                    maxLength={100}
                    autoComplete="new-password"
                    aria-invalid={confirmInvalid}
                    aria-describedby={confirmInvalid ? 'change-password-error' : undefined}
                    className={inputClass(confirmInvalid)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((s) => !s)}
                    className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-blue-300"
                    aria-label={showConfirm ? '隐藏密码' : '显示密码'}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300 dark:ring-offset-slate-900"
                >
                  {submitting ? (
                    '提交中…'
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" aria-hidden />
                      确认修改
                    </>
                  )}
                </button>
              </div>
          </form>
        </section>
      </div>
    </div>
  )
}

export default ChangePassword
