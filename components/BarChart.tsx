import { useMemo, useState } from 'react'
import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  rows: ResultRow[]
  bestId?: string
  opcBaselineId?: string
  baselineEf?: number
  baselineLabel?: string
}

export default function BarChart({
  rows, bestId, opcBaselineId, baselineEf, baselineLabel
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => rows.find(r => r.cement.id === selectedId) || null, [rows, selectedId])

  if (!rows.length) return null

  // layout
  const max = Math.max(...rows.map(r => r.totalElement))
  const widthPerBar = 56   // more breathing room for labels
  const w = Math.max(900, rows.length * widthPerBar + 140)
  const h = 420
  const m = { top: 10, right: 20, bottom: 120, left: 60 }
  const iw = w - m.left - m.right
  const ih = h - m.top - m.bottom
  const step = iw / rows.length
  const bar = Math.min(40, step * 0.64)

  const yTicks = 5
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks))

  const colorFor = (pct: number, isBaseline: boolean) => {
    if (isBaseline) return '#ef4444' // red for baseline
    if (pct <= 0) return '#ef4444'   // worse or equal to baseline
    if (pct <= 10) return '#f59e0b'  // yellow
    if (pct <= 20) return '#22c55e'  // green
    return '#10b981'                 // deep green
  }

  const labelForPct = (pct: number, isBaseline: boolean) => {
    if (isBaseline) return 'Baseline'
    return pct >= 0 ? `↓ ${pct.toFixed(0)}%` : `↑ ${Math.abs(pct).toFixed(0)}%`
  }

  const baselineText = baselineEf
    ? `Baseline (worst OPC): ${baselineLabel ?? '—'} · EF ${baselineEf.toFixed(2)} kg/kg`
    : 'Baseline: not available'

  // helper: split long cement names onto 2 lines (break at space nearest mid)
  const twoLine = (name: string) => {
    if (name.length <= 14) return [name, '']
    const mid = Math.floor(name.length / 2)
    let split = name.indexOf(' ', mid)
    if (split === -1) split = name.lastIndexOf(' ')
    if (split <= 0) return [name, '']
    return [name.slice(0, split), name.slice(split + 1)]
  }

  const onBarActivate = (id: string) => setSelectedId(prev => (prev === id ? null : id))

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Total Element CO₂e Comparison
      </h2>
      <div className="small" style={{ marginBottom: 8, color: '#475569' }}>{baselineText}</div>

      {/* Horizontal scroll if many bars */}
      <div className="chart-scroll" role="region" aria-label="CO2e bar chart">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="Bar chart of total CO2e for current selection"
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {/* Grid + y axis */}
            {tickValues.map((tv, i) => {
              const y = ih - (tv / max) * ih
              return (
                <g key={i}>
                  <line x1={0} x2={iw} y1={y} y2={y} stroke="#e5e7eb" />
                  <text x={-10} y={y + 4} textAnchor="end" fontSize="12" fill="#475569">{tv}</text>
                </g>
              )
            })}

            {/* Bars */}
            {rows.map((r, i) => {
              const x = i * step + (step - bar) / 2
              const hBar = (r.totalElement / max) * ih
              const y = ih - hBar
              const isBaseline = r.cement.id === opcBaselineId
              const fill = colorFor(r.gwpReductionPct, isBaseline)
              const reductionLabel = labelForPct(r.gwpReductionPct, isBaseline)
              const isSelected = selectedId === r.cement.id

              return (
                <g key={r.cement.id}>
                  <rect
                    x={x}
                    y={y}
                    width={bar}
                    height={hBar}
                    fill={fill}
                    rx={6}
                    cursor="pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`${r.cement.cement_type}. Total ${formatNumber(r.totalElement)} kilograms. ${reductionLabel} vs baseline.`}
                    onClick={() => onBarActivate(r.cement.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onBarActivate(r.cement.id) }}
                    stroke={isSelected ? '#0ea5e9' : (r.cement.id === bestId ? '#065f46' : isBaseline ? '#991b1b' : 'none')}
                    strokeWidth={isSelected ? 2 : (r.cement.id === bestId || isBaseline ? 1.5 : 0)}
                  />
                  {/* Reduction label (hide percentage for baseline; show “Baseline”) */}
                  <text
                    x={x + bar / 2}
                    y={Math.max(14, y - 8)}
                    textAnchor="middle"
                    fontSize="12"
                    fill="#334155"
                    fontWeight={isBaseline ? 700 : 500}
                  >
                    {reductionLabel}
                  </text>
                  {/* Tooltip title */}
                  <title>{`${r.cement.cement_type}
Total: ${formatNumber(r.totalElement)} kg
${reductionLabel}`}</title>
                </g>
              )
            })}

            {/* X labels (two lines, angled slightly) */}
            {rows.map((r, i) => {
              const x = i * step + step / 2
              const [l1, l2] = twoLine(r.cement.cement_type)
              const isBest = r.cement.id === bestId
              const isBaseline = r.cement.id === opcBaselineId
              const color = isBest ? '#065f46' : isBaseline ? '#991b1b' : '#475569'
              return (
                <g key={r.cement.id} transform={`translate(${x},${ih + 22}) rotate(-30)`}>
                  <text fontSize="12" fill={color} textAnchor="end">{l1}</text>
                  {l2 && <text y={14} fontSize="12" fill={color} textAnchor="end">{l2}</text>}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Details panel */}
      <div
        className="details-card"
        aria-live="polite"
        style={{ display: selected ? 'grid' : 'none' }}
      >
        {selected && (
          <>
            <div className="details-title">
              {selected.cement.cement_type}
              <span className="tag" style={{ marginLeft: 8 }}>{selected.cement.strength_class}</span>
            </div>
            <div className="details-grid">
              <div>
                <div className="details-label">Reduction vs baseline</div>
                <div className="details-value">
                  {selected.gwpReductionPct >= 0 ? `↓ ${selected.gwpReductionPct.toFixed(0)}%` : `↑ ${Math.abs(selected.gwpReductionPct).toFixed(0)}%`}
                </div>
              </div>
              <div>
                <div className="details-label">EF (A1–A3)</div>
                <div className="details-value">{selected.cement.co2e_per_kg_binder_A1A3.toFixed(3)} kg/kg</div>
              </div>
              <div>
                <div className="details-label">Dosage used</div>
                <div className="details-value">{formatNumber(selected.dosageUsed)} kg/m³</div>
              </div>
              <div>
                <div className="details-label">A1–A3 (per m³)</div>
                <div className="details-value">{formatNumber(selected.co2ePerM3_A1A3)} kg</div>
              </div>
              <div>
                <div className="details-label">A4 transport</div>
                <div className="details-value">{formatNumber(selected.a4Transport)} kg</div>
              </div>
              <div>
                <div className="details-label">Total element</div>
                <div className="details-value">{formatNumber(selected.totalElement)} kg</div>
              </div>
            </div>
            <div className="details-notes">{selected.cement.notes}</div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="small" style={{ display:'flex', gap: 12, marginTop: 8, alignItems:'center' }}>
        <span className="chip chip-deepgreen" /> &gt;20% better
        <span className="chip chip-green" /> 10–20%
        <span className="chip chip-yellow" /> ≤10%
        <span className="chip chip-red" /> Baseline or worse
      </div>
    </div>
  )
}
