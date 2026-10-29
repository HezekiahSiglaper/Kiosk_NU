import { getSupabase } from './supabase'
import {
  DEFAULT_KIOSK_OWNERS,
  type KioskOwnerProfile,
  type UserRole,
} from '../types/auth'

const OWNERS_STORAGE_KEY = 'nu_kiosk_owners_roster_v1'
const SESSION_STORAGE_KEY = 'nu_kiosk_active_session_v1'

type StoredOwnerRecord = KioskOwnerProfile & { demoPassword?: string }

function loadLocalOwners(): StoredOwnerRecord[] {
  try {
    const raw = localStorage.getItem(OWNERS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(DEFAULT_KIOSK_OWNERS))
      return DEFAULT_KIOSK_OWNERS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed as StoredOwnerRecord[]
    }
    return DEFAULT_KIOSK_OWNERS
  } catch {
    return DEFAULT_KIOSK_OWNERS
  }
}

function saveLocalOwners(owners: StoredOwnerRecord[]): void {
  try {
    localStorage.setItem(OWNERS_STORAGE_KEY, JSON.stringify(owners))
    window.dispatchEvent(new CustomEvent('nu-kiosk-owners-updated'))
  } catch (err) {
    console.warn('saveLocalOwners failed', err)
  }
}

export async function fetchAllKioskOwners(): Promise<KioskOwnerProfile[]> {
  const sb = getSupabase()
  if (sb) {
    const { data, error } = await sb
      .from('kiosk_owners')
      .select('*')
      .order('full_name', { ascending: true })
    if (!error && data && data.length > 0) {
      return data as KioskOwnerProfile[]
    }
  }
  return loadLocalOwners().map(({ demoPassword: _, ...profile }) => profile)
}

export function getSavedSessionProfile(): KioskOwnerProfile | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as KioskOwnerProfile
  } catch {
    return null
  }
}

export function saveSessionProfile(profile: KioskOwnerProfile | null): void {
  try {
    if (!profile) {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } else {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(profile))
    }
  } catch (err) {
    console.warn('saveSessionProfile error', err)
  }
}

/**
 * Signs in with email + password.
 * 1. If Supabase is configured, attempts `sb.auth.signInWithPassword` first and looks up
 *    the user's row in `public.kiosk_owners`.
 * 2. Also supports the seeded Northwest University accounts so staff/evaluators can test
 *    every role immediately in Local Mode or before Supabase Auth users are provisioned.
 */
export async function signInWithEmailPassword(
  email: string,
  password: string,
): Promise<{ user: KioskOwnerProfile | null; error: string | null }> {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) {
    return { user: null, error: 'Please enter both your email address and password.' }
  }

  const sb = getSupabase()
  if (sb) {
    const { data: authData, error: authErr } = await sb.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })
    if (!authErr && authData?.user) {
      const { data: ownerRow } = await sb
        .from('kiosk_owners')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (ownerRow) {
        const profile = ownerRow as KioskOwnerProfile
        saveSessionProfile(profile)
        return { user: profile, error: null }
      }
    }
  }

  // Check local / seeded roster
  const localRoster = loadLocalOwners()
  const match = localRoster.find(
    (o) => o.email.toLowerCase() === normalizedEmail,
  )
  if (!match) {
    return {
      user: null,
      error:
        'No kiosk owner account found for that email. Use your @northwestu.edu account or select a demo account below.',
    }
  }

  const expectedPass = match.demoPassword || 'Northwest2026!'
  if (password !== expectedPass) {
    return {
      user: null,
      error: 'Invalid password for this account. Please try again.',
    }
  }

  const { demoPassword: _, ...cleanProfile } = match
  saveSessionProfile(cleanProfile)
  return { user: cleanProfile, error: null }
}

export async function signOutUser(): Promise<void> {
  const sb = getSupabase()
  if (sb) {
    await sb.auth.signOut().catch(() => {})
  }
  saveSessionProfile(null)
}

/**
 * Assigns a specific kiosk (`displayId`) to a Kiosk Owner (`ownerId`),
 * removing it from other non-super-admin owners so each kiosk has a clear designated owner.
 */
export async function assignKioskToOwner(
  displayId: string,
  newOwnerId: string,
): Promise<KioskOwnerProfile[]> {
  const current = loadLocalOwners()
  const updated = current.map((owner) => {
    if (owner.role === 'super_admin') return owner
    const withoutDisplay = owner.assigned_displays.filter((d) => d !== displayId)
    if (owner.id === newOwnerId) {
      return {
        ...owner,
        assigned_displays: [...withoutDisplay, displayId],
      }
    }
    return {
      ...owner,
      assigned_displays: withoutDisplay,
    }
  })

  saveLocalOwners(updated)

  const sb = getSupabase()
  if (sb) {
    for (const owner of updated) {
      if (owner.role === 'super_admin') continue
      await sb
        .from('kiosk_owners')
        .update({
          assigned_displays: owner.assigned_displays,
          updated_at: new Date().toISOString(),
        })
        .eq('email', owner.email)
    }
  }

  return updated.map(({ demoPassword: _, ...profile }) => profile)
}

export async function createOrUpdateKioskOwner(input: {
  email: string
  full_name: string
  department: string
  role: UserRole
  assigned_displays: string[]
  password?: string
}): Promise<KioskOwnerProfile[]> {
  const normalizedEmail = input.email.trim().toLowerCase()
  const current = loadLocalOwners()
  const existingIdx = current.findIndex(
    (o) => o.email.toLowerCase() === normalizedEmail,
  )

  const record: StoredOwnerRecord = {
    id:
      existingIdx >= 0
        ? current[existingIdx].id
        : `owner-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    email: normalizedEmail,
    full_name: input.full_name.trim(),
    department: input.department.trim() || 'Campus Staff',
    role: input.role,
    assigned_displays: input.assigned_displays,
    demoPassword:
      input.password?.trim() ||
      (existingIdx >= 0 ? current[existingIdx].demoPassword : 'Northwest2026!'),
    created_at:
      existingIdx >= 0
        ? current[existingIdx].created_at
        : new Date().toISOString(),
  }

  const next = current.slice()
  if (existingIdx >= 0) {
    next[existingIdx] = record
  } else {
    next.push(record)
  }
  saveLocalOwners(next)

  const sb = getSupabase()
  if (sb) {
    await sb.from('kiosk_owners').upsert(
      {
        email: record.email,
        full_name: record.full_name,
        department: record.department,
        role: record.role,
        assigned_displays: record.assigned_displays,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'email' },
    )
  }

  return next.map(({ demoPassword: _, ...profile }) => profile)
}

