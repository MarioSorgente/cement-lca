// lib/data.ts
import { Cement } from './types'

// We read the JSON from /public so you can keep your dataset where it is.
// Using require() avoids needing resolveJsonModule in tsconfig.
const raw: unknown = require('../public/data/cements.json')

// Basic runtime guard + cast
export const cements: Cement[] = Array.isArray(raw) ? (raw as Cement[]) : []
