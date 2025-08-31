// lib/calc.ts
import { Cement, ResultRow } from './types'

/** Baseline: CEM I 52.5R — 0.60 kg CO2e/kg (A1–A3) */
export const BASELINE_GWP_KG_PER_KG = 0.60

export function computeCo2ePerM3(dosageKgPerM3: number, efKgPerKg: number) {
  return dosageKgPerM3 * efKgPerKg
}

export function computeA4(volumeM3: number, distanceKm: number, efKgPerM3Km: number) {
  return volumeM3 * distanceKm * efKgPerM3Km
}

export function computeTotal(
  volumeM3: number,
  co2ePerM3: number,
  includeA4: boolean,
  a4: number
) {
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
export function reductionPct(ef: number, baseline = BASELINE_GWP_KG_PER_KG) {
  return ((baseline - ef) / baseline) * 100
}

export function toResultRows(
  cements: Cement[],
  opts: {
    exposureClass: string
    volumeM3: number
    distanceKm: number
    includeA4: boolean
    dosageFor: (c: Cement) => number
    tagsFor: (c: Cement) => string[]
  }
): ResultRow[] {
  return cements.map((c) => {
    const dosage = opts.dosageFor(c)
    const co2ePerM3 = computeCo2ePerM3(dosage, c.co2e_per_kg_binder_A1A3)
    const a4 = computeA4(opts.volumeM3, opts.distanceKm, c.transport_ef_kg_per_m3_km)
    const total = computeTotal(opts.volumeM3, co2ePerM3, opts.includeA4, a4)
    const exposureCompatible = isExposureCompatible(c, opts.exposureClass)
    const gwpReductionPct = reductionPct(c.co2e_per_kg_binder_A1A3)

    return {
      cement: c,
      dosageUsed: dosage,
      co2ePerM3_A1A3: co2ePerM3,
      a4Transport: a4,
      totalElement: total,
      exposureCompatible,
      tags: opts.tagsFor(c),
      gwpReductionPct,
    }
  })
}
