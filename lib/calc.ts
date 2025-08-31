// lib/calc.ts
import { Cement, ResultRow } from './types'

/** Find the "baseline" as the worst OPC (no SCMs) in the dataset. */
export function getWorstOPCBaseline(cements: Cement[]): { ef: number; cementId?: string; label?: string } {
  const opc = cements.filter(c => c.scms.length === 0)
  if (opc.length === 0) {
    // Fallback: worst overall if no pure OPC exists
    const worst = [...cements].sort((a, b) => b.co2e_per_kg_binder_A1A3 - a.co2e_per_kg_binder_A1A3)[0]
    return { ef: worst?.co2e_per_kg_binder_A1A3 ?? 0.6, cementId: worst?.id, label: worst?.cement_type }
  }
  const worstOPC = [...opc].sort((a, b) => b.co2e_per_kg_binder_A1A3 - a.co2e_per_kg_binder_A1A3)[0]
  return { ef: worstOPC.co2e_per_kg_binder_A1A3, cementId: worstOPC.id, label: worstOPC.cement_type }
}

/** A1–A3 per m³ from dosage and EF (kg CO2e/kg). */
export function computeCo2ePerM3(dosageKgPerM3: number, efKgPerKg: number) {
  return dosageKgPerM3 * efKgPerKg
}

/** A4 transport (kg CO2e) for whole element. */
export function computeA4(volumeM3: number, distanceKm: number, efKgPerM3Km: number) {
  return volumeM3 * distanceKm * efKgPerM3Km
}

/** Element total (kg): volume × A1–A3 per m³ (+ A4 if included). */
export function computeTotal(volumeM3: number, co2ePerM3: number, includeA4: boolean, a4: number) {
  const a1a3 = volumeM3 * co2ePerM3
  return includeA4 ? a1a3 + a4 : a1a3
}

export function isExposureCompatible(cement: Cement, exposure: string) {
  return cement.compatible_exposure_classes.includes(exposure)
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n)
}

/** % reduction vs baseline EF. Positive = better than baseline; 0 = equal; negative = worse. */
export function reductionPct(ef: number, baselineEf: number) {
  if (!baselineEf || !isFinite(baselineEf)) return 0
  return ((baselineEf - ef) / baselineEf) * 100
}

/** Build table/chart rows with a provided EF baseline. */
export function toResultRows(
  cements: Cement[],
  opts: {
    exposureClass: string
    volumeM3: number
    distanceKm: number
    includeA4: boolean
    dosageFor: (c: Cement) => number
    tagsFor: (c: Cement) => string[]
    baselineEf: number
  }
): ResultRow[] {
  return cements.map((c) => {
    const dosage = opts.dosageFor(c)
    const co2ePerM3 = computeCo2ePerM3(dosage, c.co2e_per_kg_binder_A1A3)
    const a4 = computeA4(opts.volumeM3, opts.distanceKm, c.transport_ef_kg_per_m3_km)
    const total = computeTotal(opts.volumeM3, co2ePerM3, opts.includeA4, a4)
    const exposureCompatible = isExposureCompatible(c, opts.exposureClass)
    const gwpReductionPct = reductionPct(c.co2e_per_kg_binder_A1A3, opts.baselineEf)

    return {
      cement: c,
      dosageUsed: dosage,
      co2ePerM3_A1A3: co2ePerM3,
      a4Transport: a4,
      totalElement: total,
      exposureCompatible,
      tags: opts.tagsFor(c),
      gwpReductionPct
    }
  })
}
