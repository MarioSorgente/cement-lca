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
          maxWidth: 320, boxShadow:'0 8px 20px rgba(0,0,0,0.25)', zIndex: 20
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
        {/* Exposure class */}
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

        {/* Volume */}
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

        {/* Transport & A4 */}
        <div>
          <label className="label">
            Transport & A4
            <Info text="A4 = distance (km) × transport EF per cement. Set distance even if disabled; it's remembered." />
          </label>
          <div className="grid" style={{ gridTemplateColumns: 'auto 1fr', alignItems: 'center', gap: 8 }}>
            <label className="small" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={state.includeA4}
                onChange={(e) => setState({ ...state, includeA4: e.target.checked })}
              />
              Include A4 transport
            </label>
            <input
              type="number" min={0}
              className="input"
              placeholder="Distance (km)"
              value={state.distanceKm}
              onChange={(e) => setState({ ...state, distanceKm: Number(e.target.value) || 0 })}
            />
          </div>
          <p className="small" style={{ marginTop: 6 }}>
            A4 = distance (km) × transport EF per cement. Set distance even if disabled; it’s remembered.
          </p>
        </div>

        {/* Dosage mode group with radios + global dosage */}
        <div>
          <label className="label" style={{ display: 'flex', alignItems: 'center' }}>
            Dosage mode
            <Info text="Choose global dosage for all cements, or per-cement overrides in the table." />
          </label>

          <div className="card" style={{ padding: 12, borderRadius: 10 }}>
            <div className="small" style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 8 }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="radio"
                  name="dosage-mode"
                  checked={state.dosageMode === 'global'}
                  onChange={() => setState({ ...state, dosageMode: 'global' })}
                />
                Global
              </label>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="radio"
                  name="dosage-mode"
                  checked={state.dosageMode === 'perCement'}
                  onChange={() => setState({ ...state, dosageMode: 'perCement' })}
                />
                Per cement
              </label>
            </div>

            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Global dosage (kg/m³)
                <Info text="Applied when Dosage mode = Global. When Per-cement, change dosage in the table below." />
              </label>
              <input
                type="number" min={0}
                className="input"
                value={state.globalDosage}
                disabled={perCement}
                onChange={(e) => setState({ ...state, globalDosage: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2 */}
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginTop: 12 }}>
        {/* Concrete strength */}
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

        {/* The remaining columns are placeholders to preserve the previous airy layout */}
        <div />
        <div />
        <div />
      </div>
    </div>
  )
}
