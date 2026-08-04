import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@shared/hooks/useAuth';
import { User as UserIcon, Lock, ArrowRight, Eye, EyeOff, AlertCircle, Info } from 'lucide-react';

const safeInternalPath = (value: unknown, fallback: string) => (
  typeof value === 'string'
    && value.startsWith('/')
    && !value.startsWith('//')
    && !value.includes('\\')
    && !/%5c/i.test(value)
    ? value
    : fallback
);

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [errorField, setErrorField] = useState<'username' | 'password' | 'credentials' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = safeInternalPath((location.state as { from?: unknown } | null)?.from, '/articles');
  const usernameInvalid = errorField === 'username' || errorField === 'credentials';
  const passwordInvalid = errorField === 'password' || errorField === 'credentials';

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate(from, { replace: true });
  }, [authLoading, from, isAuthenticated, navigate]);

  useEffect(() => {
    if (error) {
      if (errorField === 'password') passwordInputRef.current?.focus();
      else if (errorField === 'username' || errorField === 'credentials') usernameInputRef.current?.focus();
    }
  }, [error, errorField]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = username.trim();
    if (!u) {
      setError('请输入用户名');
      setErrorField('username');
      return;
    }
    if (!password) {
      setError('请输入密码');
      setErrorField('password');
      return;
    }
    setError('');
    setErrorField(null);
    setSubmitting(true);
    try {
      const response = await axios.post('/api/auth/login', {
        username: u,
        password,
      });
      const data = response.data;
      const loggedInOwner = data?.owner ?? data;
      login(loggedInOwner);
      navigate(loggedInOwner?.mustChangePassword ? '/password' : from, { replace: true });
    } catch (err: unknown) {
      const isAxiosError = axios.isAxiosError(err);
      const status = isAxiosError ? err.response?.status : undefined;
      const data = isAxiosError ? err.response?.data : undefined;
      const payload = data && typeof data === 'object'
        ? data as { message?: unknown; data?: { errors?: Record<string, unknown> } }
        : null;
      const usernameMessage = payload?.data?.errors?.username;
      const passwordMessage = payload?.data?.errors?.password;
      const message = typeof usernameMessage === 'string'
        ? usernameMessage
        : typeof passwordMessage === 'string'
          ? passwordMessage
          : typeof payload?.message === 'string'
            ? payload.message
            : null;
      const errorMessage = !isAxiosError
        ? '登录失败，请稍后重试'
        : !err.response
          ? '无法连接服务器，请确认后端服务已启动'
          : status === 429
            ? '请求太频繁，请一分钟后再试'
            : status !== undefined && status >= 500
              ? '服务暂时不可用，请稍后重试'
              : status === 401 || status === 403
                ? (message || '用户名或密码错误')
                : (message || '登录失败，请稍后重试');
      setError(errorMessage);
      setErrorField(
        typeof usernameMessage === 'string'
          ? 'username'
          : typeof passwordMessage === 'string'
            ? 'password'
            : status === 401 || status === 403
              ? 'credentials'
              : null
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-auth-page mx-auto flex w-full max-w-md items-center px-4 py-8 sm:px-0 lg:py-10">
      <section className="admin-auth-card w-full rounded-3xl border border-slate-300 bg-white px-6 py-8 dark:border-slate-700 dark:bg-slate-900 sm:px-10 sm:py-9">
        <div className="mb-6 border-b border-slate-200 pb-5 dark:border-slate-700">
          <p className="utility-type mb-2 text-[10px] font-bold tracking-[0.2em] text-brand-blue">ADMIN ACCESS</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">后台登录</h1>
        </div>

        {error && (
          <div
            id="login-error"
            role="alert"
            aria-live="assertive"
            className={`mb-6 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${
              error === '请输入用户名' || error === '请输入密码'
                ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-900/20 dark:text-amber-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300'
            }`}
          >
            {error === '请输入用户名' || error === '请输入密码' ? (
              <Info className="h-5 w-5 shrink-0" aria-hidden />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
            )}
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="group">
            <label htmlFor="login-username" className="mb-2 block text-sm font-medium text-slate-700 transition-colors group-focus-within:text-brand-blue dark:text-slate-300 dark:group-focus-within:text-blue-300">
              用户名
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue dark:group-focus-within:text-blue-300" aria-hidden />
              <input
                ref={usernameInputRef}
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setError('')
                  setErrorField(null)
                }}
                maxLength={50}
                aria-invalid={usernameInvalid}
                aria-describedby={usernameInvalid ? 'login-error' : undefined}
                className={`control-field login-input h-12 w-full rounded-xl border bg-white pl-10 pr-4 text-slate-950 outline-none transition placeholder:text-slate-500 focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 ${
                  usernameInvalid
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500'
                    : 'border-slate-300 hover:border-slate-400 focus:border-brand-blue focus:ring-brand-blue/15 dark:border-slate-600 dark:hover:border-slate-500'
                }`}
                autoComplete="username"
              />
            </div>
          </div>
          <div className="group">
            <label htmlFor="login-password" className="mb-2 block text-sm font-medium text-slate-700 transition-colors group-focus-within:text-brand-blue dark:text-slate-300 dark:group-focus-within:text-blue-300">
              密码
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-brand-blue dark:group-focus-within:text-blue-300" aria-hidden />
              <input
                ref={passwordInputRef}
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                  setErrorField(null)
                }}
                maxLength={100}
                aria-invalid={passwordInvalid}
                aria-describedby={passwordInvalid ? 'login-error' : undefined}
                className={`control-field login-input h-12 w-full rounded-xl border bg-white pl-10 pr-12 text-slate-950 outline-none transition placeholder:text-slate-500 focus:ring-2 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 ${
                  passwordInvalid
                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500'
                    : 'border-slate-300 hover:border-slate-400 focus:border-brand-blue focus:ring-brand-blue/15 dark:border-slate-600 dark:hover:border-slate-500'
                }`}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-white dark:focus-visible:ring-blue-300"
                aria-label={showPassword ? '隐藏密码' : '显示密码'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting}
            aria-describedby={error ? 'login-error' : undefined}
            className="group flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 active:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300 dark:ring-offset-slate-900"
          >
            {submitting ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-950 dark:border-t-transparent" aria-hidden />
                <span className="sr-only">登录中</span>
              </>
            ) : (
              <>
                登录
                <ArrowRight className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </form>
      </section>
    </div>
  );
};

export default Login;
