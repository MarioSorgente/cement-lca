// pages/index.tsx
import React, { useMemo, useState, useCallback } from 'react'
import type { NextPage } from 'next'

import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import ComparePanel from '../components/ComparePanel'
import CompareFab from '../components/CompareFab'



import {
  type InputsState,
  type ResultRow,
  type Cement,
} from '../lib/types'

import { formatNumber } from '../lib/calc'
import { tagsForCement } from '../lib/tags'
import { downloadCSV } from '../lib/download'

import cementsData from '../public/data/cements.json'

// ---------- Helpers ----------
function isOPC(c: Cement): boolean {
  return (c.scms?.length ?? 0) === 0 || (c.cement_type || '').toUpperCase().startsWith('CEM I')
}

function buildRow(c: Cement, inputs: InputsState, perCementDosage: Record<string, number>, baselineEF: number): ResultRow {
  const dosageUsed =
    inputs.dosageMode === 'perCement'
      ? Math.max(0, perCementDosage[c.id] ?? c.default_dosage_kg_per_m3 ?? inputs.globalDosage)
      : Math.max(0, inputs.globalDosage)

  const ef = Number(c.co2e_per_kg_binder_A1A3 ?? 0)
  const co2ePerM3_A1A3 = dosageUsed * ef

  // --- A4 (mass-based) ---
  // --- A4cement: distance × EF(kg CO₂ / kg·km) × (dosage × volume)
  const distanceKm = Math.max(0, Number(inputs.distanceKm ?? 0));
  const volM3 = Math.max(0, Number(inputs.volumeM3 ?? 0));

  // Prefer mass-based EF; fallback to old m³·km EF divided by dosage (keeps results consistent)
  const efKgPerKgKm =
    (c as any).transport_ef_kg_per_kg_km ??
    (((c as any).transport_ef_kg_per_m3_km ?? 0) / Math.max(dosageUsed || 0, 1e-9));

  const a4Transport = inputs.includeA4
    ? distanceKm * efKgPerKgKm * (dosageUsed * volM3)
    : 0;

  const totalElement = co2ePerM3_A1A3 * volM3 + a4Transport;


  const exposureCompatible =
    Array.isArray(c.compatible_exposure_classes) &&
    c.compatible_exposure_classes.includes(inputs.exposureClass)

  const gwpReductionPct = baselineEF > 0 ? ((baselineEF - ef) / baselineEF) * 100 : 0

  return {
    cement: c,
    exposureCompatible,
    dosageUsed,
    co2ePerM3_A1A3,
    a4Transport,
    totalElement,
    gwpReductionPct,
    tags: tagsForCement(c),
  }
}

// Sorting helper
function sortRows(
  rows: ResultRow[],
  key: 'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction',
  dir: 'asc' | 'desc'
) {
  const mul = dir === 'asc' ? 1 : -1
  const get = (r: ResultRow) => {
    switch (key) {
      case 'cement': return r.cement.cement_type
      case 'strength': return r.cement.strength_class
      case 'clinker': return r.cement.clinker_fraction
      case 'ef': return r.cement.co2e_per_kg_binder_A1A3
      case 'dosage': return r.dosageUsed
      case 'a1a3': return r.co2ePerM3_A1A3
      case 'a4': return r.a4Transport
      case 'total': return r.totalElement
      case 'reduction': return r.gwpReductionPct
      default: return r.totalElement
    }
  }
  return [...rows].sort((a,b) => {
    const av = get(a); const bv = get(b)
    if (typeof av === 'string' && typeof bv === 'string') return mul * av.localeCompare(bv)
    return mul * ((Number(av) ?? 0) - (Number(bv) ?? 0))
  })
}

