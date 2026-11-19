import { useState, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Button } from './Button'
import { IconCheck, IconDisplay, IconPlus, IconX } from './icons'
import type { CampusDisplayOption } from '../types/content'
import type { UserRole } from '../types/auth'

type Props = {
  open: boolean
  onClose: () => void
  displays: CampusDisplayOption[]
}

export function KioskOwnersModal({ open, onClose, displays }: Props) {
  const { user, owners, getDisplayOwner, reassignKiosk, upsertOwner } = useAuth()
  const isSuperAdmin = user?.role === 'super_admin'

  const [showAddForm, setShowAddForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newPassword, setNewPassword] = useState('Northwest2026!')
  const [newRole, setNewRole] = useState<UserRole>('kiosk_owner')
  const [savedNotice, setSavedNotice] = useState<string | null>(null)

  if (!open) return null

  const nonAdminOwners = owners.filter((o) => o.role === 'kiosk_owner')

  const handleReassign = async (displayId: string, newOwnerId: string) => {
    await reassignKiosk(displayId, newOwnerId)
    const displayObj = displays.find((d) => d.id === displayId)
    const ownerObj = owners.find((o) => o.id === newOwnerId)
    setSavedNotice(
      `Assigned "${displayObj?.name || displayId}" to ${ownerObj?.full_name || 'owner'}.`,
    )
    setTimeout(() => setSavedNotice(null), 3500)
  }

  const handleCreateOwner = async (e: FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || !newEmail.trim()) return
    await upsertOwner({
      email: newEmail,
      full_name: newName,
      department: newDept || 'Campus Staff',
      role: newRole,
      assigned_displays: [],
      password: newPassword,
    })
    setSavedNotice(`Added ${newName.trim()} (${newEmail.trim()}) to Kiosk Owners.`)
    setNewName('')
    setNewEmail('')
    setNewDept('')
    setShowAddForm(false)
    setTimeout(() => setSavedNotice(null), 4000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="nu-card max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 md:p-8 border border-white/15 relative space-y-6">
        <button
          onClick={onClose}
          className="
            absolute top-5 right-5 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20
            flex items-center justify-center text-nu-wisp transition-colors
          "
          aria-label="Close modal"
        >
          <IconX size={16} />
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pr-10">
          <div>
            <div className="nu-eyebrow">Campus Governance · 10 Kiosks</div>
            <h2 className="text-2xl font-serif text-nu-wisp mt-1">
              Kiosk Ownership Directory & Assignments
            </h2>
            <p className="text-xs text-nu-skylight mt-1">
              Each campus kiosk has a designated owner who can publish directly to their
              screen and approve submissions from other departments.
            </p>
          </div>
          {isSuperAdmin && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconPlus size={13} />}
              onClick={() => setShowAddForm((prev) => !prev)}
            >
              {showAddForm ? 'Cancel New Owner' : 'Add Staff Owner'}
            </Button>
          )}
        </div>

        {savedNotice && (
          <div className="p-3 rounded-xl bg-nu-leaf/15 border border-nu-leaf/40 text-xs text-nu-leaf font-semibold flex items-center gap-2">
            <IconCheck size={14} />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Add New Staff Owner Form (Super Admin Only) */}
        {isSuperAdmin && showAddForm && (
          <form
            onSubmit={handleCreateOwner}
            className="p-5 rounded-2xl bg-white/[0.04] border border-nu-tour/40 space-y-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-nu-tour">
              Add New Staff Kiosk Owner Account
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-nu-skylight mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Caleb Wright"
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp"
                />
              </div>
              <div>
                <label className="block text-[11px] text-nu-skylight mb-1">
                  NU Email *
                </label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="caleb@northwestu.edu"
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp"
                />
              </div>
              <div>
                <label className="block text-[11px] text-nu-skylight mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Eagle Athletics"
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp"
                />
              </div>
              <div>
                <label className="block text-[11px] text-nu-skylight mb-1">
                  Initial Password
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl bg-nu-midnight/90 border border-white/15 px-3 py-2 text-xs text-nu-wisp font-mono"
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-xs text-nu-skylight">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={newRole === 'kiosk_owner'}
                    onChange={() => setNewRole('kiosk_owner')}
                  />
                  <span>Kiosk Owner</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    checked={newRole === 'super_admin'}
                    onChange={() => setNewRole('super_admin')}
                  />
                  <span>Super Admin (All Kiosks)</span>
                </label>
              </div>
              <Button type="submit" size="sm" variant="primary">
                Save Staff Account
              </Button>
            </div>
          </form>
        )}

        {/* Table of 10 Kiosks and Their Assigned Owners */}
        <div className="space-y-2.5">
          {displays.map((d, index) => {
            const currentOwner = getDisplayOwner(d.id)
            const isMine =
              user?.role === 'super_admin' ||
              user?.assigned_displays.includes(d.id)

            return (
              <div
                key={d.id}
                className={[
                  'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                  isMine
                    ? 'bg-nu-leaf/[0.06] border-nu-leaf/30'
                    : 'bg-white/[0.03] border-white/10',
                ].join(' ')}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-xs font-bold text-nu-tour shrink-0 mt-0.5">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-serif font-bold text-base text-nu-wisp">
                        {d.name}
                      </span>
                      <span className="text-[11px] font-mono text-nu-skylight/70">
                        ({d.id})
                      </span>
                      {user?.assigned_displays.includes(d.id) &&
                        user.role !== 'super_admin' && (
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-nu-leaf/20 text-nu-leaf border border-nu-leaf/40">
                            ★ Your Kiosk
                          </span>
                        )}
                    </div>
                    <div className="text-xs text-nu-skylight flex items-center gap-2 mt-0.5">
                      <IconDisplay size={12} className="text-nu-sky" />
                      <span>
                        {d.location} · {d.orientation}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Assignment Column */}
                <div className="sm:w-72 shrink-0">
                  {isSuperAdmin ? (
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-nu-skylight mb-1">
                        Assigned Kiosk Owner
                      </label>
                      <select
                        value={currentOwner?.id || ''}
                        onChange={(e) => handleReassign(d.id, e.target.value)}
                        className="w-full rounded-xl bg-nu-midnight/90 border border-white/20 px-3 py-2 text-xs text-nu-wisp focus:outline-none focus:border-nu-tour"
                      >
                        {nonAdminOwners.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.full_name} ({o.department})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-left sm:text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-nu-tour">
                        Kiosk Owner
                      </div>
                      <div className="text-xs font-semibold text-nu-wisp">
                        {currentOwner?.full_name || 'Campus Communications'}
                      </div>
                      <div className="text-[11px] text-nu-skylight">
                        {currentOwner?.department} · {currentOwner?.email}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <span className="text-xs text-nu-skylight">
            {isSuperAdmin
              ? 'Super Admin Mode: Changes to kiosk ownership take effect immediately.'
              : 'Need ownership of another kiosk? Contact Hannah Vance (admin@northwestu.edu).'}
          </span>
          <Button size="sm" variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}

