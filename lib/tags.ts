import { Cement } from './types'
export function tagsForCement(c: Cement): string[] {
const tags: string[] = []
if (!c.scms || c.scms.length === 0) tags.push('OPC')
const types = new Set(c.scms.map(s => s.type))
if (types.has('S')) tags.push('Slag')
if (types.has('V')) tags.push('FlyAsh')
if (types.has('P')) tags.push('Pozzolana')
if (types.has('LL')) tags.push('Limestone')
if (types.has('CC')) tags.push('CalcinedClay')
if (c.scms.length >= 2) tags.push('Composite')
return tags
}
