export function handlePortalAction(
  body: Record<string, unknown>,
  dbUrl: string,
): Promise<{ status: number; data: unknown }>
