import { useEffect, useMemo, useState } from 'react'
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import { Cement, InputsState, ResultRow } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'
import { toResultRows } from '../lib/calc'
import { tagsForCement } from '../lib/tags'
import { downloadCSV } from '../lib/download'
import { SortKey, SortDir } from '../lib/sort'

type PageSize = number | 'all'

export default function Home() {
  const [cements, setCements] = useState<Cement[]>([])
  const [dosageOverrides, setDosageOverrides] = useState<Record<string, number>>({})

  // Table UX state
  const [sortKey, setSortKey] = useState<SortKey>('total')
  const [sortDir, setSortDir]   = useState<SortDir>('asc')
  const [search, setSearch] = useState('')
  const [hideIncompatible, setHideIncompatible] = useState(false)
  const [pageSize, setPageSize] = useState<PageSize>('all') // Default = show ALL rows (no pagination)
  const [page, setPage] = useState(1)

  const [state, setState] = useState<InputsState>({
    concreteStrength: 'C30/37',
    exposureClass: 'XC3',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',
    globalDosage: getDefaultDosage('C30/37'),
    filters: { OPC: true, Slag: true, FlyAsh: true, Pozzolana: true, Limestone: true, CalcinedClay: true, Composite: true }
  })

  // Load dataset
  useEffect(() => { fetch('/data/cements.json').then(r => r.json()).then(setCements) }, [])

  // Dynamic baseline: worst OPC EF (no SCMs); fallback to 0.60 if none present
  const baselineEf = useMemo(() => {
    const opc = cements.filter(c => c.scms.length === 0)
    if (!opc.length) return 0.60
    return Math.max(...opc.map(c => c.co2e_per_kg_binder_A1A3))
  }, [cements])

  const handleSortChange = (key: SortKey) => {
    if (key === sortKey) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // Filter by category chips
  const tagFiltered = useMemo(() => {
    return cements.filter(c => {
      const tags = new Set(tagsForCement(c))
      if (!state.filters.OPC && tags.has('OPC')) return false
      if (!state.filters.Slag && tags.has('Slag')) return false
      if (!state.filters.FlyAsh && tags.has('FlyAsh')) return false
      if (!state.filters.Pozzolana && tags.has('Pozzolana')) return false
      if (!state.filters.Limestone && tags.has('Limestone')) return false
      if (!state.filters.CalcinedClay && tags.has('CalcinedClay')) return false
      if (!state.filters.Composite && tags.has('Composite')) return false
      return true
    })
  }, [cements, state.filters])

  // Compute rows from design inputs (uses dynamic baseline)
  const rowsBase: ResultRow[] = useMemo(() => {
    return toResultRows(tagFiltered, {
      exposureClass: state.exposureClass,
      volumeM3: state.volumeM3,
      distanceKm: state.distanceKm,
      includeA4: state.includeA4,
      dosageFor: (c) => state.dosageMode === 'global'
        ? state.globalDosage
        : (dosageOverrides[c.id] ?? c.default_dosage_kg_per_m3),
      tagsFor: (c) => tagsForCement(c),
      baselineEf,
    })
  }, [tagFiltered, state, dosageOverrides, baselineEf])

  // Search + hide incompatible
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rowsBase.filter(r => {
      if (hideIncompatible && !r.exposureCompatible) return false
      if (!q) return true
      const hay = (r.cement.cement_type + ' ' + r.cement.standard).toLowerCase()
      return hay.includes(q)
    })
  }, [rowsBase, search, hideIncompatible])

  // Sorting
  const sorted = useMemo(() => {
    const factor = sortDir === 'asc' ? 1 : -1
    const val = (r: ResultRow) => {
      switch (sortKey) {
        case 'cement':    return r.cement.cement_type
        case 'strength':  return r.cement.strength_class
        case 'clinker':   return r.cement.clinker_fraction
        case 'ef':        return r.cement.co2e_per_kg_binder_A1A3
        case 'reduction': return r.gwpReductionPct
        case 'dosage':    return r.dosageUsed
        case 'a1a3':      return r.co2ePerM3_A1A3
        case 'a4':        return r.a4Transport
        case 'total':     return r.totalElement
      }
    }
    return [...searched].sort((a,b) => (val(a) > val(b) ? 1 : val(a) < val(b) ? -1 : 0) * factor)
  }, [searched, sortKey, sortDir])

  // Pagination (conditional)
  const totalRows = sorted.length
  const usingPagination = pageSize !== 'all'
  const totalPages = usingPagination ? Math.max(1, Math.ceil(totalRows / (pageSize as number))) : 1
  const pageSafe = usingPagination ? Math.min(page, totalPages) : 1
  const start = usingPagination ? (pageSafe - 1) * (pageSize as number) : 0
  const end = usingPagination ? start + (pageSize as number) : totalRows
  const pageRows = sorted.slice(start, end)

  // Highlights
  const bestId = sorted[0]?.cement.id
  const opcBaselineId = useMemo(() => {
    const opcRows = sorted.filter(r => r.cement.scms.length === 0)
    if (!opcRows.length) return undefined
    let worst = opcRows[0]
    for (const r of opcRows) if (r.totalElement > worst.totalElement) worst = r
    return worst.cement.id
  }, [sorted])

  const setDosageOverride = (id: string, v: number) =>
    setDosageOverrides(prev => ({ ...prev, [id]: v }))

  // Reset page when view changes
  useEffect(() => { setPage(1) }, [search, hideIncompatible, pageSize, sortKey, sortDir, state])

  // Banner text
  const bannerText = usingPagination
    ? `Showing: Page ${pageSafe} of ${totalPages} · ${(pageSize as number)} rows/page`
    : `Showing: All rows (${totalRows})`

  return (
    <main className="container">
      <div className="header">
        <h1 className="h1">Concrete LCA Comparator</h1>
        <div className="filters">
          {(['OPC','Slag','FlyAsh','Pozzolana','Limestone','CalcinedClay','Composite'] as const).map(key => (
            <label key={key} className="badge">
              <input
                style={{ marginRight: 6 }}
                type="checkbox"
                checked={state.filters[key]}
                onChange={(e) =>
                  setState({ ...state, filters: { ...state.filters, [key]: e.target.checked } })
                }
              />
              {key}
            </label>
          ))}
        </div>
      </div>

      {/* Design Inputs ABOVE Comparison */}
      <Inputs state={state} setState={setState} />

      {/* Comparison */}
      <ResultsTable
        rows={pageRows}
        state={state}
        dosageOverrides={dosageOverrides}
        setDosageOverride={setDosageOverride}
        onDownload={() => downloadCSV(sorted, state)}   // export full filtered/sorted view
        bestId={bestId}
        opcBaselineId={opcBaselineId}
        sortKey={sortKey}
        sortDir={sortDir}
        onSortChange={(k: SortKey) => handleSortChange(k)}
        search={search}
        onSearch={setSearch}
        hideIncompatible={hideIncompatible}
        onToggleHideIncompatible={setHideIncompatible}
        page={pageSafe}
        totalPages={totalPages}
        onPageChange={setPage}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        totalCount={totalRows}
        usingPagination={usingPagination}
        baselineEf={baselineEf}
      />

      {/* Banner + Chart */}
      <div className="view-banner">{bannerText}</div>
      <BarChart rows={pageRows} bestId={bestId} opcBaselineId={opcBaselineId} baselineEf={baselineEf} />

      <footer className="footer">
        © {new Date().getFullYear()} Cement LCA · Educational only · Use verified EPDs for projects.
      </footer>
    </main>
  )
}
