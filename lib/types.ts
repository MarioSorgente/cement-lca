// lib/types.ts

// ---- SCMs (Supplementary Cementitious Materials) ----
export type SCMType = 'S' | 'V' | 'P' | 'LL' | 'CC' // Slag, Fly ash, Pozzolana, Limestone, Calcined Clay
export interface SCM { type: SCMType; fraction: number }

// ---- Concrete strength & exposure classes (match UI & data) ----
export type ConcreteStrength =
  | 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45' | 'C40/50' | 'C45/55' | 'C50/60'

export type ExposureClass =
  | 'XC1' | 'XC2' | 'XC3' | 'XC4'
  | 'XD1' | 'XD2' | 'XD3'
  | 'XS1' | 'XS2' | 'XS3'
  | 'XF1' | 'XF2'
  | 'XA2' | 'XA3'

// ---- Filters for tag chips ----
export type TagFilterKey =
  | 'OPC' | 'Slag' | 'FlyAsh' | 'Pozzolana' | 'Limestone' | 'CalcinedClay' | 'Composite'

export type Filters = Record<TagFilterKey, boolean>

// ---- Cement record (matches public/data/cements.json) ----
export interface Cement {
  id: string
  standard: string
  cement_type: string
  strength_class: string
  early_strength: 'N' | 'R'
  clinker_fraction: number
  scms: SCM[]
  density_kg_m3: number
  default_dosage_kg_per_m3: number

  co2e_per_kg_binder_A1A3: number
  transport_ef_kg_per_m3_km: number

  typical_w_c_range?: [number, number]
  compatible_exposure_classes?: ExposureClass[]
  declared_scope?: string
  notes?: string
  applications?: string[]
  is_common?: boolean
}

// ---- Inputs state for the UI ----
export type DosageMode = 'global' | 'perCement'

export interface InputsState {
  // Design inputs
  concreteStrength: ConcreteStrength
  exposureClass: ExposureClass

  // Element & logistics
  volumeM3: number
  distanceKm: number
  includeA4: boolean

  // Dosage
  dosageMode: DosageMode
  globalDosage: number
  perCementDosage: Record<string, number>

  // Tag filters
  filters: Filters
}

// ---- Computed row shown in table & chart ----
export interface ResultRow {
  cement: Cement
  dosageUsed: number
  co2ePerM3_A1A3: number
  a4Transport: number
  totalElement: number
  exposureCompatible: boolean
  tags: string[]
  /** +% better vs baseline EF (positive is better) */
  gwpReductionPct: number
}
