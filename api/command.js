import { handlePortalAction } from './portal.js'

const ALLOWED = new Set([
  'reload',
  'go_home',
  'blackout',
  'emergency_message',
  'clear_blackout',
  'clear_emergency',
  'power_off',
  'power_on',
])

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const { display_id, command, payload } = req.body || {}
  if (!display_id || typeof display_id !== 'string' || !ALLOWED.has(command)) {
    res.status(400).json({ error: 'Invalid command' })
    return
  }

  try {
    const result = await handlePortalAction(
      {
        action: 'send_command',
        display_id,
        command,
        payload: payload && typeof payload === 'object' ? payload : {},
      },
      process.env.DATABASE_URL,
    )
    res.status(result.status).json(result.data)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
