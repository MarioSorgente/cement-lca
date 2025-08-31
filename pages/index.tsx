import { useEffect, useMemo, useState } from 'react'
import Inputs from '../components/Inputs'
import ResultsTable from '../components/ResultsTable'
import BarChart from '../components/BarChart'
import { Cement, InputsState, ResultRow } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'
import { toResultRows } from '../lib/calc'
import { tagsForCement } from '../lib/tags'
import { downloadCSV } from '../lib/download'


export default function Home() {
const [cements, setCements] = useState<Cement[]>([])
const [dosageOverrides, setDosageOverrides] = useState<Record<string, number>>({})
const [state, setState] = useState<InputsState>({
concreteStrength: 'C30/37',
exposureClass: 'XC3',
volumeM3: 100,
distanceKm: 0,
includeA4: false,
dosageMode: 'global',
globalDosage: getDefaultDosage('C30/37'),
filters: { OPC: true, Slag: true, FlyAsh: true, Pozzolana: true, Limestone: true, CalcinedClay: true, Composite: true }
})


useEffect(() => { fetch('/data/cements.json').then(r => r.json()).then(setCements) }, [])


const visibleCements = useMemo(() => {
return cements.filter(c => {
const tags = new Set(tagsForCement(c))
if (!state.filters.OPC && (tags.has('OPC'))) return false
if (!state.filters.Slag && tags.has('Slag')) return false
if (!state.filters.FlyAsh && tags.has('FlyAsh')) return false
if (!state.filters.Pozzolana && tags.has('Pozzolana')) return false
if (!state.filters.Limestone && tags.has('Limestone')) return false
if (!state.filters.CalcinedClay && tags.has('CalcinedClay')) return false
if (!state.filters.Composite && tags.has('Composite')) return false
return true
})
}, [cements, state.filters])


const rows: ResultRow[] = useMemo(() => {
return toResultRows(visibleCements, {
exposureClass: state.exposureClass,
volumeM3: state.volumeM3,
distanceKm: state.distanceKm,
includeA4: state.includeA4,
dosageFor: (c) => state.dosageMode === 'global' ? state.globalDosage : (dosageOverrides[c.id] ?? c.default_dosage_kg_per_m3),
tagsFor: (c) => tagsForCement(c)
}).sort((a,b) => a.totalElement - b.totalElement)
}, [visibleCements, state, dosageOverrides])


const setDosageOverride = (id: string, v: number) => setDosageOverrides(prev => ({ ...prev, [id]: v }))


return (
<main className="container">
<div className="header">
}
