import { Cement } from './types'

export function tagsForCement(c: Cement): string[] {
  const tags: string[] = []

  // No SCMs → treat as OPC
  if (!c.scms || c.scms.length === 0) tags.push('OPC')

  // Safely build a set of SCM types (handles undefined/empty arrays)
  const types = new Set((c.scms ?? []).map(s => s.type))

  if (types.has('S')) tags.push('Slag')
  if (types.has('V')) tags.push('FlyAsh')
  if (types.has('P')) tags.push('Pozzolana')
  if (types.has('LL')) tags.push('Limestone')
  if (types.has('CC')) tags.push('CalcinedClay')

  // Composite if 2+ SCMs present
  if ((c.scms?.length ?? 0) >= 2) tags.push('Composite')

  return tags
}
