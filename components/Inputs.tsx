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
        <span style={{
          position: 'absolute', top: '120%', left: 0, background: '#0f172a', color: 'white',
          padding: '8px 10px', borderRadius: 8, fontSize: 12, whiteSpace: 'normal',
          maxWidth: 300, boxShadow:'0 8px 20px rgba(0,0,0,0.25)', zIndex: 20
        }}>{text}</span>
      )}
    </span>
  )
}

const strengthOptions: InputsState['concreteStrength'][] =
  ['C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60']

const exposureOptions =
  ['XC1','XC2','XC3','XC4','XD1','XD2','XD3','XS1','XS2','XS3','XF1','XF2','XA2','XA3']

export default function Inputs({ state, setState }: { state: InputsState; setState: (s: InputsState) => void }) {
  const perCement = state.dosageMode === 'perCement'

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Design Inputs</h2>

      {/* Row 1 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
        <div>
          <label className="label">
            Exposure class
            <Info text="Durability class (EN 206), e.g., XC3. Used to flag exposure compatibility of each cement." />
          </label>
          <select
            className="select"
            value={state.exposureClass}
            onChange={(e) => setState({ ...state, exposureClass: e.target.value as InputsState['exposureClass'] })}
          >
            {exposureOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <label className="label">
            Volume (m³)
            <Info text="Concrete element volume in cubic meters. Scales the total embodied carbon (A1–A3 and optional A4)." />
          </label>
          <input
            type="number" min={0}
            className="input"
            value={state.volumeM3}
            onChange={(e) => setState({ ...state, volumeM3: Number(e.target.value) || 0 })}
          />
        </div>

        <div>
          <label className="label">
            Transport & A4
            <Info text="A4 = distance (km) × transport EF per cement. Set distance even if disabled; it’s remembered." />
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number" min={0}
              className="input"
              placeholder="Distance (km)"
              value={state.distanceKm}
              onChange={(e) => setState({ ...state, distanceKm: Number(e.target.value) || 0 })}
            />
          </div>
          <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <input
              type="checkbox"
              checked={state.includeA4}
              onChange={(e) => setState({ ...state, includeA4: e.target.checked })}
            />
            Include A4 transport
          </label>
        </div>

        <div>
          <label className="label">
            Dosage mode
            <Info text="Choose global dosage for all cements, or per-cement overrides." />
          </label>
          <select
            className="select"
            value={state.dosageMode}
            onChange={(e) => setState({ ...state, dosageMode: e.target.value as InputsState['dosageMode'] })}
          >
            <option value="global">Global</option>
            <option value="perCement">Per cement</option>
          </select>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
        <div>
          <label className="label">
            Concrete strength
            <Info text="Used to auto-fill a sensible global binder dosage. You can tweak it." />
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
            Global dosage (kg/m³)
            <Info text="Applied when Dosage mode = Global. When Per-cement, change dosage in the table." />
          </label>
          <input
            type="number" min={0}
            className="input"
            value={state.globalDosage}
            onChange={(e) => setState({ ...state, globalDosage: Number(e.target.value) || 0 })}
            disabled={perCement}
          />
          <p className="small" style={{ marginTop: 6 }}>
            {perCement
              ? 'Per-cement overrides enabled; edit in the table below.'
              : 'Auto-set from strength class; you can tweak.'}
          </p>
        </div>

        {/* Filler columns keep the grid clean on wide layouts */}
        <div />
        <div />
      </div>
    </div>
  )
}
