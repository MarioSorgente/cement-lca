// …imports unchanged…
import Tooltip from './Tooltip'
import CompareToggle from './CompareToggle'

// …types and ThStack stay the same…

// Map SCM/acronym or tag -> friendly explanation
function tagHelp(tag: string): string {
  const t = tag.toLowerCase().replace(/\s+/g, '')
  if (t === 'opc') return 'OPC: Ordinary Portland Cement — no SCMs, high clinker.'
  if (t === 'slag' || t === 's') return 'S = Slag (GGBFS): Supplementary cementitious material lowering clinker and GWP.'
  if (t === 'flyash' || t === 'v' || t === 'fly') return 'V = Fly ash: Pozzolanic SCM that can reduce clinker and embodied carbon.'
  if (t === 'pozzolana' || t === 'p') return 'P = Pozzolana: Natural/artificial pozzolan improving durability and lowering clinker.'
  if (t === 'limestone' || t === 'll' || t === 'limestonefiller') return 'LL = Limestone filler: Inert filler, reduces clinker share in composite cements.'
  if (t === 'calcinedclay' || t === 'cc' || t === 'lc3') return 'CC = Calcined clay (LC³ systems): Reactivity allows substantial clinker reduction.'
  if (t === 'composite' || t === 'blend' || t === 'compos') return 'Composite: Cement with a blend of SCMs (e.g., S, V, P, LL, CC).'
  return `Tag: ${tag}`
}

export default function ResultsTable(props: Props) {
  const {
    rows, pageSize, onPageSize,
    sortKey, sortDir, onSortChange,
    search, onSearch,
    scope, onScope,
    onExport,
    onRowClick, selectedId,
    bestId, baselineId,
    dosageMode, perCementDosage, onPerCementDosageChange,
    comparedIds, onToggleCompare,
  } = props

  // …headerHelp, pageRows, worstNonBaselineId unchanged…

  return (
    <>
      {/* Toolbar … unchanged … */}

      <div className="card">
        <div className="table-scroll">
          <table className="table">
            {/* thead … unchanged … */}

            <tbody>
              {pageRows.map(r => {
                const id = r.cement.id
                const inCompare = (comparedIds ?? []).includes(id)
                const isBest  = id === bestId
                const isBase  = id === baselineId
                const isWorst = /* same as before */ (undefined as any)

                // row tint & stripe … like previous version …
                let rowStyle: React.CSSProperties = {}
                if (isBase)        rowStyle = { background: 'rgba(239,68,68,0.06)' }
                else if (isBest)   rowStyle = { background: 'rgba(16,185,129,0.06)' }

                const leftStripe = isBest ? '#10b981' : (isBase ? '#ef4444' : '#e5e7eb')

                // pill computation … unchanged …
                const pct = r.gwpReductionPct
                let pill: JSX.Element
                if (isBase) pill = <span className="pill pill-red">Baseline</span>
                else if (pct <= 0) pill = <span className="pill pill-red">↑ {Math.abs(Math.round(pct))}%</span>
                else if (pct <= 10) pill = <span className="pill pill-amber">↓ {Math.round(pct)}%</span>
                else if (pct <= 20) pill = <span className="pill pill-green">↓ {Math.round(pct)}%</span>
                else pill = <span className="pill pill-deepgreen">↓ {Math.round(pct)}%</span>

                const dosageEditable = dosageMode === 'perCement' && !!onPerCementDosageChange
                const dosageValue = dosageEditable ? (perCementDosage?.[id] ?? r.dosageUsed) : r.dosageUsed

                return (
                  <tr
                    key={id}
                    className={['tr-elevated', selectedId === id ? 'tr-selected' : '', !r.exposureCompatible ? 'row-dim' : ''].join(' ').trim()}
                    onClick={() => onRowClick?.(id)}
                    style={{ ...rowStyle, cursor: onRowClick ? 'pointer' : 'default', borderLeft: `4px solid ${leftStripe}` }}
                  >
                    <td className="td-center" onClick={(e) => e.stopPropagation()}>
                      <CompareToggle
                        selected={inCompare}
                        onToggle={() => onToggleCompare?.(id)}
                        title={inCompare ? 'In compare' : 'Add to compare'}
                      />
                    </td>

                    <td>
                      <div style={{ fontWeight: 600 }}>{r.cement.cement_type}</div>
                      {(r.tags?.length ?? 0) > 0 && (
                        <div className="small" style={{ display:'flex', gap:6, marginTop: 4, flexWrap:'wrap' }}>
                          {r.tags!.map(t => (
                            <Tooltip key={t} text={tagHelp(t)} portal>
                              <span className="chip">{t}</span>
                            </Tooltip>
                          ))}
                        </div>
                      )}
                    </td>

                    <td className="num-strong" style={{ whiteSpace:'nowrap', textAlign:'right' }}>{Math.round(r.cement.clinker_fraction * 100)}%</td>
                    <td className="num-strong" style={{ textAlign:'right' }}>{Number(r.cement.co2e_per_kg_binder_A1A3).toFixed(3)}</td>

                    <td style={{ whiteSpace:'nowrap', textAlign:'right' }}>
                      {dosageEditable ? (
                        <input
                          className="input sm"
                          type="number"
                          min={0}
                          value={String(dosageValue)}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => onPerCementDosageChange!(id, Number(e.target.value) || 0)}
                          title="Edit dosage for this cement (kg/m³)"
                        />
                      ) : (
                        <span className="num-strong">{formatNumber(dosageValue)}</span>
                      )}
                    </td>

                    <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.co2ePerM3_A1A3)}</td>
                    <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.a4Transport)}</td>
                    <td className="num-strong" style={{ textAlign:'right' }}>{formatNumber(r.totalElement)}</td>
                    <td style={{ textAlign:'right' }}>{pill}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* footer … unchanged … */}
      </div>
    </>
  )
}
