import React, { useMemo, useState } from 'react'
import { ResultRow } from '../lib/types'
import { formatNumber } from '../lib/calc'

type ItemLite = { id: string; label: string }

type Props = {
  /** Drawer open/close */
  open: boolean
  onClose: () => void

  /** All computed rows (current filters applied) */
  rows: ResultRow[]

  /** Selected items (ids) for compare */
  selectedIds: string[]

  /** Toggle selection (used in drawer list and “Remove”) */
  onToggle: (id: string) => void

  /** Update dosage per cement (enable input if provided) */
  onDosageChange?: (id: string, value: number) => void

  /** Optional: pass a catalog for the “Add items” list; if omitted we derive from rows */
  catalog?: ItemLite[]

  /** Optional: baseline for the “Most sustainable” ribbon decision */
  baselineId?: string
}

export default function ComparePanel({
  open, onClose,
  rows, selectedIds,
  onToggle,
  onDosageChange,
  catalog,
  baselineId,
}: Props) {
  const [query, setQuery] = useState('')

  const byId = useMemo(() => {
    const m = new Map<string, ResultRow>()
    rows.forEach(r => m.set(r.cement.id, r))
    return m
  }, [rows])

  const selectedRows = useMemo(
    () => selectedIds.map(id => byId.get(id)).filter((x): x is ResultRow => !!x),
    [selectedIds, byId]
  )

  const bestId = useMemo(() => {
    if (!selectedRows.length) return undefined
    return selectedRows.reduce((best, r) =>
      r.totalElement < (best?.totalElement ?? Infinity) ? r : best, undefined as ResultRow | undefined
    )?.cement.id
  }, [selectedRows])

  const list: ItemLite[] = useMemo(() => {
    const base = catalog ?? rows.map(r => ({ id: r.cement.id, label: r.cement.cement_type }))
    const q = query.trim().toLowerCase()
    if (!q) return base
    return base.filter(x => x.label.toLowerCase().includes(q))
  }, [catalog, rows, query])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`cmp-drawer-backdrop ${open ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside className={`cmp-drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
        <div className="cmp-drawer-header">
          <div style={{ fontWeight: 700 }}>Compare</div>
          <button
            className="button"
            style={{ padding: '4px 8px', borderRadius: 10 }}
            onClick={onClose}
            aria-label="Close compare panel"
          >
            ✕
          </button>
        </div>

        <div className="cmp-drawer-body">
          {/* Selected items */}
          {selectedRows.length === 0 ? (
            <div className="small" style={{ marginBottom: 8 }}>
              No items selected yet — pick some below.
            </div>
          ) : null}

          {selectedRows.map((r) => {
            const isBest = r.cement.id === bestId
            return (
              <div key={r.cement.id} className="cmp-drawer-row">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div className="cmp-drawer-title">
                      <span className="name">{r.cement.cement_type}</span>
                      {isBest && (
                        <span className="pill pill-deepgreen" style={{ marginLeft: 8 }}>
                          Most sustainable
                        </span>
                      )}
                    </div>

                    {/* meta line (units included, total removed) */}
                    <div className="small" style={{ color: '#475569', marginTop: 2 }}>
                      A1–A3 <strong>{formatNumber(r.co2ePerM3_A1A3)}</strong> kg/m³
                      <span style={{ opacity: 0.6 }}> • </span>
                      A4 <strong>{formatNumber(r.a4Transport)}</strong> kg
                    </div>

                    {/* dosage input */}
                    <div style={{ marginTop: 8 }}>
                      <div className="label" style={{ marginBottom: 4 }}>Dosage (kg/m³)</div>
                      <input
                        className="input"
                        type="number"
                        inputMode="numeric"
                        step={1}
                        min={0}
                        value={Math.round(r.dosageUsed)}
                        onChange={(e) =>
                          onDosageChange?.(r.cement.id, Math.max(0, Number(e.target.value || 0)))
                        }
                        disabled={!onDosageChange}
                        aria-label={`Dosage for ${r.cement.cement_type}`}
                      />
                      <div className="small" style={{ marginTop: 6 }}>
                        <button
                          className="cmp-fab-clear"
                          onClick={() => onToggle(r.cement.id)}
                          aria-label={`Remove ${r.cement.cement_type} from compare`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Total box */}
                  <div
                    aria-label="Total CO2 element"
                    style={{
                      minWidth: 140,
                      border: '1px solid var(--border-strong)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: '#fff',
                      textAlign: 'right',
                      boxShadow: '0 2px 6px rgba(16,24,40,.06)',
                    }}
                  >
                    <div className="small" style={{ color: '#64748b', marginBottom: 4 }}>
                      Total CO₂ element
                      <span className="small" style={{ marginLeft: 4, color: '#94a3b8' }}>(kg)</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 20 }}>
                      {formatNumber(r.totalElement)}
                    </div>
                  </div>
                </div>

                {/* Relative bars (A1–A3 vs A4) */}
                <div className="cmp-bars">
                  <div className="cmp-bars-track">
                    <div className="cmp-bars-total" style={{ width: '100%' }}>
                      <div
                        className="cmp-bars-a1a3"
                        style={{ width: `${r.totalElement === 0 ? 0 : (r.co2ePerM3_A1A3 / r.totalElement) * 100}%` }}
                        title="A1–A3 share"
                      />
                      <div
                        className="cmp-bars-a4"
                        style={{ width: `${r.totalElement === 0 ? 0 : (r.a4Transport / r.totalElement) * 100}%` }}
                        title="A4 share"
                      />
                    </div>
                  </div>
                  <div className="cmp-bars-legend">
                    <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: '#eef2ff', display:'inline-block', marginRight:6 }} />A1–A3</span>
                    <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 999, background: '#fef3c7', display:'inline-block', marginRight:6 }} />A4</span>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Add items section (always available; works when none selected too) */}
          <div style={{ marginTop: 8 }}>
            <div className="label" style={{ marginBottom: 6 }}>Add items to compare</div>
            <input
              className="input"
              placeholder="Search cements…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search cements to add"
            />
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {list.map(x => {
                const sel = selectedIds.includes(x.id)
                return (
                  <button
                    key={x.id}
                    className="button"
                    style={{
                      justifyContent: 'space-between',
                      textAlign: 'left',
                      padding: '8px 10px',
                      borderRadius: 10,
                      background: sel ? '#ecfeff' : '#fff',
                      borderColor: sel ? '#a5f3fc' : 'var(--border-strong)'
                    }}
                    onClick={() => onToggle(x.id)}
                    aria-pressed={sel}
                    aria-label={sel ? `Remove ${x.label}` : `Add ${x.label}`}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {x.label}
                    </span>
                    <span className={`cmp-tgl ${sel ? 'selected' : ''}`} aria-hidden="true" />
                  </button>
                )
              })}
              {list.length === 0 && (
                <div className="small" style={{ color: '#64748b' }}>
                  No matches.
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
