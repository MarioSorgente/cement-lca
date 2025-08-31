import React from 'react'
import { InputsState } from '../lib/types'

type Props = {
  state: InputsState
  setState: (s: InputsState) => void
}

const FIELD_HELP: Record<string, string> = {
  exposureClass: 'EN 206 exposure class. Used to filter cements compatible with the environment.',
  volumeM3: 'Concrete volume of the element. Used to scale A1–A3 and A4 totals.',
  includeA4: 'If ON, include transport to site (A4) in totals.',
  distanceKm: 'One-way transport distance from plant to site (km). Multiplies the A4 factor.',
  dosageMode: 'Global: same binder dosage for all rows. Per-cement: edit dosage per row.',
  globalDosage: 'If dosage mode is Global, this is applied to every cement (kg/m³).',
}

function Help({ id }: { id: keyof typeof FIELD_HELP }) {
  return (
    <span className="tooltip-wrapper" aria-label={FIELD_HELP[id]}>
      <span className="tooltip-icon" aria-hidden>i</span>
      <span className="tooltip-box tooltip-right">{FIELD_HELP[id]}</span>
    </span>
  )
}

export default function Inputs({ state, setState }: Props) {
  const set = <K extends keyof InputsState>(k: K, v: InputsState[K]) =>
    setState({ ...state, [k]: v })

  return (
    <div className="grid grid-2">
      {/* Exposure class */}
      <div>
        <label className="label">
          Exposure class <Help id="exposureClass" />
        </label>
        <select
          className="select"
          value={state.exposureClass}
          onChange={(e) => set('exposureClass', e.target.value as InputsState['exposureClass'])}
        >
          {['XC1','XC2','XC3','XC4','XS1','XS2','XS3','XD1','XD2','XD3','XF1','XF2','XA2','XA3'].map(x => (
            <option key={x} value={x}>{x}</option>
          ))}
        </select>
      </div>

      {/* Volume */}
      <div>
        <label className="label">
          Volume (m³) <Help id="volumeM3" />
        </label>
        <input
          className="input"
          type="number"
          min={1}
          step={1}
          value={state.volumeM3}
          onChange={(e) => set('volumeM3', Number(e.target.value))}
        />
      </div>

      {/* A4 group */}
      <div>
        <label className="label">
          Transport &amp; A4 <Help id="includeA4" />
        </label>
        <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={state.includeA4}
              onChange={(e) => set('includeA4', e.target.checked)}
            />
            Include A4 transport
          </label>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={state.distanceKm}
            onChange={(e) => set('distanceKm', Number(e.target.value))}
            placeholder="Distance (km)"
            aria-label="Transport distance in km"
          />
        </div>
        <div className="small" style={{ marginTop: 6 }}>
          A4 = distance (km) × transport EF per cement. Set distance even if disabled; it’s remembered.
        </div>
      </div>

      {/* Dosage group */}
      <div>
        <label className="label">
          Dosage mode <Help id="dosageMode" />
        </label>
        <div className="input-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <select
            className="select"
            value={state.dosageMode}
            onChange={(e) => set('dosageMode', e.target.value as InputsState['dosageMode'])}
            aria-label="Dosage mode"
          >
            <option value="global">Global</option>
            <option value="perCement">Per-cement overrides</option>
          </select>
          <div>
            <label className="label" style={{ marginBottom: 4 }}>
              Global dosage (kg/m³) <Help id="globalDosage" />
            </label>
            <input
              className="input"
              type="number"
              min={200}
              max={600}
              step={5}
              value={state.globalDosage}
              onChange={(e) => set('globalDosage', Number(e.target.value))}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
