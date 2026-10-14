import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import rough from 'roughjs'

const generator = rough.generator()

// Horizontal distance between stripes, and how far apart new stripes start drawing.
const STRIPE_GAP = 9
const STAGGER_MS = 25

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
          <Stripes fraction={max ? bar.value / max : 0} />
        </div>
      ))}
    </div>
  )
}

// Cross-hatching over the first `fraction` of the row. Each stripe has its own seed, so a growing bar
// only adds stripes at its end; the ones already there keep their wobble, and only new ones are drawn in.
// Stripes run past both ends of the bar and are clipped there, so the bar has straight ends.
function Stripes({ fraction }: { fraction: number }) {
  const svg = useRef<SVGSVGElement>(null)
  const clipId = `bar-clip-${useId().replace(/[^\w-]/g, '')}`
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = svg.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize((previous) => (previous.width === width && previous.height === height ? previous : { width, height }))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { width, height } = size
  const end = width * fraction
  // Every stripe that starts left of the bar's end; stripe i starts at (i + 1) * STRIPE_GAP - height.
  const count = height && end > 0 ? Math.ceil((end + height) / STRIPE_GAP) - 1 : 0
  const stripes = useMemo(
    () => Array.from({ length: count }, (_, index) => stripePaths(index, height)),
    [count, height],
  )

  // Remember how many stripes there were before the latest change, so new ones are staggered from the first new one.
  const [growth, setGrowth] = useState({ from: 0, to: count })
  if (growth.to !== count) setGrowth({ from: growth.to, to: count })

  return (
    <svg ref={svg} className="bar" aria-hidden="true">
      <clipPath id={clipId}>
        {/* Taller than the bar, so the wobbly line ends above and below it aren't cut off. */}
        <rect x={0} y={-4} width={end} height={height + 8} />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {stripes.map((paths, index) => (
          <Stripe key={index} paths={paths} delay={Math.max(0, index - growth.from) * STAGGER_MS} />
        ))}
      </g>
    </svg>
  )
}

function Stripe({ paths, delay }: { paths: string[]; delay: number }) {
  // Keep the delay from when this stripe first appeared, so later renders don't replay its animation.
  const [initialDelay] = useState(delay)
  return paths.map((d, index) => (
    <path key={index} d={d} pathLength={1} className="bar-stroke" style={{ animationDelay: `${initialDelay}ms` }} />
  ))
}

// The two crossing 45° lines of stripe `index`, spanning `height` across from where it starts.
function stripePaths(index: number, height: number): string[] {
  const x = (index + 1) * STRIPE_GAP - height
  const options = { roughness: 1.2, seed: 2 * index + 1 }
  const lines = [
    generator.line(x, height, x + height, 0, options),
    generator.line(x, 0, x + height, height, { ...options, seed: 2 * index + 2 }),
  ]
  // Rough draws each line as two passes; split them so each pass animates on its own.
  return lines.flatMap((line) => generator.toPaths(line).flatMap((path) => path.d.split(/(?=M)/)))
}
