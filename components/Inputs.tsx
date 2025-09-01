import { useEffect, useState } from 'react'
import { InputsState } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'
import Tooltip from './Tooltip'

type Props = {
  state: InputsState
  setState: (s: InputsState) => void
}

const strengthOptions: InputsState['concreteStrength'][] = [
  'C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60'
]

const exposureOptions: InputsState['exposureClass'][] = [
  'XC1','XC2','XC3','XC4',
  'XD1','XD2','XD3',
  'XS1','XS2','XS3',
  'XF1','XF2',
  'XA2','XA3'
]

export default function Inputs({ state, setState }: Props) {
  const perCement = state.dosageMode === 'perCement'

  // ---- Draft fields so typing feels natural ----
  const [volumeDraft, setVolumeDraft] = useState(String(state.volumeM3))
  const [distanceDraft, setDistanceDraft] = useState(String(state.distanceKm))
  const [globalDosageDraft, setGlobalDosageDraft] = useState(String(state.globalDosage))

  // Keep drafts in sync if external state changes (e.g., strength changes dosage)
  useEffect(() => { setVolumeDraft(String(state.volumeM3)) }, [state.volumeM3])
  useEffect(() => { setDistanceDraft(String(state.distanceKm)) }, [state.distanceKm])
  useEffect(() => { setGlobalDosageDraft(String(state.globalDosage)) }, [state.globalDosage])

  // Helpers to commit draft → number
  const commitNumber = (draft: string, fallback: number) => {
    if (draft.trim() === '') return fallback
    const n = Number(draft.replace(',', '.'))
    return Number.isFinite(n) ? n : fallback
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 0, marginBottom: 12 }}>Design Inputs</h2>

      {/* ROW 1 — Exposure class | Volume */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start', marginBottom: 10 }}
      >
        {/* Exposure class */}
        <div>
          <label className="label">
            Exposure class
            <Tooltip text="Durability class (EN 206), e.g., XC3. Used to flag exposure compatibility of each cement." />
          </label>
          <select
            className="select"
            value={state.exposureClass}
            onChange={(e) =>
              setState({ ...state, exposureClass: e.target.value as InputsState['exposureClass'] })
            }
          >
            {exposureOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        {/* Volume */}
        <div>
          <label className="label">
            Volume (m³)
            <Tooltip text="Concrete element volume in cubic meters. Scales the total embodied carbon (A1–A3 and optional A4)." />
          </label>
          <input
            type="text"
            inputMode="decimal"
            pattern="[0-9]*"
            className="input"
            value={volumeDraft}
            onChange={(e) => setVolumeDraft(e.target.value)}
            onBlur={() =>
              setState({ ...state, volumeM3: commitNumber(volumeDraft, state.volumeM3) })
            }
          />
        </div>
      </div>

      {/* ROW 2 — Transport & A4 | Dosage block (mode + strength + global dosage) */}
      <div
        className="grid"
        style={{ gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'start' }}
      >
        {/* Transport & A4 */}
        <div>
          <label className="label">
            Transport & A4
            <Tooltip text="A4 = distance (km) × transport EF per cement. Set distance even if disabled; it’s remembered." />
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]*"
              className="input"
              placeholder="Distance (km)"
              value={distanceDraft}
              onChange={(e) => setDistanceDraft(e.target.value)}
              onBlur={() =>
                setState({ ...state, distanceKm: commitNumber(distanceDraft, state.distanceKm) })
              }
            />
          </div>

          <p className="small" style={{ marginTop: 6 }}>
            A4 = distance (km) × transport EF per cement. Set distance even if disabled; it’s remembered.
          </p>
        </div>

        {/* Dosage block */}
        <div className="input-group">
          <label className="label" style={{ marginBottom: 6 }}>
            Dosage
            <Tooltip text="Choose global dosage for all cements, or per-cement overrides in the table." />
          </label>

          {/* Mode radios */}
          <div className="radio-row" style={{ marginBottom: 8 }}>
            <label>
              <input
                type="radio"
                name="dosage-mode"
                checked={state.dosageMode === 'global'}
                onChange={() => setState({ ...state, dosageMode: 'global' })}
              />
              {' '}Global
            </label>
            <label>
              <input
                type="radio"
                name="dosage-mode"
                checked={state.dosageMode === 'perCement'}
                onChange={() => setState({ ...state, dosageMode: 'perCement' })}
              />
              {' '}Per cement
            </label>
          </div>

          {/* Inner grid: Concrete strength | Global dosage */}
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {/* Concrete strength (inside dosage block now) */}
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Concrete strength
                <Tooltip text="Used to auto-fill a sensible global binder dosage. You can tweak it." />
              </label>
              <select
                className="select"
                value={state.concreteStrength}
                onChange={(e) => {
                  const v = e.target.value as InputsState['concreteStrength']
                  // auto-update global dosage only if we're in global mode
                  const next = { ...state, concreteStrength: v }
                  if (state.dosageMode === 'global') {
                    next.globalDosage = getDefaultDosage(v)
                  }
                  setState(next)
                }}
              >
                {strengthOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            {/* Global dosage */}
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Global dosage (kg/m³)
                <Tooltip text={perCement
                  ? 'Disabled in Per-cement mode. Use the table below to set dosage for each cement.'
                  : 'Applied when Dosage mode = Global. You can tweak this value.'}
                />
              </label>
              <input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*"
                className="input"
                value={globalDosageDraft}
                disabled={perCement}
                style={perCement ? { background: '#f1f5f9', color: '#94a3b8', cursor: 'not-allowed' } : undefined}
                onChange={(e) => setGlobalDosageDraft(e.target.value)}
                onBlur={() =>
                  setState({ ...state, globalDosage: commitNumber(globalDosageDraft, state.globalDosage) })
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
