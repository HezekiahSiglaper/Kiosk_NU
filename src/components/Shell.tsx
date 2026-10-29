import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { NuMark } from './NuMark'

const NAV = [
  { to: '/portal', label: 'Content Portal' },
  { to: '/admin/displays', label: 'Displays' },
]

export default function Shell() {
  const loc = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const handleSignOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-white/10 bg-nu-midnight/95">
        <div className="max-w-7xl mx-auto px-8 py-5 flex flex-wrap items-center gap-6">
          <Link to="/portal" className="flex items-center gap-3">
            <NuMark size={32} />
            <div className="leading-tight">
              <div className="font-serif text-[18px] text-nu-wisp leading-none">
                Northwest University
              </div>
              <div className="text-[11px] font-bold tracking-[0.28em] uppercase text-nu-tour mt-1">
                Operations Center
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-2 ml-2">
            {NAV.map((n) => {
              const active = loc.pathname.startsWith(n.to)
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={[
                    'px-4 py-2 rounded-full text-[13px] font-semibold tracking-wide transition-colors',
                    active
                      ? 'bg-nu-tour/15 text-nu-tour border border-nu-tour/40'
                      : 'text-nu-skylight hover:text-nu-wisp',
                  ].join(' ')}
                >
                  {n.label}
                </Link>
              )
            })}
          </nav>

          {/* Authenticated User Pill + Sign Out */}
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/15">
              <span className="w-2 h-2 rounded-full bg-nu-leaf" />
              <div className="text-xs leading-tight">
                <span className="font-semibold text-nu-wisp">{user.full_name}</span>
                <span className="text-nu-skylight ml-1.5">
                  ·{' '}
                  {user.role === 'super_admin'
                    ? 'Super Admin (10 Kiosks)'
                    : `Owner (${user.assigned_displays.length} Kiosk${user.assigned_displays.length === 1 ? '' : 's'})`}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/[0.06] hover:bg-white/15 text-nu-skylight hover:text-nu-wisp border border-white/15 transition-colors"
            >
              Switch Account / Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-10">
        <Outlet />
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
