// lib/calc.ts
import { Cement, InputsState, ResultRow } from './types'

export function formatNumber(n: number): string {
  try { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n) }
  catch { return Math.round(n).toString() }
}

function isOPC(c: Cement): boolean { return /^CEM\s*I\b/i.test(c.cement_type) }

export function opcWorstBaseline(cements: Cement[]):
  | { id: string; ef: number; label: string } | null {
  if (!cements?.length) return null
  const opc = cements.filter(isOPC)
  const pickFrom = opc.length ? opc : cements
  const worst = pickFrom.reduce((m, c) =>
    c.co2e_per_kg_binder_A1A3 > m.co2e_per_kg_binder_A1A3 ? c : m, pickFrom[0])
  return { id: worst.id, ef: worst.co2e_per_kg_binder_A1A3, label: worst.cement_type }
}

const strengthToDosage: Record<InputsState['concreteStrength'], number> = {
  'C20/25': 300, 'C25/30': 320, 'C30/37': 330, 'C35/45': 340,
  'C40/50': 350, 'C45/55': 360, 'C50/60': 370,
}

function compatibleWithExposure(c: Cement, exposureClass: string): boolean {
  if (!exposureClass) return true
  if (!c.compatible_exposure_classes?.length) return true
  return c.compatible_exposure_classes.includes(exposureClass)
}

function resolveDosage(c: Cement, inputs: InputsState): number {
  if (inputs.dosageMode === 'perCement') {
    const map = inputs.perCementDosage || {}
    if (map[c.id] != null && !Number.isNaN(map[c.id])) return map[c.id]
    // fall back to cement default / strength map
    return c.default_dosage_kg_per_m3 || strengthToDosage[inputs.concreteStrength]
  }
  // global mode
  return inputs.globalDosage || strengthToDosage[inputs.concreteStrength] || c.default_dosage_kg_per_m3
}

export function computeRows(cements: Cement[], inputs: InputsState): ResultRow[] {
  if (!cements?.length) return []
  const baseline = opcWorstBaseline(cements)
  const baselineEF = baseline?.ef ?? Math.max(...cements.map(c => c.co2e_per_kg_binder_A1A3))

  return cements.map(c => {
    const dosageUsed = resolveDosage(c, inputs)
    const co2ePerM3_A1A3 = dosageUsed * c.co2e_per_kg_binder_A1A3
    const a4Transport = inputs.includeA4
      ? c.transport_ef_kg_per_m3_km * inputs.distanceKm * inputs.volumeM3
      : 0
    const totalElement = co2ePerM3_A1A3 * inputs.volumeM3 + a4Transport
    const exposureCompatible = compatibleWithExposure(c, inputs.exposureClass)
    const gwpReductionPct = ((baselineEF - c.co2e_per_kg_binder_A1A3) / baselineEF) * 100
    const tags = isOPC(c) ? ['OPC'] : (c.scms?.map(s => s.type) ?? [])
    return { cement: c, dosageUsed, co2ePerM3_A1A3, a4Transport, totalElement, exposureCompatible, tags, gwpReductionPct }
  })
}
