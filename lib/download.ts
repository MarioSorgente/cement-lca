import { ResultRow, InputsState } from './types'

export function downloadCSV(rows: ResultRow[], inputs: InputsState) {
  const headers = [
    'Cement','Type','StrengthGrade','EarlyStrength','Clinker%','SCMs',
    'DosageUsed_kg_per_m3','CO2e_A1A3_kg_per_m3','A4_kg','Total_Element_kg',
    'ExposureCompatible','Tags','Notes'
  ]

  // Keep regex on one line and sanitize commas/newlines for CSV safety
  const sanitize = (s?: string) =>
    (s ?? '').replace(/\r?\n/g, ' ').replace(/,/g, ';')

  const lines = rows.map(r => {
    const scms =
      (r.cement?.scms ?? []).length > 0
        ? (r.cement!.scms!).map(s => `${s.type}:${Math.round((s.fraction ?? 0) * 100)}%`).join('+')
        : '—'

    return [
      r.cement.id,
      r.cement.cement_type,
      r.cement.strength_class,
      r.cement.early_strength,
      Math.round(r.cement.clinker_fraction * 100),
      scms,
      Math.round(r.dosageUsed),
      Math.round(r.co2ePerM3_A1A3),
      Math.round(r.a4Transport),
      Math.round(r.totalElement),
      r.exposureCompatible ? 'Yes' : 'No',
      (r.tags ?? []).join('|'),
      sanitize(r.cement.notes)
    ].join(',')
  })

  const assumptions =
    `Inputs: volume=${inputs.volumeM3}m3; exposure=${inputs.exposureClass}; ` +
    `distance=${inputs.distanceKm}km; includeA4=${inputs.includeA4}; ` +
    `dosageMode=${inputs.dosageMode}; globalDosage=${inputs.globalDosage}`

  const csv = [headers.join(','), ...lines, '', assumptions].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cement-lca-comparison.csv'
  a.click()
  URL.revokeObjectURL(url)
}
