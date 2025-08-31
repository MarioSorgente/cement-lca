// lib/types.ts

export type SCMType = 'S' | 'V' | 'P' | 'LL' | 'CC'

export interface SCM {
  type: SCMType
  fraction: number
}

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
  typical_w_c_range: [number, number]
  compatible_exposure_classes: string[]
  declared_scope: 'A1-A3' | 'A1-A5'
  notes?: string
}

export interface InputsState {
  concreteStrength:
    | 'C20/25'
    | 'C25/30'
    | 'C30/37'
    | 'C35/45'
    | 'C40/50'
    | 'C45/55'
    | 'C50/60'
  exposureClass: string
  volumeM3: number
  distanceKm: number
  includeA4: boolean
  dosageMode: 'global' | 'perCement'
  globalDosage: number
  filters: {
    OPC: boolean
    Slag: boolean
    FlyAsh: boolean
    Pozzolana: boolean
    Limestone: boolean
    CalcinedClay: boolean
    Composite: boolean
  }
}

export interface ResultRow {
  cement: Cement
  dosageUsed: number                 // kg binder per m3 used in calc
  co2ePerM3_A1A3: number            // kg CO2e per m3 (A1–A3)
  a4Transport: number               // kg CO2e (A4) for the whole element
  totalElement: number              // kg CO2e element total (A1–A3 [+ A4 if enabled])
  exposureCompatible: boolean
  tags: string[]
  /** % reduction vs baseline EF (CEM I 52.5R = 0.60 kgCO2e/kg). Can be negative. */
  gwpReductionPct: number
}
