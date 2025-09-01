import React from 'react'
import type { TooltipProps } from 'recharts'
import { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent'
import { formatNumber } from '../lib/calc'

/**
 * Styled tooltip for Recharts that matches app tooltips.
 * Works for Bar/Line/Area charts. Recharts positions the wrapper; we only style the content.
 */
export default function ChartTooltip({
  active,
  label,
  payload,
}: TooltipProps<ValueType, NameType>) {
  if (!active || !payload || payload.length === 0) return null

  return (
    <div className="chart-tip">
      {label != null && (
        <div className="chart-tip__title">{String(label)}</div>
      )}

      <div className="chart-tip__rows">
        {payload
          .filter(item => item && item.value != null && !Number.isNaN(Number(item.value)))
          .map((item, idx) => (
            <div key={idx} className="chart-tip__row">
              <span
                className="chart-tip__dot"
                style={{ background: item.color || '#94a3b8' }}
              />
              <span className="chart-tip__name">{String(item.name ?? '')}</span>
              <span className="chart-tip__value">
                {typeof item.value === 'number'
                  ? formatNumber(item.value)
                  : formatNumber(Number(item.value))}
              </span>
              {item.unit && <span className="chart-tip__unit">{item.unit}</span>}
            </div>
          ))}
      </div>
    </div>
  )
}
