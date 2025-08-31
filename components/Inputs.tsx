import { InputsState } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'


const strengthOptions: InputsState['concreteStrength'][] = ['C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60']
const exposureOptions = ['XC1','XC2','XC3','XC4','XD1','XD2','XD3','XS1','XS2','XS3','XF1','XF2','XA2','XA3']


export default function Inputs({ state, setState }: { state: InputsState; setState: (s: InputsState) => void }) {
return (
<div className="card" style={{ marginBottom: 24 }}>
<h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 12 }}>Design Inputs</h2>
<div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
<div>
<label className="label">Concrete strength class</label>
<select className="select" value={state.concreteStrength} onChange={(e) => { const v = e.target.value as InputsState['concreteStrength']; setState({ ...state, concreteStrength: v, globalDosage: getDefaultDosage(v) }) }}>{strengthOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
</div>
<div>
<label className="label">Exposure class (EN 206)</label>
<select className="select" value={state.exposureClass} onChange={(e) => setState({ ...state, exposureClass: e.target.value })}>{exposureOptions.map(o => <option key={o} value={o}>{o}</option>)}</select>
</div>
<div>
<label className="label">Element volume (m³)</label>
<input className="input" type="number" min={1} value={state.volumeM3} onChange={(e) => setState({ ...state, volumeM3: Number(e.target.value) || 0 })} />
</div>
<div>
<label className="label">Transport distance (km)</label>
<input className="input" type="number" min={0} value={state.distanceKm} onChange={(e) => setState({ ...state, distanceKm: Number(e.target.value) || 0 })} />
</div>
<div>
<label className="label">Include A4 transport</label>
<label className="small"><input type="checkbox" checked={state.includeA4} onChange={(e) => setState({ ...state, includeA4: e.target.checked })} /> Calculate A4 emissions</label>
</div>
<div>
<label className="label">Dosage mode</label>
<div className="small" style={{ display: 'flex', gap: 16 }}>
<label><input type="radio" name="dosage" checked={state.dosageMode === 'global'} onChange={() => setState({ ...state, dosageMode: 'global' })} /> Global dosage</label>
<label><input type="radio" name="dosage" checked={state.dosageMode === 'perCement'} onChange={() => setState({ ...state, dosageMode: 'perCement' })} /> Per‑cement overrides</label>
</div>
</div>
<div>
<label className="label">Global dosage (kg/m³)</label>
<input className="input" type="number" min={200} value={state.globalDosage} onChange={(e) => setState({ ...state, globalDosage: Number(e.target.value) || 0 })} />
<p className="small">Auto‑set from strength class; you can tweak.</p>
</div>
</div>
</div>
)
}
