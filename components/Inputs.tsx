import { useState } from 'react'
import { InputsState } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'

function Info({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  return (
    <span
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 6, cursor: 'help', position: 'relative' }}
      aria-label={text}
    >
      <span style={{ width: 16, height: 16, borderRadius: 9999, background: '#e2e8f0', color: '#334155',
        fontSize: 11, fontWeight: 700, lineHeight: '16px', textAlign: 'center' }}>i</span>
      {open && (
        <span role="tooltip" style={{ position:'absolute', top:'125%', left:'50%', transform:'translateX(-50%)',
          background:'#1e293b', color:'#fff', padding:'6px 10px', borderRadius:6, fontSize:12, whiteSpace:'nowrap',
          boxShadow:'0 6px 20px rgba(0,0,0,0.15)', zIndex:20 }}>{text}</span>
      )}
    </span>
  )
}

const strengthOptions: InputsState['concreteStrength'][] = ['C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60']
const exposureOptions = ['XC1','XC2','XC3','XC4','XD1','XD2','XD3','XS1','XS2','XS3','XF1','XF2','XA2','XA3']

export default function Inputs({ state, setState }: { state: InputsState; setState: (s: InputsState) => void }) {
  const perCement = state.dosageMode === 'perCement'

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Design Inputs</h2>

      {/* Row 1 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <label className="label">
            Concrete strength class
            <Info text="Concrete strength class (EN 206), e.g., C30/37. Sets the performance target and suggests a typical binder dosage." />
          </label>
          <select
            className="select"
            value={state.concreteStrength}
            onChange={(e) => {
              const v = e.target.value as InputsState['concreteStrength']
              setState({ ...state, concreteStrength: v, globalDosage: getDefaultDosage(v) })
            }}
          >
            {strengthOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className="label">
            Exposure class (EN 206)
            <Info text="Durability class (EN 206), e.g., XC3. Used to flag exposure compatibility of each cement." />
          </label>
          <select className="select" value={state.exposureClass} onChange={(e) => setState({ ...state, exposureClass: e.target.value })}>
            {exposureOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 16 }}>
        <div>
          <label className="label">
            Element volume (m³)
            <Info text="Concrete element volume in cubic meters. Scales the total embodied carbon (A1–A3 and optional A4)." />
          </label>
          <input type="number" min={0} className="input" value={state.volumeM3}
                 onChange={(e) => setState({ ...state, volumeM3: Number(e.target.value) || 0 })} />
        </div>

        {/* Binder dosage group */}
        <div>
          <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Binder dosage
            <Info text="Cement content per m³. You can use a single global dosage or override per cement in the table." />
          </label>

          <div style={{ border:'1px solid #e2e8f0', borderRadius:10, background:'#f9fafb',
                        padding:12, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label className="label" style={{ marginBottom: 6 }}>Global dosage (kg/m³)</label>
              <input
                type="number" min={0} className="input" value={state.globalDosage}
                onChange={(e) => setState({ ...state, globalDosage: Number(e.target.value) || 0 })}
              />
              <p className="small" style={{ marginTop: 6 }}>
                {perCement ? 'You selected per-cement overrides; the global value is kept for reference.' : 'Auto-set from strength class; you can tweak.'}
              </p>
            </div>

            <div>
              <label className="label" style={{ marginBottom: 6 }}>Dosage mode</label>
              <div className="small" style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <label>
                  <input type="radio" name="dosage" checked={state.dosageMode === 'global'}
                         onChange={() => setState({ ...state, dosageMode: 'global' })} style={{ marginRight: 6 }} />
                  Global dosage
                </label>
                <label>
                  <input type="radio" name="dosage" checked={state.dosageMode === 'perCement'}
                         onChange={() => setState({ ...state, dosageMode: 'perCement' })} style={{ marginRight: 6 }} />
                  Per-cement overrides
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Transport emissions */}
      <div style={{ marginTop: 16 }}>
        <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
          Transport emissions (A4)
          <Info text="A4 = transport from plant to site. A4 = volume × distance × factor (kg CO₂ per m³·km). Tick to include A4 in totals." />
        </label>

        <div style={{ border:'1px solid #e2e8f0', borderRadius:10, background:'#f9fafb',
                      padding:12, display:'grid', gridTemplateColumns:'1fr auto', gap:12, alignItems:'end' }}>
          <div>
            <label className="label">Transport distance (km)</label>
            <input type="number" min={0} className="input" value={state.distanceKm}
                   onChange={(e) => setState({ ...state, distanceKm: Number(e.target.value) || 0 })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={state.includeA4}
                     onChange={(e) => setState({ ...state, includeA4: e.target.checked })} />
              Include A4 transport
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
