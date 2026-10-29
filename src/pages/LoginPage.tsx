import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NuMark } from '../components/NuMark'
import { Button } from '../components/Button'
import { DEFAULT_KIOSK_OWNERS } from '../types/auth'
import { DEFAULT_CAMPUS_DISPLAYS } from '../types/content'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/portal" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await login(email, password)
      if (!res.ok) {
        setError(res.error || 'Invalid credentials')
      } else {
        navigate('/portal', { replace: true })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickLogin = async (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError(null)
    setSubmitting(true)
    try {
      const res = await login(demoEmail, demoPass)
      if (res.ok) {
        navigate('/portal', { replace: true })
      } else {
        setError(res.error)
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between">
      {/* Top Branding Bar */}
      <header className="border-b border-white/10 bg-nu-midnight/95">
        <div className="max-w-7xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <NuMark size={32} />
            <div className="leading-tight">
              <div className="font-serif text-[18px] text-nu-wisp leading-none">
                Northwest University
              </div>
              <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-nu-tour mt-1">
                Kiosk Content & Operations Portal
              </div>
            </div>
          </div>
          <span className="nu-pill">Authorized Staff Only</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex items-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full items-start">
          {/* Left 5 Columns: Email & Password Sign-In Form */}
          <div className="lg:col-span-5 nu-card p-8 border border-white/15 space-y-6">
            <div>
              <div className="nu-eyebrow">Staff Authentication</div>
              <h1 className="text-3xl font-serif text-nu-wisp mt-1">
                Kiosk Owner Sign In
              </h1>
              <p className="text-xs text-nu-skylight mt-2 leading-relaxed">
                Sign in with your Northwest University account to manage slides on your
                assigned campus kiosks or request placement on other building screens.
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-nu-amber/15 border border-nu-amber/50 text-xs text-nu-tour font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-xs font-semibold text-nu-skylight mb-1.5"
                >
                  University Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@northwestu.edu"
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp placeholder:text-nu-skylight/40 focus:outline-none focus:border-nu-tour"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-semibold text-nu-skylight mb-1.5"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3.5 py-2.5 text-sm text-nu-wisp placeholder:text-nu-skylight/40 focus:outline-none focus:border-nu-tour"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting ? 'Signing in...' : 'Sign In to Kiosk Portal'}
                </Button>
              </div>
            </form>

            <div className="pt-4 border-t border-white/10 text-[11px] text-nu-skylight/75 space-y-1">
              <p>
                <strong className="text-nu-wisp">How Kiosk Ownership Works:</strong>
              </p>
              <p>
                • Each campus kiosk has an assigned owner who can publish updates
                immediately to their screen(s).
              </p>
              <p>
                • Submissions to other buildings are routed to that kiosk owner’s
                approval queue.
              </p>
            </div>
          </div>

          {/* Right 7 Columns: Quick-Switch Demo Accounts for Evaluation */}
          <div className="lg:col-span-7 nu-card p-7 border border-white/10 space-y-5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <div className="nu-eyebrow">Quick Role Switcher · Demo Accounts</div>
                <h2 className="text-xl font-serif text-nu-wisp mt-1">
                  Test Kiosk Owner & Admin Accounts (1-Click Sign In)
                </h2>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-nu-tour/15 text-nu-tour border border-nu-tour/30 font-semibold">
                10 Campus Kiosks Assigned
              </span>
            </div>

            <p className="text-xs text-nu-skylight">
              Click any staff member below to sign in as that user and test their
              kiosk ownership permissions:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {DEFAULT_KIOSK_OWNERS.map((acct) => {
                const isSuper = acct.role === 'super_admin'
                const displayNames = isSuper
                  ? ['All 10 Campus Kiosks']
                  : acct.assigned_displays.map(
                      (id) =>
                        DEFAULT_CAMPUS_DISPLAYS.find((d) => d.id === id)?.name || id,
                    )

                return (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => handleQuickLogin(acct.email, acct.demoPassword)}
                    className={[
                      'text-left p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 group',
                      isSuper
                        ? 'bg-nu-tour/10 border-nu-tour/45 hover:bg-nu-tour/20'
                        : 'bg-white/[0.03] border-white/10 hover:border-nu-sky/50 hover:bg-white/[0.07]',
                    ].join(' ')}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-serif font-bold text-base text-nu-wisp group-hover:text-nu-tour transition-colors">
                          {acct.full_name}
                        </span>
                        <span
                          className={[
                            'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0',
                            isSuper
                              ? 'bg-nu-tour text-nu-midnight'
                              : 'bg-nu-blue/25 text-nu-sky border border-nu-blue/40',
                          ].join(' ')}
                        >
                          {isSuper ? 'Super Admin' : 'Kiosk Owner'}
                        </span>
                      </div>
                      <div className="text-xs text-nu-skylight">{acct.department}</div>
                      <div className="text-[11px] font-mono text-nu-skylight/70">
                        {acct.email}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-nu-tour mb-1">
                        Owns Kiosk(s):
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {displayNames.map((name) => (
                          <span
                            key={name}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-black/30 text-nu-wisp border border-white/10"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 bg-nu-midnight/95">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between text-[12px] text-nu-skylight">
          <span>Northwest University · Campus Digital Signage</span>
          <span>Kirkland, Washington · Since 1934</span>
        </div>
      </footer>
    </div>
  )
}

