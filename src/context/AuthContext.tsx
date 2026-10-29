import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  assignKioskToOwner,
  createOrUpdateKioskOwner,
  fetchAllKioskOwners,
  getSavedSessionProfile,
  saveSessionProfile,
  signInWithEmailPassword,
  signOutUser,
} from '../services/auth'
import type { KioskOwnerProfile, UserRole } from '../types/auth'
import type { KioskContentItem } from '../types/content'

type AuthContextValue = {
  user: KioskOwnerProfile | null
  owners: KioskOwnerProfile[]
  loading: boolean
  login: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; error: string | null }>
  logout: () => Promise<void>
  ownsDisplay: (displayId: string) => boolean
  canDirectlyPublishTo: (targetDisplays: string[]) => boolean
  canManageContentItem: (item: KioskContentItem) => boolean
  getDisplayOwner: (displayId: string) => KioskOwnerProfile | undefined
  reassignKiosk: (displayId: string, newOwnerId: string) => Promise<void>
  upsertOwner: (input: {
    email: string
    full_name: string
    department: string
    role: UserRole
    assigned_displays: string[]
    password?: string
  }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<KioskOwnerProfile | null>(() =>
    getSavedSessionProfile(),
  )
  const [owners, setOwners] = useState<KioskOwnerProfile[]>([])
  const [loading, setLoading] = useState(true)

  const refreshOwners = useCallback(async () => {
    const list = await fetchAllKioskOwners()
    setOwners(list)
    setUser((prev) => {
      if (!prev) return null
      const refreshed = list.find(
        (o) => o.email.toLowerCase() === prev.email.toLowerCase(),
      )
      if (refreshed) {
        saveSessionProfile(refreshed)
        return refreshed
      }
      return prev
    })
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshOwners()
    const handleOwnersUpdated = () => {
      refreshOwners()
    }
    window.addEventListener('nu-kiosk-owners-updated', handleOwnersUpdated)
    return () => {
      window.removeEventListener('nu-kiosk-owners-updated', handleOwnersUpdated)
    }
  }, [refreshOwners])

  const login = useCallback(async (email: string, password: string) => {
    const { user: signedIn, error } = await signInWithEmailPassword(email, password)
    if (error || !signedIn) {
      return { ok: false, error: error || 'Login failed' }
    }
    setUser(signedIn)
    return { ok: true, error: null }
  }, [])

  const logout = useCallback(async () => {
    await signOutUser()
    setUser(null)
  }, [])

  const ownsDisplay = useCallback(
    (displayId: string): boolean => {
      if (!user) return false
      if (user.role === 'super_admin') return true
      return user.assigned_displays.includes(displayId)
    },
    [user],
  )

  const canDirectlyPublishTo = useCallback(
    (targetDisplays: string[]): boolean => {
      if (!user) return false
      if (user.role === 'super_admin') return true
      if (targetDisplays.length === 0 || targetDisplays.includes('all')) {
        return false
      }
      return targetDisplays.every((id) => user.assigned_displays.includes(id))
    },
    [user],
  )

  const canManageContentItem = useCallback(
    (item: KioskContentItem): boolean => {
      if (!user) return false
      if (user.role === 'super_admin') return true
      if (
        item.author_name &&
        item.author_name.toLowerCase().includes(user.full_name.toLowerCase())
      ) {
        return true
      }
      if (item.target_displays.includes('all')) {
        return user.assigned_displays.length > 0
      }
      return item.target_displays.some((id) =>
        user.assigned_displays.includes(id),
      )
    },
    [user],
  )

  const getDisplayOwner = useCallback(
    (displayId: string): KioskOwnerProfile | undefined => {
      return (
        owners.find(
          (o) =>
            o.role === 'kiosk_owner' && o.assigned_displays.includes(displayId),
        ) || owners.find((o) => o.role === 'super_admin')
      )
    },
    [owners],
  )

  const reassignKiosk = useCallback(
    async (displayId: string, newOwnerId: string) => {
      const next = await assignKioskToOwner(displayId, newOwnerId)
      setOwners(next)
      setUser((prev) => {
        if (!prev) return null
        const updated = next.find((o) => o.id === prev.id)
        if (updated) saveSessionProfile(updated)
        return updated || prev
      })
    },
    [],
  )

  const upsertOwner = useCallback(
    async (input: {
      email: string
      full_name: string
      department: string
      role: UserRole
      assigned_displays: string[]
      password?: string
    }) => {
      const next = await createOrUpdateKioskOwner(input)
      setOwners(next)
      setUser((prev) => {
        if (!prev) return null
        const updated = next.find(
          (o) => o.email.toLowerCase() === prev.email.toLowerCase(),
        )
        if (updated) saveSessionProfile(updated)
        return updated || prev
      })
    },
    [],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      owners,
      loading,
      login,
      logout,
      ownsDisplay,
      canDirectlyPublishTo,
      canManageContentItem,
      getDisplayOwner,
      reassignKiosk,
      upsertOwner,
    }),
    [
      user,
      owners,
      loading,
      login,
      logout,
      ownsDisplay,
      canDirectlyPublishTo,
      canManageContentItem,
      getDisplayOwner,
      reassignKiosk,
      upsertOwner,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return ctx
}

