// components/Inputs.tsx
import React, { useState } from 'react'
import { InputsState } from '../lib/types'
import Tooltip from './Tooltip'

type Props = {
  inputs: InputsState
  onChange: (next: InputsState) => void
  perCementDosage: Record<string, number>
  onPerCementDosageChange: (cementId: string, val: number) => void
}

const strengthOptions: NonNullable<InputsState['concreteStrength']>[] = [
  'C20/25','C25/30','C30/37','C35/45','C40/50','C45/55','C50/60'
]

const exposureOptions = [
  'XC1','XC2','XC3','XC4','XS1','XS2','XS3','XD1','XD2','XD3','XF1','XF2','XA2','XA3'
]

export default function Inputs({ inputs, onChange }: Props) {
  // local strings to avoid number input “jumpiness” while typing
  const [volumeStr, setVolumeStr] = useState(String(inputs.volumeM3 ?? 0))
  const [distanceStr, setDistanceStr] = useState(String(inputs.distanceKm ?? 0))
  const [dosageStr, setDosageStr] = useState(String(inputs.globalDosage ?? 0))

  const onNumberCommit = (s: string, fallback: number) => {
    const trimmed = s.trim()
    if (trimmed === '' || trimmed === '-' || trimmed === '.' || trimmed === '-.') return fallback
    const n = Number(trimmed)
    return Number.isFinite(n) ? n : fallback
  }

  const disabledGlobal = inputs.dosageMode === 'perCement'

  return (
    <div className="grid inputs-grid">
      {/* Exposure class */}
      <div>
        <label className="label">
          Exposure class
          <Tooltip text="EN exposure class for durability. Filters compatible cements." />
        </label>
        <select
          className="select"
          value={inputs.exposureClass}
          onChange={(e) => onChange({ ...inputs, exposureClass: e.target.value })}
        >
          {exposureOptions.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      {/* Concrete strength */}
      <div>
        <label className="label">
          Concrete strength
          <Tooltip text="Target concrete strength class (UI only)." />
        </label>
        <select
          className="select"
          value={inputs.concreteStrength ?? ''}
          onChange={(e) => onChange({ ...inputs, concreteStrength: e.target.value, strengthClass: e.target.value })}
        >
          {strengthOptions.map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>

      {/* Volume */}
      <div>
        <label className="label">
          Volume (m³)
          <Tooltip text="Total concrete volume for this element." />
        </label>
        <input
          className="input"
          inputMode="decimal"
          value={volumeStr}
          onChange={(e) => setVolumeStr(e.target.value)}
          onBlur={() => {
            const n = onNumberCommit(volumeStr, inputs.volumeM3 ?? 0)
            setVolumeStr(String(n))
            onChange({ ...inputs, volumeM3: Math.max(0, n) })
          }}
          placeholder="e.g. 100"
        />
      </div>

      {/* Transport */}
      <div>
        <label className="label">
          Transport distance (km)
          <Tooltip text="One-way distance for A4 (if included)." />
        </label>
        <div className="input-group">
          <div style={{ display:'grid', gridTemplateColumns:'1fr auto', gap:8 }}>
            <input
              className="input"
              inputMode="decimal"
              value={distanceStr}
              onChange={(e) => setDistanceStr(e.target.value)}
              onBlur={() => {
                const n = onNumberCommit(distanceStr, inputs.distanceKm ?? 0)
                setDistanceStr(String(n))
                onChange({ ...inputs, distanceKm: Math.max(0, n) })
              }}
              placeholder="e.g. 0"
            />
            <label className="badge" style={{ justifySelf:'end' }}>
              <input
                type="checkbox"
                checked={inputs.includeA4}
                onChange={(e)=> onChange({ ...inputs, includeA4: e.target.checked })}
              />
              Include A4
            </label>
          </div>
        </div>
      </div>

      {/* Dosage block (spans full width on small) */}
      <div style={{ gridColumn: '1 / -1' }}>
        <label className="label">
          Dosage mode
          <Tooltip text="Choose a single global dosage or override per cement in the table." />
        </label>
        <div className="input-group">
          <div className="radio-row">
            <label>
              <input
                type="radio"
                name="dosageMode"
                value="global"
                checked={inputs.dosageMode === 'global'}
                onChange={() => onChange({ ...inputs, dosageMode: 'global' })}
              />{' '}
              Global
            </label>
            <label>
              <input
                type="radio"
                name="dosageMode"
                value="perCement"
                checked={inputs.dosageMode === 'perCement'}
                onChange={() => onChange({ ...inputs, dosageMode: 'perCement' })}
              />{' '}
              Per cement (edit in table)
            </label>
          </div>

          <div>
            <label className="label" style={{ marginTop: 6 }}>
              Global dosage (kg/m³)
              <Tooltip text="Applied to all rows unless you switch to per-cement mode." />
            </label>
            <input
              className="input"
              inputMode="decimal"
              disabled={disabledGlobal}
              style={disabledGlobal ? { background:'#f1f5f9', color:'#94a3b8', cursor:'not-allowed' } : undefined}
              value={dosageStr}
              onChange={(e) => setDosageStr(e.target.value)}
              onBlur={() => {
                const n = onNumberCommit(dosageStr, inputs.globalDosage ?? 0)
                setDosageStr(String(n))
                onChange({ ...inputs, globalDosage: Math.max(0, n) })
              }}
              placeholder="e.g. 300"
            />
            {disabledGlobal && (
              <div className="small" style={{ marginTop: 6 }}>
                Per-cement mode is active. Edit dosage in the table rows.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
