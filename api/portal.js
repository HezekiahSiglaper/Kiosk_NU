/**
 * api/portal.js — Serverless + Vite Dev API route for Neon Postgres over HTTPS (port 443).
 *
 * Uses Neon's native HTTP SQL endpoint (`https://<host>/sql`) so it works on
 * campus networks (where port 5432 is blocked), on Vercel, and in local Vite dev
 * with zero extra npm dependencies.
 */

function normalizeConnectionString(raw) {
  return raw
    .trim()
    .replace(/([?&])channel_binding=[^&]*(&?)/g, (_, p1, p2) => (p2 ? p1 : ''))
}

async function neonQuery(connectionString, query, params = []) {
  const cleanConn = normalizeConnectionString(connectionString)
  const parsed = new URL(cleanConn)
  const endpoint = `https://${parsed.hostname}/sql`
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Neon-Connection-String': cleanConn,
      'Neon-Raw-Text-Output': 'false',
      'Neon-Array-Mode': 'false',
    },
    body: JSON.stringify({ query, params }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText)
    throw new Error(`Neon SQL error (${res.status}): ${errText}`)
  }
  const data = await res.json()
  return data.rows || []
}

export async function handlePortalAction(body, dbUrl) {
  if (!dbUrl) {
    return { status: 503, data: { error: 'DATABASE_URL not configured' } }
  }

  const { action } = body || {}

  switch (action) {
    case 'status': {
      return { status: 200, data: { configured: true, provider: 'neon' } }
    }

    case 'list_displays': {
      const rows = await neonQuery(
        dbUrl,
        'SELECT * FROM public.displays ORDER BY name ASC',
      )
      return { status: 200, data: rows }
    }

    case 'heartbeat': {
      const { id, fields } = body
      if (!id || !fields) return { status: 200, data: { ok: true } }
      const allowed = ['status', 'response_time', 'last_seen']
      const sets = ['updated_at = now()']
      const params = []
      for (const k of allowed) {
        if (k in fields) {
          params.push(fields[k])
          sets.push(`${k} = $${params.length}`)
        }
      }
      params.push(id)
      await neonQuery(
        dbUrl,
        `UPDATE public.displays SET ${sets.join(', ')} WHERE id = $${params.length}`,
        params,
      )
      return { status: 200, data: { ok: true } }
    }

    case 'list_commands': {
      const limit = Number(body.limit) || 40
      const rows = await neonQuery(
        dbUrl,
        'SELECT * FROM public.display_commands ORDER BY created_at DESC LIMIT $1',
        [limit],
      )
      return { status: 200, data: rows }
    }

    case 'list_events': {
      const limit = Number(body.limit) || 60
      const rows = await neonQuery(
        dbUrl,
        'SELECT * FROM public.display_events ORDER BY created_at DESC LIMIT $1',
        [limit],
      )
      return { status: 200, data: rows }
    }

    case 'log_event': {
      const { display_id, event_type, message } = body
      await neonQuery(
        dbUrl,
        `INSERT INTO public.display_events (display_id, event_type, message)
         VALUES ($1, $2, $3)`,
        [display_id || null, event_type || 'info', message || null],
      )
      return { status: 200, data: { ok: true } }
    }

    case 'send_command': {
      const { display_id, command, payload } = body
      const rows = await neonQuery(
        dbUrl,
        `INSERT INTO public.display_commands (display_id, command, payload)
         VALUES ($1, $2, $3::jsonb)
         RETURNING *`,
        [display_id, command, JSON.stringify(payload || {})],
      )
      return { status: 200, data: rows[0] || null }
    }

    case 'list_content': {
      const rows = await neonQuery(
        dbUrl,
        'SELECT * FROM public.kiosk_content ORDER BY created_at DESC',
      )
      return { status: 200, data: rows }
    }

    case 'create_content': {
      const f = body.item || {}
      const rows = await neonQuery(
        dbUrl,
        `INSERT INTO public.kiosk_content (
          title, subtitle, body, content_type, theme, media_url,
          event_date, event_time, event_location, cta_label, cta_url,
          target_displays, start_date, end_date, duration_seconds,
          status, author_name
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12::text[], $13, $14, $15,
          $16, $17
        ) RETURNING *`,
        [
          f.title,
          f.subtitle || null,
          f.body || null,
          f.content_type || 'poster',
          f.theme || 'midnight',
          f.media_url || null,
          f.event_date || null,
          f.event_time || null,
          f.event_location || null,
          f.cta_label || null,
          f.cta_url || null,
          Array.isArray(f.target_displays) && f.target_displays.length > 0
            ? f.target_displays
            : ['all'],
          f.start_date || null,
          f.end_date || null,
          Number(f.duration_seconds) || 15,
          f.status || 'published',
          f.author_name || 'Campus Staff',
        ],
      )
      return { status: 200, data: rows[0] }
    }

    case 'update_content': {
      const { id, updates } = body
      if (!id || !updates) {
        return { status: 400, data: { error: 'Missing id or updates' } }
      }
      const allowed = [
        'title',
        'subtitle',
        'body',
        'content_type',
        'theme',
        'media_url',
        'event_date',
        'event_time',
        'event_location',
        'cta_label',
        'cta_url',
        'target_displays',
        'start_date',
        'end_date',
        'duration_seconds',
        'status',
        'author_name',
      ]
      const sets = ['updated_at = now()']
      const params = []
      for (const key of allowed) {
        if (key in updates) {
          params.push(updates[key])
          sets.push(
            key === 'target_displays'
              ? `${key} = $${params.length}::text[]`
              : `${key} = $${params.length}`,
          )
        }
      }
      params.push(id)
      const rows = await neonQuery(
        dbUrl,
        `UPDATE public.kiosk_content SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`,
        params,
      )
      return { status: 200, data: rows[0] || null }
    }

    case 'delete_content': {
      const { id } = body
      await neonQuery(dbUrl, 'DELETE FROM public.kiosk_content WHERE id = $1', [id])
      return { status: 200, data: { ok: true } }
    }

    case 'list_owners': {
      const rows = await neonQuery(
        dbUrl,
        'SELECT * FROM public.kiosk_owners ORDER BY full_name ASC',
      )
      return { status: 200, data: rows }
    }

    case 'upsert_owner': {
      const o = body.owner || {}
      const rows = await neonQuery(
        dbUrl,
        `INSERT INTO public.kiosk_owners (email, full_name, department, role, assigned_displays, updated_at)
         VALUES ($1, $2, $3, $4, $5::text[], now())
         ON CONFLICT (email) DO UPDATE SET
           full_name = EXCLUDED.full_name,
           department = EXCLUDED.department,
           role = EXCLUDED.role,
           assigned_displays = EXCLUDED.assigned_displays,
           updated_at = now()
         RETURNING *`,
        [
          o.email,
          o.full_name,
          o.department || 'Campus Staff',
          o.role || 'kiosk_owner',
          Array.isArray(o.assigned_displays) ? o.assigned_displays : [],
        ],
      )
      return { status: 200, data: rows[0] }
    }

    default:
      return { status: 400, data: { error: `Unknown action: ${action}` } }
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  try {
    const result = await handlePortalAction(req.body, process.env.DATABASE_URL)
    res.status(result.status).json(result.data)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
