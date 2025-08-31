// lib/calc.ts
import { Cement, InputsState, ResultRow } from './types'

/** Format with thin spaces for thousands (or default locale if you prefer) */
export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  } catch {
    return Math.round(n).toString()
  }
}

/** Heuristic: treat CEM I as OPC */
function isOPC(c: Cement): boolean {
  // examples: "CEM I 42.5N", "CEM I 52.5R"
  return /^CEM\s*I\b/i.test(c.cement_type)
}

/** Pick the worst (highest EF) OPC as the baseline; fallback to max EF overall. */
export function opcWorstBaseline(cements: Cement[]):
  | { id: string; ef: number; label: string }
  | null {
  if (!cements?.length) return null
  const opc = cements.filter(isOPC)
  const target = (opc.length ? opc : cements).reduce((max, c) =>
    (c.co2e_per_kg_binder_A1A3 > max.co2e_per_kg_binder_A1A3 ? c : max), (opc.length ? opc[0] : cements[0])
  )
  return {
    id: target.id,
    ef: target.co2e_per_kg_binder_A1A3,
    label: target.cement_type,
  }
}

/** Very simple mapping from concrete strength class to a typical binder dosage (kg/m3) */
const strengthToDosage: Record<InputsState['concreteStrength'], number> = {
  'C20/25': 300,
  'C25/30': 320,
  'C30/37': 330,
  'C35/45': 340,
  'C40/50': 350,
  'C45/55': 360,
  'C50/60': 370,
}

/** Returns true if the cement declares compatibility with the chosen exposure class. */
function compatibleWithExposure(c: Cement, exposureClass: string): boolean {
  if (!exposureClass) return true
  if (!c.compatible_exposure_classes?.length) return true
  return c.compatible_exposure_classes.includes(exposureClass)
}

/** Compute dosage to use (global override or cement default / strength-based). */
function resolveDosage(c: Cement, inputs: InputsState): number {
  if (inputs.dosageMode === 'global') {
    // If global provided, prefer it; otherwise use strength map as a fallback.
    return inputs.globalDosage || strengthToDosage[inputs.concreteStrength] || c.default_dosage_kg_per_m3
  }
  // Per-cement mode (not exposed heavily in MVP) – use default or strength heuristic
  return c.default_dosage_kg_per_m3 || strengthToDosage[inputs.concreteStrength]
}

/** Build the comparison rows used in table + chart. */
export function computeRows(cements: Cement[], inputs: InputsState): ResultRow[] {
  if (!cements?.length) return []

  const baseline = opcWorstBaseline(cements)
  const baselineEF = baseline?.ef ?? Math.max(...cements.map(c => c.co2e_per_kg_binder_A1A3))

  return cements.map(c => {
    const dosageUsed = resolveDosage(c, inputs) // kg/m3
    const co2ePerM3_A1A3 = dosageUsed * c.co2e_per_kg_binder_A1A3 // kg per m3
    const a4Transport = inputs.includeA4
      ? c.transport_ef_kg_per_m3_km * inputs.distanceKm * inputs.volumeM3 // kg per element
      : 0

    const totalElement = co2ePerM3_A1A3 * inputs.volumeM3 + a4Transport // kg per element
    const exposureCompatible = compatibleWithExposure(c, inputs.exposureClass)

    // % reduction vs baseline EF (positive = better than baseline)
    const gwpReductionPct = ((baselineEF - c.co2e_per_kg_binder_A1A3) / baselineEF) * 100

    const tags: string[] = []
    if (isOPC(c)) tags.push('OPC')
    if (c.scms?.length) tags.push(...c.scms.map(s => s.type))

    const row: ResultRow = {
      cement: c,
      dosageUsed,
      co2ePerM3_A1A3,
      a4Transport,
      totalElement,
      exposureCompatible,
      tags,
      gwpReductionPct,
    }
    return row
  })
}
