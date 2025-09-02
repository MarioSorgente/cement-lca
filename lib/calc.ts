// lib/calc.ts
import { InputsState, ResultRow, Cement } from './types'

/**
 * FORMATTERS
 */
export function formatNumber(n: number): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '0'
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
}

/**
 * Compute whether a cement is compatible with the requested exposure class.
 * If data is missing, we treat it as compatible (do-no-harm).
 */
function isExposureCompatible(c: Cement, exposureClass: InputsState['exposureClass']): boolean {
  if (!exposureClass) return true
  const list = (c as any).compatible_exposure_classes as string[] | undefined
  if (!list || !list.length) return true
  return list.includes(exposureClass as string)
}

/**
 * Resolve the dosage to use for a cement, respecting global/per-cement mode.
 * - perCement: first look in the provided map, fallback to global
 * - global: always global
 */
function resolveDosage(c: Cement, inputs: InputsState, perCement?: Record<string, number>): number {
  if (inputs.dosageMode === 'perCement' && perCement) {
    const v = perCement[c.id]
    if (typeof v === 'number' && v >= 0) return v
  }
  return Math.max(0, Number(inputs.globalDosage ?? 0))
}

/**
 * NEW: Cement-only A4 computation.
 * A4cement (kg CO₂) = distance_km × transport_EF_(kg CO₂ / kg·km) × (dosage_kg/m³ × volume_m³)
 */
function computeA4cement(cement: Cement, dosageKgPerM3: number, inputs: InputsState): number {
  if (!inputs.includeA4) return 0
  const distKm = Math.max(0, Number(inputs.distanceKm ?? 0))
  const volM3  = Math.max(0, Number(inputs.volumeM3 ?? 0))
  const efKgPerKgKm = Number(cement.transport_ef_kg_per_kg_km ?? 0) // kg CO2 / (kg·km)
  return distKm * efKgPerKgKm * (dosageKgPerM3 * volM3)
}

/**
 * Compute A1–A3 per m³ and A4 per element (kg),
 * then total CO2e per element (kg).
 */
function elementImpacts(
  cement: Cement,
  dosageKgPerM3: number,
  inputs: InputsState
): { a1a3PerM3: number; a4: number; totalElement: number } {
  const efA1A3 = Number(cement.co2e_per_kg_binder_A1A3 ?? 0) // kg/kg
  const a1a3PerM3 = dosageKgPerM3 * efA1A3 // kg/m3

  // NEW: cement-only A4 (no tonne conversion, no m3·km fallback)
  const a4 = computeA4cement(cement, dosageKgPerM3, inputs) // kg

  const vol = Math.max(0, Number(inputs.volumeM3 ?? 0)) // m3
  const totalElement = a1a3PerM3 * vol + a4
  return { a1a3PerM3, a4, totalElement }
}

/**
 * Baseline EF (kg/kg) is the EF of the worst OPC.
 * If no OPC exists in the dataset, use the worst EF overall.
 */
function baselineEfFromCements(cements: Cement[]): number {
  const opc = cements.filter(
    c => (c.scms?.length ?? 0) === 0 || c.cement_type?.toUpperCase()?.includes('OPC')
  )
  const pool = opc.length ? opc : cements
  const worst = pool.reduce(
    (m, c) => (c.co2e_per_kg_binder_A1A3 > m.co2e_per_kg_binder_A1A3 ? c : m),
    pool[0]
  )
  return Number(worst?.co2e_per_kg_binder_A1A3 ?? 0)
}

/**
 * PUBLIC: compute rows for table/chart.
 * Δ vs baseline is EF-based (as requested).
 */
export function computeRows(
  cements: Cement[],
  inputs: InputsState,
  baselineEFNullable: number | null = null,
  perCementDosage?: Record<string, number>
): ResultRow[] {
  if (!Array.isArray(cements) || !cements.length) return []

  const baselineEF = typeof baselineEFNullable === 'number'
    ? baselineEFNullable
    : baselineEfFromCements(cements)

  const rows: ResultRow[] = cements.map((c) => {
    const dosageUsed = resolveDosage(c, inputs, perCementDosage)
    const { a1a3PerM3, a4, totalElement } = elementImpacts(c, dosageUsed, inputs)

    // EF-based reduction vs baseline EF (keep your existing logic)
    const ef = Number(c.co2e_per_kg_binder_A1A3 ?? 0)
    const gwpReductionPct = baselineEF > 0
      ? ((baselineEF - ef) / baselineEF) * 100
      : 0

    // Tags required by ResultRow: derive from SCMs, fallback to OPC
    const tags: string[] =
      Array.isArray((c as any).scms) && (c as any).scms.length
        ? ((c as any).scms as Array<{ type?: string }>).map(s => (s?.type ?? '').toString()).filter(Boolean)
        : ['OPC']

    const row: ResultRow = {
      cement: c,
      exposureCompatible: isExposureCompatible(c, inputs.exposureClass),

      dosageUsed,
      co2ePerM3_A1A3: a1a3PerM3,
      a4Transport: a4,
      totalElement,

      gwpReductionPct,
      tags, // <-- satisfy ResultRow type
    }
    return row
  })

  return rows
}

/**
 * PUBLIC: find baseline (worst OPC) row from computed rows.
 * If no OPC among rows, pick the highest EF row.
 */
export function opcWorstBaseline(rows: ResultRow[]): ResultRow | undefined {
  if (!rows?.length) return undefined
  const opcRows = rows.filter(
    r => (r.cement.scms?.length ?? 0) === 0 || r.cement.cement_type?.toUpperCase()?.includes('OPC')
  )
  const pool = opcRows.length ? opcRows : rows
  return pool.reduce(
    (m, r) => (r.cement.co2e_per_kg_binder_A1A3 > m.cement.co2e_per_kg_binder_A1A3 ? r : m),
    pool[0]
  )
}

/**
 * OPTIONAL: export CSV for current rows.
 */
export function exportRowsAsCsv(rows: ResultRow[]) {
  const headers = [
    'Cement',
    'Strength',
    'Clinker%',
    'EF (kgCO2/kg)',
    'Dosage (kg/m3)',
    'A1-A3 (kg/m3)',
    'A4 (kg)',
    'Total element (kg)',
    'Δ vs baseline (%)',
  ]
  const lines = rows.map(r => [
    r.cement.cement_type,
    r.cement.strength_class,
    Math.round((r.cement.clinker_fraction ?? 0) * 100),
    Number(r.cement.co2e_per_kg_binder_A1A3 ?? 0).toFixed(3),
    r.dosageUsed,
    r.co2ePerM3_A1A3,
    r.a4Transport,
    r.totalElement,
    Math.round(r.gwpReductionPct),
  ])

  const csv = [headers.join(','), ...lines.map(arr => arr.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cement-results.csv'
  a.click()
  URL.revokeObjectURL(url)
}
