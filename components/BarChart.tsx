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

  // same "worst non-baseline" computation as the table
  const worstNonBaselineId = useMemo(() => {
    const pool = rows.filter(r => r.cement.id !== opcBaselineId)
    if (!pool.length) return undefined
    const worst = pool.reduce((m, r) => (r.gwpReductionPct < m.gwpReductionPct ? r : m), pool[0])
    return worst.cement.id
  }, [rows, opcBaselineId])

  // layout
  const max = Math.max(...rows.map(r => r.totalElement))
  const widthPerBar = 56
  const w = Math.max(900, rows.length * widthPerBar + 180)
  const h = 440
  const m = { top: 10, right: 24, bottom: 130, left: 60 }
  const iw = w - m.left - m.right
  const ih = h - m.top - m.bottom
  const step = iw / rows.length
  const bar = Math.min(40, step * 0.64)

  const yTicks = 5
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => Math.round((max * i) / yTicks))

  // color scheme with ORANGE for worst non-baseline
  const colorFor = (r: ResultRow) => {
    const isBaseline = r.cement.id === opcBaselineId
    const isWorst = r.cement.id === worstNonBaselineId
    if (isBaseline) return '#ef4444'   // red
    if (isWorst) return '#f59e0b'      // orange
    const pct = r.gwpReductionPct
    if (pct <= 0) return '#ef4444'
    if (pct <= 10) return '#f59e0b'
    if (pct <= 20) return '#22c55e'
    return '#10b981'
  }

  const baselineText = baselineEf
    ? `Baseline (worst OPC): ${baselineLabel ?? '—'} · EF ${baselineEf.toFixed(2)} kg/kg`
    : 'Baseline: not available'

  // split long cement names into two lines (kept, though we rotate 45° always)
  const twoLine = (name: string) => {
    if (name.length <= 14) return [name, '']
    const mid = Math.floor(name.length / 2)
    let split = name.indexOf(' ', mid)
    if (split === -1) split = name.lastIndexOf(' ')
    if (split <= 0) return [name, '']
    return [name.slice(0, split), name.slice(split + 1)]
  }

  const onBarActivate = (id: string) => setSelectedId(prev => (prev === id ? null : id))
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

  function labelTextAndColors(isBaseline: boolean, pct: number) {
    const text = isBaseline ? 'Baseline' : (pct >= 0 ? `↓ ${pct.toFixed(0)}%` : `↑ ${Math.abs(pct).toFixed(0)}%`)
    const textFill = isBaseline ? '#991b1b' : '#0f172a'
    const bg = isBaseline ? '#fee2e2' : '#e5e7eb'
    const stroke = isBaseline ? '#fca5a5' : '#e2e8f0'
    return { text, textFill, bg, stroke }
  }

  function drawLabelPill(
    xCenter: number,
    yBarTop: number,
    isBaseline: boolean,
    pct: number
  ) {
    const padX = 6, radius = 8
    const { text, textFill, bg, stroke } = labelTextAndColors(isBaseline, pct)
    const estTextW = Math.max(24, text.length * 6.2)
    const pillW = estTextW + padX * 2
    const pillH = 18
    const desired = isBaseline ? yBarTop - 22 : yBarTop - 10
    const y = clamp(desired, 12, ih - 6)
    const x = xCenter - pillW / 2

    return (
      <g>
        {isBaseline && (
          <line
            x1={xCenter}
            x2={xCenter}
            y1={Math.max(4, yBarTop - 4)}
            y2={y + pillH - 4}
            stroke="#991b1b"
            strokeWidth={1}
          />
        )}
        <rect x={x} y={y - pillH + 2} width={pillW} height={pillH} rx={radius} fill={bg} stroke={stroke} />
        <text x={xCenter} y={y - 4} textAnchor="middle" fontSize="12" fill={textFill} fontWeight={isBaseline ? 700 : 600}>
          {text}
        </text>
      </g>
    )
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Total Element CO₂e Comparison
      </h2>
      <div className="small" style={{ marginBottom: 8, color: '#475569' }}>{baselineText}</div>

      <div className="chart-scroll" role="region" aria-label="CO2e bar chart">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          style={{ width: '100%', height: 'auto' }}
          role="img"
          aria-label="Bar chart of total CO2e for current selection"
        >
          <g transform={`translate(${m.left},${m.top})`}>
            {tickValues.map((tv, i) => {
              const y = ih - (tv / max) * ih
              return (
                <g key={i}>
                  <line x1={0} x2={iw} y1={y} y2={y} stroke="#e5e7eb" />
                  <text x={-10} y={y + 4} textAnchor="end" fontSize="12" fill="#475569">{tv}</text>
                </g>
              )
            })}

            {rows.map((r, i) => {
              const x = i * step + (step - bar) / 2
              const hBar = (r.totalElement / max) * ih
              const y = ih - hBar
              const fill = colorFor(r)
              const isSelected = selectedId === r.cement.id
              const isBaseline = r.cement.id === opcBaselineId
              const reductionLabel = r.gwpReductionPct >= 0 ? `↓ ${r.gwpReductionPct.toFixed(0)}%` : `↑ ${Math.abs(r.gwpReductionPct).toFixed(0)}%`

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
                    aria-label={`${r.cement.cement_type}. Total ${formatNumber(r.totalElement)} kilograms. ${isBaseline ? 'Baseline.' : `${reductionLabel} vs baseline.`}`}
                    onClick={() => setSelectedId(prev => prev === r.cement.id ? null : r.cement.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedId(prev => prev === r.cement.id ? null : r.cement.id) }}
                    stroke={
                      isSelected ? '#0ea5e9'
                      : (r.cement.id === bestId ? '#065f46'
                      : (isBaseline ? '#991b1b'
                      : (r.cement.id === worstNonBaselineId ? '#b45309' : 'none')))}
                    strokeWidth={isSelected || r.cement.id === bestId || isBaseline || r.cement.id === worstNonBaselineId ? 1.5 : 0}
                  />
                  {drawLabelPill(x + bar / 2, y, isBaseline, r.gwpReductionPct)}
                  <title>{`${r.cement.cement_type}
Total: ${formatNumber(r.totalElement)} kg
${isBaseline ? 'Baseline' : `Reduction vs baseline: ${reductionLabel}`}`}</title>
                </g>
              )
            })}

            {/* X labels at a constant -45° for readability */}
            {rows.map((r, i) => {
              const x = i * step + step / 2
              const [l1, l2] = twoLine(r.cement.cement_type)
              const color =
                r.cement.id === bestId ? '#065f46'
                : r.cement.id === opcBaselineId ? '#991b1b'
                : r.cement.id === worstNonBaselineId ? '#92400e'
                : '#475569'
              return (
                <g key={r.cement.id} transform={`translate(${x},${ih + 30}) rotate(-45)`}>
                  <text fontSize="12" fill={color} textAnchor="end">{l1}</text>
                  {l2 && <text y={14} fontSize="12" fill={color} textAnchor="end">{l2}</text>}
                </g>
              )
            })}
          </g>
        </svg>
      </div>

      {/* Details / info panel with application “cards” */}
      <div
        className="details-card"
        aria-live="polite"
        style={{ display: selected ? 'grid' : 'none' }}
      >
        {selected && (
          <>
            <div className="details-title">
              {selected.cement.cement_type}
              {/* we removed Strength from table, but it can still be shown here if desired */}
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
                <div className="details-label">Total CO₂ emission</div>
                <div className="details-value">{formatNumber(selected.totalElement)} kg</div>
              </div>
            </div>

            {/* Recommended applications as card-like chips */}
            {Array.isArray(selected.cement.applications) && selected.cement.applications.length > 0 && (
              <div>
                <div className="details-label" style={{ marginBottom: 6 }}>Recommended applications</div>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  {selected.cement.applications.map((a, idx) => (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: 10,
                        border: '1px solid #e2e8f0',
                        background: '#ffffff',
                        boxShadow: '0 2px 6px rgba(16,24,40,0.05)',
                        fontSize: 12,
                        color: '#0f172a'
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {selected.cement.notes && (
              <div className="details-notes" style={{ marginTop: 4 }}>{selected.cement.notes}</div>
            )}
          </>
        )}
      </div>

      <div className="small" style={{ display:'flex', gap: 12, marginTop: 8, alignItems:'center' }}>
        <span className="chip chip-deepgreen" /> &gt;20% better
        <span className="chip chip-green" /> 10–20%
        <span className="chip chip-yellow" /> ≤10% / worst
        <span className="chip chip-red" /> Baseline or worse
      </div>
    </div>
  )
}
