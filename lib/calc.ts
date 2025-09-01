// lib/calc.ts
import { Cement, InputsState, ResultRow, ExposureClass } from './types'
import { tagsForCement } from './tags'

export function formatNumber(n: number): string {
  try {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
  } catch {
    return Math.round(n).toString()
  }
}

function isOPC(c: Cement): boolean {
  return /^CEM\s*I\b/i.test(c.cement_type)
}

/** Pick worst EF OPC as baseline; if no OPC present, worst EF overall. */
export function opcWorstBaseline(cements: Cement[]):
  | { id: string; ef: number; label: string } | null {
  if (!cements?.length) return null
  const opc = cements.filter(isOPC)
  const pool = opc.length ? opc : cements
  const worst = pool.reduce((m, c) =>
    (c.co2e_per_kg_binder_A1A3 > m.co2e_per_kg_binder_A1A3 ? c : m), pool[0])
  return {
    id: worst.id,
    ef: worst.co2e_per_kg_binder_A1A3,
    label: `${worst.cement_type} (worst ${opc.length ? 'OPC' : 'overall'})`,
  }
}

/** Exposure compatibility: if no class requested or no data, treat as compatible. */
function compatibleWithExposure(c: Cement, exposureClass: ExposureClass): boolean {
  if (!exposureClass) return true
  if (!c.compatible_exposure_classes?.length) return true
  return c.compatible_exposure_classes.includes(exposureClass)
}

/** Resolve binder dosage (kg/m³) based on user mode and per-cement overrides. */
function resolveDosage(c: Cement, inputs: InputsState): number {
  if (inputs.dosageMode === 'perCement') {
    const per = inputs.perCementDosage?.[c.id]
    if (typeof per === 'number' && per > 0) return per
    return c.default_dosage_kg_per_m3
  }
  if (typeof inputs.globalDosage === 'number' && inputs.globalDosage > 0) {
    return inputs.globalDosage
  }
  return c.default_dosage_kg_per_m3
}

/** Compute table/chart rows using current inputs; baselineEF can be null */
export function computeRows(
  cements: Cement[],
  inputs: InputsState,
  baselineEFNullable: number | null
): ResultRow[] {
  if (!cements?.length) return []
  const baselineEF = baselineEFNullable ??
    (() => {
      const base = opcWorstBaseline(cements)
      return base ? base.ef : Math.max(...cements.map(c => c.co2e_per_kg_binder_A1A3))
    })()

  return cements.map(c => {
    const dosageUsed = resolveDosage(c, inputs)
    const co2ePerM3_A1A3 = dosageUsed * c.co2e_per_kg_binder_A1A3

    // A4 transport: factor (kg CO2e / m3 / km) * distanceKm * volumeM3
    const a4Transport = inputs.includeA4
      ? c.transport_ef_kg_per_m3_km * inputs.distanceKm * inputs.volumeM3
      : 0

    // Total for the element: (A1-A3 per m3 * volume) + optional A4
    const totalElement = co2ePerM3_A1A3 * inputs.volumeM3 + a4Transport

    const exposureCompatible = compatibleWithExposure(c, inputs.exposureClass)

    // ✅ Use consistent, human-readable tags so filters work
    const tags = tagsForCement(c)

    const gwpReductionPct = ((baselineEF - c.co2e_per_kg_binder_A1A3) / baselineEF) * 100

    return {
      cement: c,
      dosageUsed,
      co2ePerM3_A1A3,
      a4Transport,
      totalElement,
      exposureCompatible,
      tags,
      gwpReductionPct,
    }
  })
}
