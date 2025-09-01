// lib/types.ts

// ---- Cement composition ----
export type SCMType = 'S' | 'V' | 'P' | 'LL' | 'CC' // Slag, Fly ash, Pozzolana, Limestone, Calcined Clay
export interface SCM { type: SCMType; fraction: number }

// ---- Concrete strength & exposure classes ----
export type ConcreteStrength =
  | 'C20/25' | 'C25/30' | 'C30/37' | 'C35/45' | 'C40/50' | 'C45/55' | 'C50/60'

// Keep in sync with the UI options in components/Inputs.tsx and data
export type ExposureClass =
  | 'XC1' | 'XC2' | 'XC3' | 'XC4'
  | 'XD1' | 'XD2' | 'XD3'
  | 'XS1' | 'XS2' | 'XS3'
  | 'XF1' | 'XF2'
  | 'XA2' | 'XA3'

// ---- Filters (used in ResultsTable & Inputs) ----
export type TagFilterKey =
  | 'OPC' | 'Slag' | 'FlyAsh' | 'Pozzolana' | 'Limestone' | 'CalcinedClay' | 'Composite'

export type Filters = Record<TagFilterKey, boolean>

// ---- Cement as provided by public/data/cements.json ----
export interface Cement {
  id: string
  standard: string
  cement_type: string
  strength_class: string                     // e.g., "42.5N"
  early_strength: 'N' | 'R'
  clinker_fraction: number
  scms: SCM[]
  density_kg_m3: number
  default_dosage_kg_per_m3: number

  // LCA & logistics
  co2e_per_kg_binder_A1A3: number           // kg CO2e per kg binder (A1–A3)
  transport_ef_kg_per_m3_km: number         // kg CO2e per m³ per km (A4 factor)

  // Additional metadata present in JSON
  typical_w_c_range?: [number, number]
  compatible_exposure_classes?: ExposureClass[]
  declared_scope?: string                    // e.g., "A1-A3"
  notes?: string
  applications?: string[]
  is_common?: boolean
}

// ---- UI state for the tool ----
export type DosageMode = 'global' | 'perCement'

export interface InputsState {
  // Concrete design inputs
  concreteStrength: ConcreteStrength         // was "strengthClass" → canonical is concreteStrength
  exposureClass: ExposureClass

  // Element & logistics
  volumeM3: number
  distanceKm: number
  includeA4: boolean

  // Dosage control
  dosageMode: DosageMode
  /** Global binder dosage (kg/m³) applied when dosageMode === 'global' */
  globalDosage: number
  /** Per-cement override (kg/m³) when dosageMode === 'perCement'; key is Cement.id */
  perCementDosage: Record<string, number>

  // Tag filters
  filters: Filters
}

// ---- Computed row for tables & charts ----
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
