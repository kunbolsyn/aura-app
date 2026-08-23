import { useState } from "react"
import type { FormEvent } from "react"
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail, Moon, Sparkles } from "lucide-react"

type AuthMode = "sign-in" | "sign-up"

type AuthPageProps = {
  onSubmit?: (credentials: { email: string; password: string; mode: AuthMode }) => Promise<void> | void
  onGoogleAuth?: () => Promise<void> | void
  error?: string | null
}

function AuthPage({ onSubmit, onGoogleAuth, error }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("sign-in")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const isSignUp = mode === "sign-up"

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode)
    setSubmitted(false)
    setLocalError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setSubmitted(false)
    setLocalError(null)
    try {
      await onSubmit?.({ email, password, mode })
      setSubmitted(true)
    } catch (submitError) {
      setLocalError(submitError instanceof Error ? submitError.message : "Unable to complete authentication.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogleAuth() {
    setSubmitting(true)
    setLocalError(null)
    try {
      await onGoogleAuth?.()
    } catch (authError) {
      setLocalError(authError instanceof Error ? authError.message : "Unable to continue with Google.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f5f8f6] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(460px,0.9fr)]">
        <section className="relative hidden overflow-hidden bg-[#123d3a] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.16) 1px, transparent 1px)", backgroundSize: "46px 46px" }} />
          <div className="absolute -right-28 top-24 h-80 w-80 rounded-full border border-emerald-200/30" />
          <div className="absolute -right-12 top-40 h-48 w-48 rounded-full border border-emerald-200/20" />

          <div className="relative flex items-center gap-2 text-lg font-extrabold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-300 text-[#123d3a]"><Moon size={17} fill="currentColor" strokeWidth={2.5} /></span>
            Aura
          </div>

          <div className="relative mt-auto max-w-xl pb-8">
            <p className="mb-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-emerald-200"><Sparkles size={14} /> A calmer way to plan</p>
            <h1 className="max-w-lg text-5xl font-extrabold leading-[1.04] tracking-[-0.04em] xl:text-6xl">Make space for what matters.</h1>
            <p className="mt-6 max-w-md text-base leading-7 text-emerald-50/70">Bring your calendar, tasks, and attention into one gentle rhythm.</p>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-emerald-100/80">
              <span className="flex items-center gap-2"><Check size={15} className="text-emerald-300" /> Simple by design</span>
              <span className="flex items-center gap-2"><Check size={15} className="text-emerald-300" /> Yours to shape</span>
            </div>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2 text-lg font-extrabold tracking-tight lg:hidden">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white"><Moon size={17} fill="currentColor" strokeWidth={2.5} /></span>
              Aura
            </div>

            <div className="mb-8">
              <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.18em] text-blue-600">Your space to think</p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950">{isSignUp ? "Start with a clear mind." : "Welcome back."}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{isSignUp ? "Create your Aura account and make room for your next good idea." : "Pick up where you left off, one thoughtful day at a time."}</p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-xl bg-slate-200/70 p-1">
              <button type="button" onClick={() => switchMode("sign-in")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${!isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Sign in</button>
              <button type="button" onClick={() => switchMode("sign-up")} className={`rounded-lg px-3 py-2.5 text-sm font-bold transition-all ${isSignUp ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>Create account</button>
            </div>

            <button type="button" onClick={() => void handleGoogleAuth()} disabled={submitting} className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-70">
              <span className="text-base font-extrabold text-blue-600">G</span>
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /> or continue with email <span className="h-px flex-1 bg-slate-200" /></div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Email address</span>
                <span className="relative block">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                </span>
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-bold text-slate-700">Password</span>
                <span className="relative block">
                  <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type={showPassword ? "text" : "password"} required minLength={6} autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={event => setPassword(event.target.value)} placeholder={isSignUp ? "At least 6 characters" : "Enter your password"} className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10" />
                  <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:text-slate-700">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </span>
              </label>

              {!isSignUp && <div className="flex justify-end"><button type="button" className="text-xs font-bold text-blue-600 hover:text-blue-700">Forgot password?</button></div>}

              <button type="submit" disabled={submitting} className="group flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70">{submitting ? "Connecting..." : isSignUp ? "Create my account" : "Sign in to Aura"}{!submitting && <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />}</button>
            </form>

            {(localError || error) && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-center text-xs font-semibold text-rose-700">{localError || error}</p>}
            {submitted && <p role="status" className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-center text-xs font-semibold text-emerald-700">Check your email to confirm your Aura account.</p>}
            <p className="mt-8 text-center text-xs leading-5 text-slate-400">By continuing, you agree to keep your Aura space kind, private, and yours.</p>
          </div>
        </section>
      </div>
    </main>
  )
}

export default AuthPage
