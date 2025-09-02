// pages/index.tsx
import { useMemo, useState, useCallback } from 'react'
import Head from 'next/head'

// Data & types
import cementsJson from '../public/data/cements.json'
import { Cement, InputsState, ResultRow } from '../lib/types'

// UI
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import CompareTray from '../components/CompareTray'
import ComparePanel from '../components/ComparePanel'

// Utils
import { downloadCSV } from '../lib/download'
import { formatNumber } from '../lib/calc'

// ------- A4 (cement-only) -------
function computeA4cement(cement: Cement, dosageUsedKgPerM3: number, inputs: InputsState): number {
  if (!inputs.includeA4) return 0
  const dist = inputs.distanceKm ?? 0
  const vol = inputs.volumeM3 ?? 0
  const ef = cement.transport_ef_kg_per_kg_km ?? 0 // kg CO2 / (kg·km)
  // A4cement (kg) = distance_km × EF_(kg CO2/kg·km) × (dosage_kg/m3 × volume_m3)
  return dist * ef * (dosageUsedKgPerM3 * vol)
}

// ------- helpers -------
function isOPC(c: Cement) {
  return (c.scms?.length ?? 0) === 0 || /^CEM\s*I\b/i.test(c.cement_type)
}

function tagsFrom(c: Cement): string[] {
  const anyC = c as any
  if (Array.isArray(anyC.tags) && anyC.tags.length) return anyC.tags as string[]
  const scms = c.scms ?? []
  if (scms.length === 0) return ['OPC']
  const codes = new Set(scms.map(s => (s.type || '').toUpperCase()))
  const tags: string[] = []
  if (codes.has('S')) tags.push('Slag')
  if (codes.has('V')) tags.push('Fly ash')
  if (codes.has('P')) tags.push('Pozzolana')
  if (codes.has('LL')) tags.push('Limestone')
  if (codes.has('CC')) tags.push('Calcined clay')
  if (codes.size >= 2) tags.push('Composite')
  return tags
}

function buildRows(
  cements: Cement[],
  inputs: InputsState,
  perCementDosage: Record<string, number>
) {
  // Baseline: worst OPC EF
  const opc = cements.filter(isOPC)
  const worstOPC = opc.length
    ? opc.reduce((m, c) =>
        c.co2e_per_kg_binder_A1A3 > m.co2e_per_kg_binder_A1A3 ? c : m, opc[0])
    : undefined

  const baselineId = worstOPC?.id
  const baselineEf = worstOPC?.co2e_per_kg_binder_A1A3
  const baselineLabel = worstOPC?.cement_type

  const rows: ResultRow[] = cements.map((c) => {
    const exposureCompatible =
      !inputs.exposureClass ||
      (Array.isArray(c.compatible_exposure_classes)
        ? c.compatible_exposure_classes.includes(inputs.exposureClass)
        : true)

    const dosageUsed =
      inputs.dosageMode === 'perCement'
        ? (perCementDosage[c.id] ?? c.default_dosage_kg_per_m3 ?? inputs.globalDosage)
        : inputs.globalDosage

    const co2ePerM3_A1A3 = (c.co2e_per_kg_binder_A1A3 ?? 0) * (dosageUsed ?? 0)
    const a4Transport = computeA4cement(c, dosageUsed ?? 0, inputs)

    const totalElement =
      (inputs.volumeM3 ?? 0) * co2ePerM3_A1A3 +
      (inputs.includeA4 ? a4Transport : 0)

    const gwpReductionPct =
      baselineEf && baselineEf > 0
        ? ((baselineEf - (c.co2e_per_kg_binder_A1A3 ?? 0)) / baselineEf) * 100
        : 0

    return {
      cement: c,
      exposureCompatible,
      dosageUsed: dosageUsed ?? 0,
      co2ePerM3_A1A3,
      a4Transport,
      totalElement,
      gwpReductionPct,
      tags: tagsFrom(c),
    }
  })

  const bestId =
    rows.length
      ? rows.reduce((b, r) => (r.totalElement < b.totalElement ? r : b), rows[0]).cement.id
      : undefined

  return { rows, baselineId, baselineEf, baselineLabel, bestId }
}

// ------- page -------
export default function Home() {
  const cements = useMemo(() => (cementsJson as Cement[]), [])

  // Inputs (as per your original layout)
  const [inputs, setInputs] = useState<InputsState>({
    exposureClass: 'XC2',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',
    globalDosage: 320,
    concreteStrength: 'C25/30',
  })

  const [perDosage, setPerDosage] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'compatible'>('all')
  const [sortKey, setSortKey] = useState<'total' | 'a1a3' | 'ef' | 'clinker' | 'dosage'>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Compare
  const [cmpOpen, setCmpOpen] = useState(false)
  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set())

  // Build rows + baseline
  const { rows, baselineId, baselineEf, baselineLabel, bestId } = useMemo(
    () => buildRows(cements, inputs, perDosage),
    [cements, inputs, perDosage]
  )

  const onInputs = useCallback((patch: Partial<InputsState>) => {
    setInputs(prev => ({ ...prev, ...patch }))
  }, [])

  const toggleCompare = (id: string) => {
    setComparedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  const clearCompared = () => setComparedIds(new Set())
  const updatePerCementDosage = (id: string, value: number) => {
    setPerDosage(prev => ({ ...prev, [id]: value }))
  }

  const comparedItems = useMemo(
    () => Array.from(comparedIds).map(id => {
      const r = rows.find(x => x.cement.id === id)
      return { id, label: r?.cement.cement_type ?? id }
    }),
    [comparedIds, rows]
  )

  const exportCsv = () => downloadCSV(rows, inputs)

  const onSortChange = (key: typeof sortKey) => {
    if (key === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <>
      <Head>
        <title>Cement LCA Comparison Tool</title>
        <link rel="icon" href="/favicon-32x32.png" />
      </Head>

      <div className="container">
        <h1 className="title">
          Cement LCA Comparison
          <img
            src="/favicon-32x32.png?v=2"
            alt=""
            width={22}
            height={22}
            loading="lazy"
            decoding="async"
            aria-hidden="true"
            style={{ marginLeft: 8, verticalAlign: 'text-bottom' }}
          />
        </h1>

        {/* Inputs */}
        <div className="card">
          <Inputs state={inputs} onChange={onInputs} />
        </div>

        {/* Table */}
        <ResultsTable
          rows={rows}
          // sorting
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={onSortChange}
          // view & search
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          // compare
          compared={comparedIds}
          onToggleCompare={toggleCompare}
          // csv
          onExportCsv={exportCsv}
          // baseline
          baselineId={baselineId}
          baselineEf={baselineEf}
          baselineLabel={baselineLabel}
          // remove pagination (kept props to avoid breaking)
          pageSize={999}
          onPageSize={() => {}}
        />

        {/* Chart (unchanged; your BarChart already handles tooltip clamping) */}
        <BarChart
          rows={rows}
          bestId={bestId}
          opcBaselineId={baselineId}
          baselineEf={baselineEf}
          baselineLabel={baselineLabel}
        />
      </div>

      {/* Always visible tray */}
      <CompareTray
        items={comparedItems}
        onOpen={() => setCmpOpen(true)}
        onClear={clearCompared}
      />

      <ComparePanel
        open={cmpOpen}
        onClose={() => setCmpOpen(false)}
        rows={rows}
        selectedIds={Array.from(comparedIds)}
        onToggle={toggleCompare}
        onDosageChange={updatePerCementDosage}
        catalog={rows.map(r => ({ id: r.cement.id, label: r.cement.cement_type }))}
        baselineId={baselineId}
      />
    </>
  )
}
