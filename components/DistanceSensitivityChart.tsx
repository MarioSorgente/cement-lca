import React, { useMemo, useRef, useState } from 'react'
import { InputsState, ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type Props = {
  rows: ResultRow[]
  inputs: InputsState
  /** Use compared items if available; falls back to top 5 by total */
  comparedIds?: string[]
  /** Optional axis max in km (default 300) */
  maxKm?: number
}

type Tip = {
  show: boolean
  x: number
  y: number
  name: string
  d: number
  total: number
  a1a3: number
  a4: number
  stroke: string
}

export default function DistanceSensitivityChart({
  rows, inputs, comparedIds, maxKm = 300
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [tip, setTip] = useState<Tip | null>(null)

  // Choose which cements to plot
  const plotted = useMemo(() => {
    const byId: Record<string, ResultRow> = {}
    rows.forEach(r => { byId[r.cement.id] = r })

    const chosen: ResultRow[] =
      (comparedIds && comparedIds.length > 0)
        ? comparedIds.map(id => byId[id]).filter(Boolean)
        : [...rows].sort((a, b) => a.totalElement - b.totalElement).slice(0, 5)

    return chosen
  }, [rows, comparedIds])

  if (!plotted.length) return null

  // Palette (distinct but subtle)
  const strokes = ['#2563eb', '#16a34a', '#f59e0b', '#9333ea', '#ef4444', '#0891b2']

  // Precompute line parameters for each cement:
  // y(d) = base + slope * d
  const series = useMemo(() => {
    const vol = Math.max(0, Number(inputs.volumeM3 ?? 0))
    return plotted.map((r, i) => {
      const dosage = Math.max(0, Number(r.dosageUsed ?? 0))
      const a1a3 = Number(r.co2ePerM3_A1A3 ?? 0) * vol

      // prefer mass-based EF; fallback to legacy m³-based by dividing by dosage
      const efKgPerKgKmExplicit = (r.cement as any).transport_ef_kg_per_kg_km
      const legacyPerM3Km = (r.cement as any).transport_ef_kg_per_m3_km
      const efKgPerKgKm = Number(
        (efKgPerKgKmExplicit ?? (legacyPerM3Km && dosage > 0 ? legacyPerM3Km / dosage : 0)) || 0
      )

      const slope = inputs.includeA4 ? efKgPerKgKm * dosage * vol : 0 // kg per km
      return {
        id: r.cement.id,
        name: r.cement.cement_type,
        color: strokes[i % strokes.length],
        base: a1a3,
        slope,
      }
    })
  }, [plotted, inputs])

  // Build X domain and Y max
  const distances = useMemo(() => {
    const step = maxKm <= 200 ? 5 : 10
    const arr: number[] = []
    for (let d = 0; d <= maxKm; d += step) arr.push(d)
    if (arr[arr.length - 1] !== maxKm) arr.push(maxKm)
    return arr
  }, [maxKm])

  const yMax = useMemo(() => {
    let m = 0
    for (const s of series) {
      const y = s.base + s.slope * maxKm
      if (y > m) m = y
    }
    return m || 1
  }, [series, maxKm])

  // SVG layout
  const w = Math.max(900, 780)
  const h = 420
  const m = { top: 16, right: 24, bottom: 44, left: 64 }
  const iw = w - m.left - m.right
  const ih = h - m.top - m.bottom

  const xFor = (d: number) => (d / maxKm) * iw
  const yFor = (v: number) => ih - (v / yMax) * ih

  // Build paths
  const paths = series.map(s => {
    const d = distances
      .map((km, idx) => `${idx === 0 ? 'M' : 'L'} ${xFor(km)} ${yFor(s.base + s.slope * km)}`)
      .join(' ')
    return { id: s.id, name: s.name, color: s.color, d, s }
  })

  // Find cross-over points
  const crossovers: Array<{ x: number; y: number }> = []
  for (let i = 0; i < series.length; i++) {
    for (let j = i + 1; j < series.length; j++) {
      const a = series[i], b = series[j]
      if (a.slope === b.slope) continue
      const dStar = (b.base - a.base) / (a.slope - b.slope)
      if (dStar > 0 && dStar < maxKm) {
        const y = a.base + a.slope * dStar
        crossovers.push({ x: xFor(dStar), y: yFor(y) })
      }
    }
  }

  // Tooltip
  const TOOLTIP_W = 260
  const PAD = 8
  function showTip(evt: React.MouseEvent) {
    const rect = wrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = evt.clientX - rect.left - m.left
    const y = evt.clientY - rect.top - m.top
    const d = Math.max(0, Math.min(maxKm, (x / iw) * maxKm))

    // pick nearest series at this distance
    let best: { s: typeof series[number]; yPx: number; yVal: number } | null = null
    for (const s of series) {
      const yVal = s.base + s.slope * d
      const yPx = yFor(yVal)
      const dist = Math.abs(yPx - y)
      if (!best || dist < Math.abs(best.yPx - y)) best = { s, yPx, yVal }
    }
    if (!best) return
    const a4 = best.s.slope * d
    const tipLeftCandidate = evt.clientX - rect.left + 12
    let left = tipLeftCandidate
    if (left + TOOLTIP_W > rect.width - PAD) left = Math.max(PAD, evt.clientX - rect.left - TOOLTIP_W - 12)
    left = Math.max(PAD, Math.min(left, rect.width - TOOLTIP_W - PAD))

    setTip({
      show: true,
      x: left,
      y: evt.clientY - rect.top - 16,
      name: best.s.name,
      d,
      total: best.yVal,
      a1a3: best.s.base,
      a4,
      stroke: best.s.color,
    })
  }
  function hideTip() { setTip(null) }

  // Y tick labels (5)
  const ticks = Array.from({ length: 6 }, (_, i) => Math.round((yMax * i) / 5))

  return (
    <div className="card">
      <h2 style={{ fontSize: 18, fontWeight: 600, marginTop: 0, marginBottom: 4 }}>
        Distance sensitivity (Total CO₂ element vs. distance)
      </h2>
      <div className="small" style={{ marginBottom: 8, color: '#475569' }}>
        A4 uses: distance × transport EF (kg CO₂/kg·km) × (dosage × volume). Lines show current volume & dosage.
      </div>

      <div
        ref={wrapRef}
        className="chart-scroll"
        style={{ position: 'relative' }}
        onMouseMove={showTip}
        onMouseLeave={hideTip}
      >
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto' }}>
          <g transform={`translate(${m.left},${m.top})`}>
            {/* grid + axes */}
            {ticks.map((tv, i) => {
              const y = yFor(tv)
              return (
                <g key={i}>
                  <line x1={0} x2={iw} y1={y} y2={y} stroke="#e5e7eb" />
                  <text x={-10} y={y + 4} textAnchor="end" fontSize="12" fill="#475569">
                    {formatNumber(tv)}
                  </text>
                </g>
              )
            })}
            <text x={iw / 2} y={ih + 34} textAnchor="middle" fontSize="12" fill="#475569">Distance (km)</text>
            <text x={-50} y={-6} textAnchor="start" fontSize="12" fill="#475569">Total CO₂ element (kg)</text>

            {/* lines */}
            {paths.map(p => (
              <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth={2.5} />
            ))}

            {/* crossover markers */}
            {crossovers.map((c, i) => (
              <g key={i} transform={`translate(${c.x},${c.y})`}>
                <circle r={3.5} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5} />
              </g>
            ))}

            {/* legend */}
            <g transform={`translate(${iw - 180}, 0)`}>
              {series.map((s, i) => (
                <g key={s.id} transform={`translate(0,${i * 18})`}>
                  <rect x={0} y={-8} width={12} height={3} fill={s.color} />
                  <text x={18} y={0} fontSize="12" fill="#334155">{s.name}</text>
                </g>
              ))}
            </g>
          </g>
        </svg>

        {/* tooltip */}
        {tip?.show && (
          <div
            className="chart-tip"
            style={{
              position: 'absolute',
              left: tip.x,
              top: tip.y,
              transform: 'translateY(-100%)',
              pointerEvents: 'none',
              maxWidth: 260,
            }}
          >
            <div className="chart-tip__title" style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span className="chart-tip__dot" style={{ background: tip.stroke }} />
              {tip.name}
            </div>
            <div className="chart-tip__rows">
              <div className="chart-tip__row">
                <span className="chart-tip__name">Distance</span>
                <span className="chart-tip__value">{Math.round(tip.d)}</span>
                <span className="chart-tip__unit">km</span>
              </div>
              <div className="chart-tip__row">
                <span className="chart-tip__name">Total CO₂ element</span>
                <span className="chart-tip__value">{formatNumber(tip.total)}</span>
                <span className="chart-tip__unit">kg</span>
              </div>
              <div className="chart-tip__row">
                <span className="chart-tip__name">A1–A3</span>
                <span className="chart-tip__value">{formatNumber(tip.a1a3)}</span>
                <span className="chart-tip__unit">kg</span>
              </div>
              <div className="chart-tip__row">
                <span className="chart-tip__name">A4 @ d</span>
                <span className="chart-tip__value">{formatNumber(tip.a4)}</span>
                <span className="chart-tip__unit">kg</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
