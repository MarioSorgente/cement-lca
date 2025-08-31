import { useMemo, useState } from 'react'
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import { computeRows, opcWorstBaseline } from '../lib/calc'
import { InputsState, ResultRow } from '../lib/types'

/** Sort keys for the table (Strength removed) */
type TableSortKey =
  | 'cement'
  | 'clinker'
  | 'ef'
  | 'dosage'
  | 'a1a3'
  | 'a4'
  | 'total'
  | 'reduction'

type Scope = 'all' | 'compatible' | 'common'

export default function Home() {
  // ----- Inputs block -----
  const [inputs, setInputs] = useState<InputsState>({
    exposureClass: 'XC2',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',           // 'global' | 'perCement'
    globalDosage: 320,
  })

  // Table / chart UI state
  const [search, setSearch] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [pageSize, setPageSize] = useState<number>(50)
  const [sortKey, setSortKey] = useState<TableSortKey>('total')
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [perCementDosage, setPerCementDosage] = useState<Record<string, number>>({})

  // ----- Calculate all rows from inputs -----
  const allRows: ResultRow[] = useMemo(() => {
    const rows = computeRows(inputs, perCementDosage)
    // keep selected highlight valid
    if (selectedId && !rows.find(r => r.cement.id === selectedId)) {
      setSelectedId(null)
    }
    return rows
  }, [inputs, perCementDosage])

  // Baseline (worst OPC) from helper
  const baseline = opcWorstBaseline(allRows)
  const baselineId = baseline?.cement.id

  // Best row by total element (lowest total)
  const bestId = useMemo(() => {
    if (!allRows.length) return undefined
    return allRows.reduce((m, r) => (r.totalElement < m.totalElement ? r : m), allRows[0]).cement.id
  }, [allRows])

  // ----- Filter by scope & search -----
  const filtered = useMemo(() => {
    let rows = allRows
    if (scope === 'compatible') {
      rows = rows.filter(r => r.exposureCompatible)
    } else if (scope === 'common') {
      rows = rows.filter(r => (r.cement as any).is_common)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      rows = rows.filter(r => r.cement.cement_type.toLowerCase().includes(q))
    }
    return rows
  }, [allRows, scope, search])

  // ----- Sort -----
  const rowsSorted = useMemo(() => {
    const key = sortKey
    const dir = sortDir === 'asc' ? 1 : -1
    const get = (r: ResultRow) => {
      switch (key) {
        case 'cement':    return r.cement.cement_type
        case 'clinker':   return r.cement.clinker_fraction
        case 'ef':        return r.cement.co2e_per_kg_binder_A1A3
        case 'dosage':    return r.dosageUsed
        case 'a1a3':      return r.co2ePerM3_A1A3
        case 'a4':        return r.a4Transport
        case 'total':     return r.totalElement
        case 'reduction': return r.gwpReductionPct
      }
    }
    return [...filtered].sort((a, b) => {
      const av = get(a) as any
      const bv = get(b) as any
      if (typeof av === 'string' && typeof bv === 'string') {
        return av.localeCompare(bv) * dir
      }
      return (av - bv) * dir
    })
  }, [filtered, sortKey, sortDir])

  // Paging (simple “show first N rows” style)
  const rowsForPage = useMemo(() => rowsSorted.slice(0, pageSize), [rowsSorted, pageSize])

  return (
    <div className="container">
      {/* Design Inputs */}
      <div className="card">
        <div className="card-head">
          <h2>Design Inputs</h2>
        </div>
        {/* Inputs component expects { state, setState } */}
        <Inputs state={inputs} setState={setInputs} />
      </div>

      {/* Table */}
      <ResultsTable
        rows={rowsForPage}
        pageSize={pageSize}
        onPageSize={setPageSize}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(k: TableSortKey) => {
          setSortDir(d => (k === sortKey ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
          setSortKey(k)
        }}
        search={search}
        onSearch={setSearch}
        scope={scope}
        onScope={setScope}
        onExport={() => {
          // basic CSV export of current page
          const header = [
            'cement', 'clinker(%)','EF(kgCO2/kg)',
            'dosage(kg/m3)','A1A3(kg/m3)','A4(kg)','total(kg)','reduction(%)'
          ]
          const lines = rowsForPage.map(r => {
            return [
              r.cement.cement_type,
              Math.round(r.cement.clinker_fraction*100),
              r.cement.co2e_per_kg_binder_A1A3.toFixed(3),
              Math.round(r.dosageUsed),
              Math.round(r.co2ePerM3_A1A3),
              Math.round(r.a4Transport),
              Math.round(r.totalElement),
              r.gwpReductionPct.toFixed(0)
            ].join(',')
          })
          const csv = [header.join(','), ...lines].join('\n')
          const blob = new Blob([csv], {type:'text/csv'})
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = 'cement-comparison.csv'
          a.click()
          URL.revokeObjectURL(url)
        }}
        onRowClick={setSelectedId}
        selectedId={selectedId}
        bestId={bestId}
        baselineId={baselineId}
        dosageMode={inputs.dosageMode}
        perCementDosage={perCementDosage}
        onPerCementDosageChange={(id, val) => {
          setPerCementDosage(prev => ({ ...prev, [id]: val }))
        }}
      />

      {/* Chart */}
      <BarChart
        rows={rowsSorted}                 // show all bars
        bestId={bestId}
        opcBaselineId={baselineId}
        baselineEf={baseline?.cement.co2e_per_kg_binder_A1A3}
        baselineLabel={baseline?.cement.cement_type}
      />

      <div className="footer small">
        Educational demo. Use verified EPDs for projects.
      </div>
    </div>
  )
}
