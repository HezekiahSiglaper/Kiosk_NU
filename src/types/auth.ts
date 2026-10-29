export type UserRole = 'super_admin' | 'kiosk_owner'

export type KioskOwnerProfile = {
  id: string
  email: string
  full_name: string
  department: string
  role: UserRole
  /** Array of display IDs this user owns (e.g. ['chapel-display']). Super admins have access to all. */
  assigned_displays: string[]
  created_at: string
}

/**
 * Default Northwest University staff accounts seeded for immediate local testing
 * and mirrored in `014_auth_and_kiosk_owners.sql`.
 */
export const DEFAULT_KIOSK_OWNERS: (KioskOwnerProfile & { demoPassword: string })[] = [
  {
    id: 'owner-super-admin',
    email: 'admin@northwestu.edu',
    full_name: 'Hannah Vance',
    department: 'Campus Communications & IT (Product Owner)',
    role: 'super_admin',
    assigned_displays: [
      'nu-display',
      'feehall',
      'hsc1',
      'hsc2',
      'pecota',
      '6710',
      'barton-downstairs',
      'barton-left-arrow',
      'barton-right-arrow',
      'chapel-display',
    ],
    demoPassword: 'EagleAdmin2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'owner-chapel',
    email: 'chapel@northwestu.edu',
    full_name: 'Pastor Marcus Sterling',
    department: 'Campus Ministries',
    role: 'kiosk_owner',
    assigned_displays: ['chapel-display'],
    demoPassword: 'Chapel2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'owner-student-life',
    email: 'studentlife@northwestu.edu',
    full_name: 'Sarah Jenkins',
    department: 'Student Life & SwoopShop',
    role: 'kiosk_owner',
    assigned_displays: ['pecota', 'nu-display'],
    demoPassword: 'Pecota2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'owner-hsc',
    email: 'hsc@northwestu.edu',
    full_name: 'Dr. Elena Rostova',
    department: 'Buntain College of Nursing & Health Sciences',
    role: 'kiosk_owner',
    assigned_displays: ['hsc1', 'hsc2', '6710'],
    demoPassword: 'Nursing2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'owner-admissions',
    email: 'admissions@northwestu.edu',
    full_name: 'Jordan Miller',
    department: 'Undergraduate Admissions',
    role: 'kiosk_owner',
    assigned_displays: [
      'barton-downstairs',
      'barton-left-arrow',
      'barton-right-arrow',
    ],
    demoPassword: 'Barton2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
  {
    id: 'owner-feehall',
    email: 'business@northwestu.edu',
    full_name: 'Prof. David Chen',
    department: 'College of Business',
    role: 'kiosk_owner',
    assigned_displays: ['feehall'],
    demoPassword: 'FeeHall2026!',
    created_at: '2026-10-01T08:00:00.000Z',
  },
]