const Home: NextPage = () => {
  // Defaults aligned to your screenshot
  const [inputs, setInputs] = useState<InputsState>({
    exposureClass: 'XC2',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',
    globalDosage: 320,
    concreteStrength: 'C25/30',
  })

  const [perCementDosage, setPerCementDosage] = useState<Record<string, number>>({})
  const handlePerCementDosageChange = useCallback((cementId: string, val: number) => {
    setPerCementDosage(prev => ({ ...prev, [cementId]: val }))
  }, [])

  // Compute OPC baseline (worst EF among OPCs)
  const { opcBaselineId, baselineEF, baselineLabel } = useMemo(() => {
    const all = (cementsData as Cement[])
    const opc = all.filter(isOPC)
    if (!opc.length) return { opcBaselineId: undefined as string | undefined, baselineEF: 0, baselineLabel: undefined as string | undefined }
    const worst = opc.reduce((m, c) =>
      (c.co2e_per_kg_binder_A1A3 ?? 0) > (m.co2e_per_kg_binder_A1A3 ?? 0) ? c : m, opc[0])
    return { opcBaselineId: worst.id, baselineEF: Number(worst.co2e_per_kg_binder_A1A3 ?? 0), baselineLabel: worst.cement_type }
  }, [])

  // Build rows using that baseline EF
  const rowsAll = useMemo(() => {
    return (cementsData as Cement[]).map(c => buildRow(c, inputs, perCementDosage, baselineEF))
  }, [inputs, perCementDosage, baselineEF])

  // Search / scope
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<'all' | 'compatible' | 'common'>('all')

  const rowsFiltered = useMemo(() => {
    let rs = rowsAll
    if (scope === 'compatible') rs = rs.filter(r => r.exposureCompatible)
    if (scope === 'common') rs = rs.filter(r => r.cement.is_common || (r.cement as any).common)
    const s = search.trim().toLowerCase()
    if (s) {
      rs = rs.filter(r => {
        const hay = `${r.cement.cement_type} ${r.cement.notes ?? ''} ${(r.tags ?? []).join(' ')}`.toLowerCase()
        return hay.includes(s)
      })
    }
    return rs
  }, [rowsAll, scope, search])

  // Sort & paginate
  const [sortKey, setSortKey] = useState<'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction'>('total')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [pageSize, setPageSize] = useState<number>(50)

  const rowsSorted = useMemo(
    () => sortRows(rowsFiltered, sortKey, sortDir),
    [rowsFiltered, sortKey, sortDir]
  )

  // Compare set
  const [comparedIds, setComparedIds] = useState<string[]>([])
  const comparedItems = useMemo(() => {
    return comparedIds
      .map(id => rowsSorted.find(r => r.cement.id === id))
      .filter((r): r is ResultRow => Boolean(r))
      .map(r => ({ id: r.cement.id, label: r.cement.cement_type }))
  }, [comparedIds, rowsSorted])

  const rowsById = useMemo(() => {
    const m: Record<string, ResultRow> = {}
    rowsSorted.forEach(r => { m[r.cement.id] = r })
    return m
  }, [rowsSorted])

  const toggleCompare = useCallback((id: string) => {
    setComparedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }, [])

  const addToCompare = useCallback((id: string) => {
    setComparedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
  }, [])

  const [cmpOpen, setCmpOpen] = useState(false)

  // Export
  const handleExport = useCallback(() => downloadCSV(rowsSorted, inputs), [rowsSorted, inputs])

  // Best id by total
  const bestId = useMemo(() => {
    return rowsSorted.length
      ? rowsSorted.reduce((min, r) => r.totalElement < min.totalElement ? r : min, rowsSorted[0]).cement.id
      : undefined
  }, [rowsSorted])

  // Catalog for add-from-panel (use currently visible rows)
  const catalog = useMemo(
    () => rowsSorted.map(r => ({ id: r.cement.id, label: r.cement.cement_type })),
    [rowsSorted]
  )

  return (
    <div className="container">
      <h1 className="title">Cement LCA Comparison
        <img src="/favicon-32x32.png" alt="" style={{ width: 22, height: 22, marginLeft: 8, verticalAlign: 'middle' }} />
      </h1>

      <Inputs
        inputs={inputs}
        onChange={setInputs}
        perCementDosage={perCementDosage}
        onPerCementDosageChange={handlePerCementDosageChange}
      />

      {/* Header-level Compare button (always active) */}
      <div style={{ display:'flex', justifyContent:'flex-start', margin: '6px 0 4px 6px' }}>
        <button className="btn" onClick={() => setCmpOpen(true)}>Compare</button>
      </div>

      <ResultsTable
        rows={rowsSorted}
        pageSize={pageSize}
        onPageSize={setPageSize}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(k) => {
          if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
          else { setSortKey(k); setSortDir('asc') }
        }}
        search={search}
        onSearch={setSearch}
        scope={scope}
        onScope={setScope}
        onExport={handleExport}
        onRowClick={(id) => toggleCompare(id)}
        selectedId={null}
        bestId={bestId}
        baselineId={opcBaselineId}
        dosageMode={inputs.dosageMode}
        perCementDosage={perCementDosage}
        onPerCementDosageChange={handlePerCementDosageChange}
        comparedIds={comparedIds}
        onToggleCompare={toggleCompare}
      />

      <div className="card" style={{ marginTop: 12 }}>
        <BarChart
          rows={rowsSorted}
          bestId={bestId}
          opcBaselineId={opcBaselineId}
          baselineEf={baselineEF}
          baselineLabel={baselineLabel}
        />
      </div>

      <CompareFab
        items={comparedItems}
        onOpen={() => setCmpOpen(true)}
        onClear={() => setComparedIds([])}
      />
      <ComparePanel
        open={cmpOpen}
        onClose={() => setCmpOpen(false)}
        comparedIds={comparedIds}
        rowsById={rowsById}
        inputs={inputs}
        onAdd={addToCompare}
        catalog={catalog}
        /** NEW: allow removing a single cement from the drawer */
        onRemove={(id) => setComparedIds(prev => prev.filter(x => x !== id))}
      />

      <footer className="footer">
        Data rows: {formatNumber(rowsSorted.length)} • Page size: {pageSize}
      </footer>
    </div>
  )
}

export default Home
