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
    perCementDosage: {},       // NEW
    filters: { OPC: true, Slag: true, FlyAsh: true, Pozzolana: true, Limestone: true, CalcinedClay: true, Composite: true },
  })

  const [search, setSearch] = useState('')
  const [pageSize, setPageSize] = useState(50)
  const [sortKey, setSortKey] = useState<'cement'|'strength'|'clinker'|'ef'|'dosage'|'a1a3'|'a4'|'total'|'reduction'>('total')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc')
  const [scope, setScope] = useState<Scope>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoadError(null)
      try {
        const res = await fetch('/data/cements.json', { cache: 'no-store' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: Cement[] = await res.json()
        if (!Array.isArray(data)) throw new Error('Invalid dataset format')
        if (!cancelled) setCements(data)
      } catch (e: any) {
        console.error('Failed to load cements.json:', e)
        if (!cancelled) setLoadError('Could not load /data/cements.json. Please validate the JSON file.')
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const rowsAll: ResultRow[] = useMemo(() => computeRows(cements, inputs), [cements, inputs])

  const rowsFiltered = useMemo(() => {
    let r = rowsAll
    if (search.trim()) {
      const q = search.toLowerCase()
      r = r.filter(x => x.cement.cement_type.toLowerCase().includes(q) || (x.cement.notes ?? '').toLowerCase().includes(q))
    }
    if (scope === 'compatible') r = r.filter(x => x.exposureCompatible)
    else if (scope === 'common') r = r.filter(x => x.cement.is_common)
    return r
  }, [rowsAll, search, scope])

  const rowsSorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rowsFiltered].sort((a,b) => {
      switch (sortKey) {
        case 'cement': return a.cement.cement_type.localeCompare(b.cement.cement_type) * dir
        case 'strength': return a.cement.strength_class.localeCompare(b.cement.strength_class) * dir
        case 'clinker': return (a.cement.clinker_fraction - b.cement.clinker_fraction) * dir
        case 'ef': return (a.cement.co2e_per_kg_binder_A1A3 - b.cement.co2e_per_kg_binder_A1A3) * dir
        case 'dosage': return (a.dosageUsed - b.dosageUsed) * dir
        case 'a1a3': return (a.co2ePerM3_A1A3 - b.co2ePerM3_A1A3) * dir
        case 'a4': return (a.a4Transport - b.a4Transport) * dir
        case 'reduction': return (a.gwpReductionPct - b.gwpReductionPct) * dir
        default: return (a.totalElement - b.totalElement) * dir
      }
    })
  }, [rowsFiltered, sortKey, sortDir])

  const baseline = useMemo(() => opcWorstBaseline(cements), [cements])
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
          <div style={{ background:'#fee2e2', border:'1px solid #fecaca', color:'#7f1d1d',
                        padding:'8px 12px', borderRadius:8, marginBottom:12, fontSize:14 }}>
            {loadError}
          </div>
        )}

        <Inputs state={inputs} setState={setInputs} />

        <ResultsTable
          rows={rowsSorted.slice(0, pageSize)}
          pageSize={pageSize}
          onPageSize={setPageSize}
          sortKey={sortKey}
          sortDir={sortDir}
          onSortChange={(k) => { setSortKey(k); setSortDir(d => (k===sortKey ? (d==='asc'?'desc':'asc') : 'asc')) }}
          search={search}
          onSearch={setSearch}
          scope={scope}
          onScope={setScope}
          onExport={() => {
            const header = ['Cement','Strength','Clinker(%)','EF(kg/kg)','Dosage(kg/m3)','A1-A3(kg/m3)','A4(kg)','Total(kg)','DeltaBaseline(%)'].join(',')
            const lines = rowsSorted.map(r => [
              r.cement.cement_type, r.cement.strength_class, Math.round(r.cement.clinker_fraction*100),
              r.cement.co2e_per_kg_binder_A1A3.toFixed(3), Math.round(r.dosageUsed),
              Math.round(r.co2ePerM3_A1A3), Math.round(r.a4Transport), Math.round(r.totalElement),
              r.gwpReductionPct.toFixed(0)
            ].join(','))
            const csv = [header, ...lines].join('\n')
            const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
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

        {!hasRows && <div style={{ color:'#475569', fontSize:14, marginTop:8 }}>No rows to display. Check your filters or data file.</div>}

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
