// pages/index.tsx
import React, { useMemo, useState } from 'react'
import type { NextPage } from 'next'

import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import CompareTray from '../components/CompareTray'
import ComparePanel from '../components/ComparePanel'

import { cements as ALL_CEMENTS } from '../lib/data'
import {
  type InputsState,
  type ResultRow,
  type ExposureClass,
  type StrengthClass,
} from '../lib/types'
import {
  computeRows,           // produces ResultRow[] from cements + inputs (+ optional baseline EF)
  opcWorstBaseline,      // finds the worst OPC cement row
  formatNumber,
  exportRowsAsCsv,       // helper to export CSV (if you have it; otherwise see fallback below)
} from '../lib/calc'

// ---- UI enums / helper types (match your existing types) ----
type SortKey =
  | 'cement' | 'strength' | 'clinker' | 'ef' | 'dosage' | 'a1a3' | 'a4' | 'total' | 'reduction'
type SortDir = 'asc' | 'desc'
type Scope = 'all' | 'compatible' | 'common'

// ---- Default inputs (adjust if yours differ) ----
const DEFAULT_INPUTS: InputsState = {
  strengthClass: 'C25/30' as StrengthClass,
  exposureClass: 'XC2' as ExposureClass,
  volumeM3: 100,
  distanceKm: 0,
  includeA4: true,
  dosageMode: 'global',
  globalDosage: 300,
}

// ---- Sorting helpers ----
function sortRows(rows: ResultRow[], key: SortKey, dir: SortDir): ResultRow[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = val(a, key)
    const bv = val(b, key)
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * mul
    return ((av as number) - (bv as number)) * mul
  })

  function val(r: ResultRow, k: SortKey) {
    switch (k) {
      case 'cement':    return r.cement.cement_type
      case 'strength':  return r.cement.strength_class
      case 'clinker':   return r.cement.clinker_fraction
      case 'ef':        return r.cement.co2e_per_kg_binder_A1A3
      case 'dosage':    return r.dosageUsed
      case 'a1a3':      return r.co2ePerM3_A1A3
      case 'a4':        return r.a4Transport
      case 'total':     return r.totalElement
      case 'reduction': return r.gwpReductionPct
    }
  }
}

