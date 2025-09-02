// pages/index.tsx
import { useMemo, useState, useCallback } from 'react'
import Head from 'next/head'

// Data & types
import cementsJson from '../public/data/cements.json'
import { Cement, InputsState, ResultRow } from '../lib/types'

// UI pieces
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import CompareTray from '../components/CompareTray'
import ComparePanel from '../components/ComparePanel'

// Utils
import { downloadCSV } from '../lib/download'

// ---------- helpers ----------
function computeA4(cement: Cement, dosageUsedKgPerM3: number, inputs: InputsState): number {
  if (!inputs.includeA4) return 0
  const d = inputs.distanceKm ?? 0
  const V = inputs.volumeM3 ?? 0

  // Prefer cement-mass EF if provided (kg CO2 per kg·km)
  if (cement.transport_ef_kg_per_kg_km != null) {
    return cement.transport_ef_kg_per_kg_km * d * (dosageUsedKgPerM3 * V)
  }

  // Fallback: ready-mix logistics EF (kg CO2 per m3·km)
  const ef_m3km = cement.transport_ef_kg_per_m3_km ?? 0
  return ef_m3km * d * V
}

function tagsFrom(c: Cement): string[] {
  // Prefer cement.tags if present (extended JSON), else derive
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

function isOPC(c: Cement) {
  // Treat as OPC if no SCMs or the type starts with CEM I
  return (c.scms?.length ?? 0) === 0 || /^CEM\s*I\b/i.test(c.cement_type)
}

function rowsFromCements(
  cements: Cement[],
  inputs: InputsState,
  perCementDosage: Record<string, number>
): {
  rows: ResultRow[]
  baselineId?: string
  baselineEf?: number
  baselineLabel?: string
  bestId?: string
} {
  // Baseline EF = worst OPC binder EF
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
    const a4Transport = computeA4(c, dosageUsed ?? 0, inputs)
    const totalElement = co2ePerM3_A1A3 * (inputs.volumeM3 ?? 0) + (inputs.includeA4 ? a4Transport : 0)

    const gwpReductionPct =
      baselineEf && baselineEf > 0
        ? ((baselineEf - (c.co2e_per_kg_binder_A1A3 ?? 0)) / baselineEf) * 100
        : 0

    const r: ResultRow = {
      cement: c,
      exposureCompatible,
      dosageUsed: dosageUsed ?? 0,
      co2ePerM3_A1A3,
      a4Transport,
      totalElement,
      gwpReductionPct,
      tags: tagsFrom(c),
    }
    return r
  })

  const bestId =
    rows.length ? rows.reduce((best, r) => (r.totalElement < best.totalElement ? r : best), rows[0]).cement.id : undefined

  return { rows, baselineId, baselineEf, baselineLabel, bestId }
}

// ---------- page ----------
export default function Home() {
  // Raw dataset
  const cements = useMemo(() => (cementsJson as Cement[]), [])

  // Inputs (match your Inputs.tsx layout)
  const [inputs, setInputs] = useState<InputsState>({
    exposureClass: 'XC2',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',     // 'global' | 'perCement'
    globalDosage: 320,
    concreteStrength: 'C25/30',
  })

  // Per-cement overrides (used when dosageMode === 'perCement' and in Compare drawer)
  const [perDosage, setPerDosage] = useState<Record<string, number>>({})

  // Table/view states
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'all' | 'compatible'>('all')
  const [sortKey, setSortKey] = useState<'total' | 'a1a3' | 'ef' | 'clinker' | 'dosage'>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Compare
  const [cmpOpen, setCmpOpen] = useState(false)
  const [comparedIds, setComparedIds] = useState<Set<string>>(new Set())

  // Computed rows + baseline
  const { rows, baselineId, baselineEf, baselineLabel, bestId } = useMemo(
    () => rowsFromCements(cements, inputs, perDosage),
    [cements, inputs, perDosage]
  )

  // Handlers
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

  const exportCsv = () => downloadCSV(rows, inputs)

  // Compare items (for the tray badge)
  const comparedItems = useMemo(
    () => Array.from(comparedIds).map(id => {
      const r = rows.find(x => x.cement.id === id)
      return { id, label: r?.cement.cement_type ?? id }
    }),
    [comparedIds, rows]
  )

  // Sorting click: toggle asc/desc when same key
  const onSortChange = (key: typeof sortKey) => {
    if (key === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <>
      <Head>
        <title>Cement LCA Comparison Tool</title>
      </Head>

      <div className="container">
        <h1 className="title">
          <span>Cement LCA Comparison</span>
          {/* If you copied the favicon into /public */}
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

        {/* Inputs card */}
        <div className="card">
          <Inputs
            state={inputs}
            onChange={onInputs}
          />
        </div>

        {/* Results table */}
        <ResultsTable
          rows={rows}
          // sorting
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={onSortChange}
          // view/search
          view={view}
          onViewChange={setView}
          search={search}
          onSearchChange={setSearch}
          // compare
          compared={comparedIds}
          onToggleCompare={toggleCompare}
          // CSV
          onExportCsv={exportCsv}
          // baseline
          baselineId={baselineId}
          baselineEf={baselineEf}
          baselineLabel={baselineLabel}
          // legacy props kept but unused inside ResultsTable (safe no-ops)
          pageSize={999}
          onPageSize={() => {}}
        />

        {/* Chart */}
        <BarChart
          rows={rows}
          bestId={bestId}
          opcBaselineId={baselineId}
          baselineEf={baselineEf}
          baselineLabel={baselineLabel}
        />
      </div>

      {/* Compare tray + drawer (always visible, even when 0 items) */}
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
