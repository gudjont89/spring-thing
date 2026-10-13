import type { ReactNode } from 'react'
import { Sketch } from './Sketch'

export interface Bar {
  label: ReactNode
  value: number
}

// Hand-drawn horizontal bars, each labelled with its value. A bar at `max` spans the full width.
export function BarChart({ bars, max }: { bars: Bar[]; max: number }) {
  return (
    <div className="bar-chart">
      {bars.map((bar, index) => (
        <div key={index}>
          <div className="bar-label">
            <span>{bar.label}</span>
            <span>{bar.value}</span>
          </div>
          <div className="bar">
            <div className="bar-fill sketched" style={{ width: `${max ? (bar.value / max) * 100 : 0}%` }}>
              <Sketch fill="cross-hatch" hachureGap={9} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
