/**
 * Client helper for calling `/api/portal`, which runs SQL queries against
 * the Neon Postgres database (`DATABASE_URL` in `.env`) over HTTPS (port 443).
 */
export function isNeonConfigured(): boolean {
  return (
    import.meta.env.VITE_NEON_CONFIGURED === true ||
    import.meta.env.VITE_NEON_CONFIGURED === 'true'
  )
}

export async function callPortalApi<T>(
  body: Record<string, unknown>,
): Promise<T | null> {
  if (!isNeonConfigured()) return null
  try {
    const res = await fetch('/api/portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      console.warn(`Portal API (${body.action}) failed:`, errText)
      return null
    }
    return (await res.json()) as T
  } catch (err) {
    console.warn(`Portal API (${body.action}) error:`, err)
    return null
  }
}
