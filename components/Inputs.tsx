import React from 'react'
import { InputsState } from '../lib/types'

type Props = {
  state: InputsState
  onChange: (patch: Partial<InputsState>) => void
}

const EXPOSURE_OPTIONS = [
  'XC1','XC2','XC3','XC4','XD1','XD2','XS1','XS2','XS3','XF1','XF2'
]

const STRENGTH_OPTIONS = [
  'C16/20','C20/25','C25/30','C28/35','C30/37','C32/40','C35/45','C40/50'
]

export default function Inputs({ state, onChange }: Props) {
  const isPerCement = state.dosageMode === 'perCement'

  return (
    <>
      <div className="card-head">
        <h2>Design Inputs</h2>
      </div>

      <div className="inputs-grid">
        {/* Exposure */}
        <div>
          <label className="label">
            Exposure class
            <span className="tooltip-wrapper">
              <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
              <div className="tooltip-box tooltip-right">
                Choose the environmental exposure for this element (e.g., XC2).
              </div>
            </span>
          </label>
          <select
            className="select"
            value={state.exposureClass}
            onChange={(e) => onChange({ exposureClass: e.target.value })}
          >
            {EXPOSURE_OPTIONS.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        {/* Volume */}
        <div>
          <label className="label">
            Volume (m³)
            <span className="tooltip-wrapper">
              <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
              <div className="tooltip-box tooltip-right">
                Total concrete volume for the element.
              </div>
            </span>
          </label>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min={0}
            value={state.volumeM3}
            onChange={(e) => onChange({ volumeM3: Number(e.target.value || 0) })}
          />
        </div>

        {/* Transport & A4 (boxed) */}
        <div>
          <label className="label">
            Transport &amp; A4
            <span className="tooltip-wrapper">
              <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
              <div className="tooltip-box tooltip-right">
                A4 for cement transport (not ready-mix logistics).<br />
                <strong>Formula:</strong> distance × transport EF (kg CO₂/kg·km) × dosage × volume.
              </div>
            </span>
          </label>
          <div className="input-group">
            <label className="badge" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={state.includeA4}
                onChange={(e) => onChange({ includeA4: e.target.checked })}
              />
              Include A4 transport
            </label>

            <div>
              <div className="small" style={{ marginBottom: 4 }}>
                Transport to the construction site – logistics
              </div>
              <input
                className="input"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Distance (km)"
                value={state.distanceKm}
                onChange={(e) => onChange({ distanceKm: Number(e.target.value || 0) })}
                disabled={!state.includeA4}
              />
            </div>
          </div>
        </div>

        {/* Dosage (boxed) */}
        <div>
          <label className="label">
            Dosage
            <span className="tooltip-wrapper">
              <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
              <div className="tooltip-box tooltip-right">
                Use a global dosage or switch to per-cement editing in the table/compare panel.
              </div>
            </span>
          </label>

          <div className="input-group">
            <div className="radio-row" role="radiogroup" aria-label="Dosage mode">
              <label>
                <input
                  type="radio"
                  name="dosageMode"
                  checked={state.dosageMode === 'global'}
                  onChange={() => onChange({ dosageMode: 'global' })}
                />{' '}
                Global
              </label>
              <label>
                <input
                  type="radio"
                  name="dosageMode"
                  checked={state.dosageMode === 'perCement'}
                  onChange={() => onChange({ dosageMode: 'perCement' })}
                />{' '}
                Per cement
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label className="label" style={{ marginBottom: 4 }}>
                  Concrete strength
                  <span className="tooltip-wrapper">
                    <span className="tooltip-icon" style={{ width: 14, height: 14, lineHeight: '14px', fontSize: 10 }}>i</span>
                    <div className="tooltip-box tooltip-right">
                      UI-only field to annotate the design strength.
                    </div>
                  </span>
                </label>
                <select
                  className="select"
                  value={state.concreteStrength ?? 'C25/30'}
                  onChange={(e) => onChange({ concreteStrength: e.target.value })}
                >
                  {STRENGTH_OPTIONS.map(x => <option key={x} value={x}>{x}</option>)}
                </select>
              </div>

              <div>
                <label className="label" style={{ marginBottom: 4 }}>
                  Global dosage (kg/m³)
                </label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={state.globalDosage}
                  onChange={(e) => onChange({ globalDosage: Number(e.target.value || 0) })}
                  disabled={isPerCement}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
