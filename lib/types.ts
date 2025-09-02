// lib/types.ts

/** Loosely-typed enums so we don't fight the dataset */
export type ExposureClass = string;   // e.g. 'XC2'
export type StrengthClass = string;   // e.g. '42.5N'

/** SCM entry (supplementary cementitious material) */
export interface Scm {
  type: string;            // 'S' | 'V' | 'P' | 'LL' | 'CC' ... (kept as string for flexibility)
  fraction?: number;       // optional fraction (0..1)
}

/** One cement record (matches your public/data/cements.json shape) */
export interface Cement {
  id: string;
  standard?: string;
  cement_type: string;
  strength_class: StrengthClass;             // e.g. '42.5N'
  early_strength?: 'N' | 'R' | string;

  /** core technicals */
  clinker_fraction: number;                  // 0..1
  scms?: Scm[];                              // empty for OPC
  density_kg_m3?: number;
  default_dosage_kg_per_m3?: number;
  co2e_per_kg_binder_A1A3: number;           // EF
  transport_ef_kg_per_m3_km?: number;

  /** exposure / scope */
  typical_w_c_range?: [number, number];
  compatible_exposure_classes?: string[];
  declared_scope?: string;

  /** UX / copy */
  notes?: string;
  applications?: string[];

  /** optional flags (your JSON sometimes uses is_common) */
  is_common?: boolean;
  common?: boolean;
}

/** UI & calculation inputs */
export interface InputsState {
  exposureClass: ExposureClass;
  volumeM3: number;
  distanceKm: number;
  includeA4: boolean;

  /** dosage selection */
  dosageMode: 'global' | 'perCement';
  globalDosage: number;

  /** UI-only fields (safe to be optional; calc does not depend on them) */
  concreteStrength?: string;   // e.g. 'C25/30'
  strengthClass?: string;      // kept for compatibility if something still reads this
}

/** A computed row used by the table & chart */
export interface ResultRow {
  cement: Cement;

  /** exposure filter */
  exposureCompatible: boolean;

  /** dosage used for this cement (kg/m^3) */
  dosageUsed: number;

  /** A1–A3 per m^3 (kg) */
  co2ePerM3_A1A3: number;

  /** A4 transport per element (kg) */
  a4Transport: number;

  /** total element emission A1–A3 (+ A4 if enabled) (kg) */
  totalElement: number;

  /** EF-based reduction vs baseline OPC EF (percent) */
  gwpReductionPct: number;

  /** tags used in UI (derived from SCMs or 'OPC') */
  tags?: string[];
}
