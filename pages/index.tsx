// pages/index.tsx
import { useEffect, useMemo, useState } from 'react'
import Head from 'next/head'
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import { computeRows, opcWorstBaseline } from '../lib/calc'
import { Cement, InputsState, ResultRow } from '../lib/types'

type Scope = 'all' | 'compatible' | 'common'

export default function Home() {
  const [cements, setCements] = useState<Cement[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)

  const [inputs, setInputs] = useState<InputsState>({
    concreteStrength: 'C25/30',
    exposureClass: 'XC2',
    volumeM3: 100,
    distanceKm: 0,
    includeA4: true,
    dosageMode: 'global',
    globalDosage: 320,
    perCementDosage: {},
    filters: { OPC: true, Slag: true, FlyAsh: true, Pozzolana: true, Limestone: true, CalcinedClay: true, Composite: true },
  })

  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [sortKey, setSortKey] = useState<'cement'|'strength'|'clinker'|'ef'|'dosage'|'a1a3'|'a4'|'total'|'reduction'>('total')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [scope, setScope] = useState<Scope>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/data/cements.json')
        if (!res.ok) throw new Error(`Failed to fetch cements.json (${res.status})`)
        const arr: Cement[] = await res.json()
        setCements(arr)
      } catch (e: any) {
        setLoadError(e?.message || 'Failed to load cement data')
      }
    }
    load()
  }, [])

  const baseline = useMemo(() => opcWorstBaseline(cements), [cements])

  const rowsAll = useMemo<ResultRow[]>(() => {
    return computeRows(cements, inputs, baseline?.ef ?? null)
  }, [cements, inputs, baseline?.ef])

  const rowsScoped = useMemo(() => {
    if (scope === 'compatible') return rowsAll.filter(r => r.exposureCompatible)
    if (scope === 'common')     return rowsAll.filter(r => r.cement.is_common)
    return rowsAll
  }, [rowsAll, scope])

  const rowsFiltered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const tagOn = inputs.filters
    return rowsScoped.filter(r => {
      // tag filters
      const tagOk = r.tags.some(t => tagOn[t as keyof InputsState['filters']])
      if (!tagOk) return false
      if (!q) return true
      const c = r.cement
      const haystack = [
        c.id, c.cement_type, c.standard, c.strength_class, c.early_strength,
        ...(c.applications || []), c.notes || ''
      ].join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [rowsScoped, search, inputs.filters])

  const rowsSorted = useMemo(() => {
    const arr = [...rowsFiltered]
    const dir = sortDir === 'asc' ? 1 : -1
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'cement':   return a.cement.cement_type.localeCompare(b.cement.cement_type) * dir
        case 'strength': return a.cement.strength_class.localeCompare(b.cement.strength_class) * dir
        case 'clinker':  return (a.cement.clinker_fraction - b.cement.clinker_fraction) * dir
        case 'ef':       return (a.cement.co2e_per_kg_binder_A1A3 - b.cement.co2e_per_kg_binder_A1A3) * dir
        case 'dosage':   return (a.dosageUsed - b.dosageUsed) * dir
        case 'a1a3':     return (a.co2ePerM3_A1A3 - b.co2ePerM3_A1A3) * dir
        case 'a4':       return (a.a4Transport - b.a4Transport) * dir
        case 'total':    return (a.totalElement - b.totalElement) * dir
        case 'reduction':return (a.gwpReductionPct - b.gwpReductionPct) * dir
        default:         return 0
      }
    })
    return arr
  }, [rowsFiltered, sortKey, sortDir])

  const hasRows = rowsSorted.length > 0

  // editor: update per-cement dosage
  const handlePerCementDosageChange = (cementId: string, val: number) => {
    setInputs(prev => ({
      ...prev,
      perCementDosage: { ...(prev.perCementDosage || {}), [cementId]: val }
    }))
  }

  return (
    <>
      <Head><title>Concrete LCA Comparator</title></Head>
      <div className="container">
        {loadError && (
          <div className="card" style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Failed to load data</div>
            <div className="small">{loadError}</div>
          </div>
        )}

        <Inputs state={inputs} setState={setInputs} />

        <ResultsTable
          rows={rowsSorted.slice(0, pageSize)}
          pageSize={pageSize}
          onPageSize={setPageSize}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={(k) => {
            setSortKey(k)
            setSortDir(d => (k === sortKey ? (d === 'asc' ? 'desc' : 'asc') : 'asc'))
          }}
          search={search}
          onSearch={setSearch}
          scope={scope}
          onScope={setScope}
          onExport={() => {
            const header = ['Cement','Strength','Clinker(%)','EF...A1-A3(kg/m3)','A4(kg)','Total(kg)','DeltaBaseline(%)'].join(',')
            const lines = rowsSorted.map(r => [
              r.cement.cement_type, r.cement.strength_class, Math.round(r.cement.clinker_fraction * 100),
              r.cement.co2e_per_kg_binder_A1A3.toFixed(3), Math.round(r.dosageUsed),
              Math.round(r.co2ePerM3_A1A3), Math.round(r.a4Transport), Math.round(r.totalElement),
              r.gwpReductionPct.toFixed(0)
            ].join(','))
            const csv = [header, ...lines].join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob); const a = document.createElement('a')
            a.href = url; a.download = 'cement-comparison.csv'; a.click(); URL.revokeObjectURL(url)
          }}
          onRowClick={setSelectedId}
          selectedId={selectedId}
          bestId={rowsSorted[0]?.cement.id}
          baselineId={baseline?.id}
          dosageMode={inputs.dosageMode}
          perCementDosage={inputs.perCementDosage}
          onPerCementDosageChange={handlePerCementDosageChange}
        />

        {!hasRows && (
          <div className="card" style={{ color: '#475569', fontSize: 14, padding: 12 }}>
            No rows to display. Check your filters or data file.
          </div>
        )}

        {hasRows && (
          <BarChart
            rows={rowsSorted}
            bestId={rowsSorted[0]?.cement.id}
            opcBaselineId={baseline?.id}
            baselineEf={baseline?.ef}
            baselineLabel={baseline?.label}
          />
        )}
      </div>
    </>
  )
}
