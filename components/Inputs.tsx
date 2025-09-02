// components/Inputs.tsx
import React, { useState } from 'react'
import { InputsState } from '../lib/types'
import { getDefaultDosage } from '../lib/dosage'
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

const exposureOptions: InputsState['exposureClass'][] = [
  'XC1','XC2','XC3','XC4',
  'XD1','XD2','XD3',
  'XS1','XS2','XS3',
  'XF1','XF2',
  'XA2','XA3'
]

export default function Inputs({ inputs, onChange }: Props) {
  const [volDraft, setVolDraft] = useState(String(inputs.volumeM3))
  const [distDraft, setDistDraft] = useState(String(inputs.distanceKm))
  const [dosageDraft, setDosageDraft] = useState(String(inputs.globalDosage))

  const numberFromDraft = (draft: string, fallback: number) => {
    const s = draft.trim()
    if (s === '') return fallback
    const n = Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : fallback
  }

  const perCement = inputs.dosageMode === 'perCement'

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 14px' }}>Design Inputs</h2>

      {/* Top row: Exposure + Volume */}
      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap: 16, marginBottom: 12 }}>
        <div>
          <label className="label">
            Exposure class <Tooltip text="EN 206 durability class (e.g., XC3)" />
          </label>
          <select
            className="select"
            value={inputs.exposureClass}
            onChange={(e) => onChange({ ...inputs, exposureClass: e.target.value })}
          >
            {exposureOptions.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>

        <div>
          <label className="label">
            Volume (m³) <Tooltip text="Volume of the concrete element." />
          </label>
          <input
            className="input"
            type="text"
            inputMode="decimal"
            value={volDraft}
            onChange={(e) => setVolDraft(e.target.value)}
            onBlur={() => onChange({ ...inputs, volumeM3: numberFromDraft(volDraft, inputs.volumeM3) })}
          />
        </div>
      </div>

      {/* Second row: Transport & A4 (left)  |  Dosage box (right) */}
      <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap: 16 }}>
        {/* Transport & A4 — redesigned, boxed like Dosage */}
        <div className="card" style={{ margin: 0, padding: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ fontWeight:600 }}>Transport & A4</div>
            <Tooltip text="Transport to the construction site. When enabled, A4 is added using distance × EF × (dosage × volume)." />
          </div>

          <div className="radio-row" style={{ marginBottom: 8 }}>
            <label className="small" style={{ display:'inline-flex', alignItems:'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={inputs.includeA4}
                onChange={(e) => onChange({ ...inputs, includeA4: e.target.checked })}
              />
              Include A4 transport
            </label>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'1fr', gap: 8 }}>
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Distance to site <Tooltip text="Enter one-way transport distance for cement logistics." />
              </label>
              <div style={{ position:'relative' }}>
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  placeholder="Distance in km"
                  value={distDraft}
                  disabled={!inputs.includeA4}
                  style={{
                    paddingRight: 44,
                    ...(inputs.includeA4 ? {} : { background:'#f1f5f9', color:'#94a3b8', cursor:'not-allowed' })
                  }}
                  onChange={(e) => setDistDraft(e.target.value)}
                  onBlur={() => onChange({ ...inputs, distanceKm: numberFromDraft(distDraft, inputs.distanceKm) })}
                />
                {/* suffix hint */}
                <span
                  aria-hidden
                  style={{
                    position:'absolute',
                    right:10,
                    top:'50%',
                    transform:'translateY(-50%)',
                    color:'var(--muted)',
                    fontSize:13,
                    fontWeight:600
                  }}
                >
                  km
                </span>
              </div>
            </div>
          </div>

          <div className="small" style={{ color:'var(--muted)', marginTop: 6 }}>
            Transport to the construction site – logistics
          </div>
        </div>

        {/* Dosage (boxed) */}
        <div className="card" style={{ margin: 0, padding: 12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ fontWeight:600 }}>Dosage</div>
            <Tooltip text="Choose a global dosage or switch to per-cement editing in the table." />
          </div>

          <div className="radio-row" style={{ marginBottom: 8 }}>
            <label>
              <input
                type="radio"
                name="dosage-mode"
                checked={inputs.dosageMode === 'global'}
                onChange={() => onChange({ ...inputs, dosageMode: 'global' })}
              />{' '}
              Global
            </label>
            <label>
              <input
                type="radio"
                name="dosage-mode"
                checked={inputs.dosageMode === 'perCement'}
                onChange={() => onChange({ ...inputs, dosageMode: 'perCement' })}
              />{' '}
              Per cement
            </label>
          </div>

          <div className="grid" style={{ gridTemplateColumns:'1fr 1fr', gap: 8 }}>
            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Concrete strength <Tooltip text="Used to pre-fill a sensible global dosage." />
              </label>
              <select
                className="select"
                value={inputs.concreteStrength ?? 'C25/30'}
                onChange={(e) => {
                  const v = e.target.value as NonNullable<InputsState['concreteStrength']>
                  const next = { ...inputs, concreteStrength: v }
                  if (inputs.dosageMode === 'global') {
                    next.globalDosage = getDefaultDosage(v)
                    setDosageDraft(String(next.globalDosage))
                  }
                  onChange(next)
                }}
              >
                {strengthOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="label" style={{ marginBottom: 6 }}>
                Global dosage (kg/m³) <Tooltip text="Global binder dosage when not in per-cement mode." />
              </label>
              <input
                className="input"
                type="text"
                inputMode="decimal"
                value={dosageDraft}
                disabled={perCement}
                style={perCement ? { background:'#f1f5f9', color:'#94a3b8', cursor:'not-allowed' } : undefined}
                onChange={(e) => setDosageDraft(e.target.value)}
                onBlur={() => !perCement && onChange({ ...inputs, globalDosage: numberFromDraft(dosageDraft, inputs.globalDosage) })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