// ---- CSV fallback (if your calc.ts doesn’t export exportRowsAsCsv) ----
function fallbackExportCsv(rows: ResultRow[]) {
  const headers = [
    'Cement',
    'Strength',
    'Clinker%',
    'EF (kgCO2/kg)',
    'Dosage (kg/m3)',
    'A1-A3 (kg/m3)',
    'A4 (kg)',
    'Total element (kg)',
    'Δ vs baseline (%)',
  ]
  const lines = rows.map(r => [
    r.cement.cement_type,
    r.cement.strength_class,
    Math.round(r.cement.clinker_fraction * 100),
    r.cement.co2e_per_kg_binder_A1A3.toFixed(3),
    r.dosageUsed,
    r.co2ePerM3_A1A3,
    r.a4Transport,
    r.totalElement,
    Math.round(r.gwpReductionPct),
  ])
  const csv = [headers.join(','), ...lines.map(arr => arr.join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'cement-results.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ======================================================================
// Page
// ======================================================================
const Home: NextPage = () => {
  // ----- Inputs block -----
  const [inputs, setInputs] = useState<InputsState>(DEFAULT_INPUTS)

  // Per-cement dosage map used when dosageMode === 'perCement'
  const [perCementDosage, setPerCementDosage] = useState<Record<string, number>>({})

  const handlePerCementDosageChange = (cementId: string, val: number) => {
    setPerCementDosage(prev => ({ ...prev, [cementId]: val }))
  }

  // ----- Table controls -----
  const [pageSize, setPageSize] = useState<number>(50)
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [search, setSearch] = useState<string>('')
  const [scope, setScope] = useState<Scope>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // ----- Core rows compute -----
  const rowsRaw: ResultRow[] = useMemo(() => {
    // NOTE: computeRows should already account for dosageMode & perCementDosage internally,
    //       or at least return dosageUsed from global/per-cement logic.
    // If your computeRows signature differs, adapt here accordingly.
    return computeRows(ALL_CEMENTS, inputs, /* baselineEFNullable */ null, perCementDosage)
  }, [inputs, perCementDosage])

  // Baseline (worst OPC) info (for display hints and bar colors)
  const baseline = useMemo(() => opcWorstBaseline(rowsRaw), [rowsRaw])

  // ----- Scope & search filters -----
  const rowsFiltered = useMemo(() => {
    let arr = rowsRaw
    if (scope === 'compatible') {
      arr = arr.filter(r => r.exposureCompatible)
    } else if (scope === 'common') {
      arr = arr.filter(r => r.isCommon)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      arr = arr.filter(r =>
        r.cement.cement_type.toLowerCase().includes(q) ||
        (r.cement.notes?.toLowerCase()?.includes(q) ?? false) ||
        (r.cement.scms?.some(s => s.type.toLowerCase().includes(q)) ?? false)
      )
    }
    return arr
  }, [rowsRaw, scope, search])

  // ----- Sort + paginate -----
  const rowsSorted = useMemo(
    () => sortRows(rowsFiltered, sortKey, sortDir),
    [rowsFiltered, sortKey, sortDir]
  )

  // ----- Export -----
  const exportCsv = () => {
    try {
      if (typeof exportRowsAsCsv === 'function') {
        exportRowsAsCsv(rowsSorted)
      } else {
        fallbackExportCsv(rowsSorted)
      }
    } catch {
      fallbackExportCsv(rowsSorted)
    }
  }

  // ====================================================================
  // (A) Compare state + helpers (block A)
  // ====================================================================
  const [comparedIds, setComparedIds] = useState<string[]>([])
  const [cmpOpen, setCmpOpen] = useState(false)

  // Map rows by id for fast access
  const rowsById = useMemo(() => {
    const m: Record<string, ResultRow> = {}
    rowsSorted.forEach(r => { m[r.cement.id] = r })
    return m
  }, [rowsSorted])

  // Items shown in the tray chips
  const comparedItems = useMemo(
    () => comparedIds
      .map(id => rowsById[id])
      .filter(Boolean)
      .map(r => ({ id: r!.cement.id, label: r!.cement.cement_type })),
    [comparedIds, rowsById]
  )

  function toggleCompare(id: string) {
    setComparedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev // cap at 3
      return [...prev, id]
    })
  }
  function removeFromCompare(id: string) {
    setComparedIds(prev => prev.filter(x => x !== id))
  }
  function replaceInCompare(oldId: string, newId: string) {
    setComparedIds(prev => {
      if (prev.includes(newId)) return prev
      return prev.map(x => (x === oldId ? newId : x))
    })
  }

  // ====================================================================
  // Render
  // ====================================================================
  const hasRows = rowsSorted.length > 0
  const baselineLabel = baseline ? `${baseline.cement.cement_type} (${baseline.cement.strength_class})` : undefined

  return (
    <div className="container">
      <header className="header">
        <h1 className="h1">AI Cement CO₂ Comparison</h1>
        <div className="filters">
          <span className="badge">
            <input
              type="checkbox"
              checked={inputs.includeA4}
              onChange={e => setInputs(prev => ({ ...prev, includeA4: e.target.checked }))}
              id="includeA4"
            />
            <label htmlFor="includeA4">Include A4 (transport)</label>
          </span>
        </div>
      </header>

      {/* Inputs */}
      <div className="card">
        <Inputs
          inputs={inputs}
          onChange={setInputs}
          perCementDosage={perCementDosage}
          onPerCementDosageChange={handlePerCementDosageChange}
        />
      </div>

      {/* Results and toolbar */}
      <ResultsTable
        rows={rowsSorted.slice(0, pageSize)}
        pageSize={pageSize}
        onPageSize={setPageSize}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(k) => {
          // Toggle direction if same key; otherwise default to asc for numeric downs (total/reduction often asc)
          setSortDir(prev => (k === sortKey ? (prev === 'asc' ? 'desc' : 'asc') : (k === 'cement' || k === 'strength' ? 'asc' : 'asc')))
          setSortKey(k)
        }}
        search={search}
        onSearch={setSearch}
        scope={scope}
        onScope={setScope}
        onExport={exportCsv}
        onRowClick={setSelectedId}
        selectedId={selectedId}
        bestId={rowsSorted[0]?.cement.id}
        baselineId={baseline?.cement.id}
        dosageMode={inputs.dosageMode}
        perCementDosage={perCementDosage}
        onPerCementDosageChange={handlePerCementDosageChange}
        /* (B) Compare hooks into the table */
        comparedIds={comparedIds}
        onToggleCompare={toggleCompare}
      />

      {hasRows && (
        <BarChart
          rows={rowsSorted.slice(0, pageSize)}
          bestId={rowsSorted[0]?.cement.id}
          opcBaselineId={baseline?.cement.id}
          baselineEf={baseline?.cement.co2e_per_kg_binder_A1A3}
          baselineLabel={baselineLabel}
        />
      )}

      {/* (B) Sticky tray at bottom */}
      <CompareTray
        items={comparedItems}
        onOpen={() => setCmpOpen(true)}
        onRemove={removeFromCompare}
      />

      {/* (B) Slide-over compare panel */}
      <ComparePanel
        open={cmpOpen}
        onClose={() => setCmpOpen(false)}
        comparedIds={comparedIds}
        rowsById={rowsById}
        baselineId={baseline?.cement.id}
        dosageMode={inputs.dosageMode}
        perCementDosage={perCementDosage}
        onPerCementDosageChange={handlePerCementDosageChange}
        onRemove={removeFromCompare}
        catalog={rowsSorted.map(r => ({ id: r.cement.id, label: r.cement.cement_type }))}
        onReplace={replaceInCompare}
      />

      <footer className="footer">
        Data rows: {formatNumber(rowsSorted.length)} • Page size: {pageSize}
      </footer>
    </div>
  )
}

export default Home
