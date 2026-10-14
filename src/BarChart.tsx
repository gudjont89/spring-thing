import { useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import rough from 'roughjs'
import { hash } from './Sketch'

const generator = rough.generator()

// Horizontal distance between stripes.
const STRIPE_GAP = 9
// How long one stripe takes to draw, and how long one change to a bar's length takes to draw in.
const STROKE_MS = 150
const GROWTH_MS = 2000

// One change to a bar's length: starting at `at`, it pushes the bar's drawn front `distance` pixels further over
// GROWTH_MS.
interface Push {
  at: number
  distance: number
}

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

// Hachure over the first `fraction` of the row, with a rough outline. Each stripe has its own seed, so a growing bar
// only adds stripes at its end; the ones already there keep their wobble, and only new ones are drawn in.
// Stripes run past both ends of the bar and are clipped there, so the bar has straight ends.
function Stripes({ fraction }: { fraction: number }) {
  const svg = useRef<SVGSVGElement>(null)
  const id = useId().replace(/[^\w-]/g, '')
  const [stripeClipId, edgeClipId] = [`bar-stripes-${id}`, `bar-edges-${id}`]
  const seed = hash(id)
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

  // The bar is fully drawn up to `drawn` pixels; each push in flight moves the front on from there. Pushes that
  // overlap add up, so a bar that gets several votes at once just grows faster. Shrinking skips the animation.
  const [growth, setGrowth] = useState({ end, drawn: end, pushes: [] as Push[] })
  if (growth.end !== end) {
    const now = performance.now()
    if (end < growth.end) {
      setGrowth({ end, drawn: end, pushes: [] })
    } else {
      const finished = growth.pushes.filter((push) => push.at + GROWTH_MS <= now)
      setGrowth({
        end,
        drawn: finished.reduce((drawn, push) => drawn + push.distance, growth.drawn),
        pushes: [...growth.pushes.filter((push) => !finished.includes(push)), { at: now, distance: end - growth.end }],
      })
    }
  }
  const startsAt = useMemo(
    () => startTimes(count, height, growth.drawn, growth.pushes),
    [count, height, growth],
  )

  // The outline: the top and bottom edges span the whole row and are clipped at the front, so their wobble doesn't
  // change as the bar grows, and the right edge moves along with the front.
  const edges = useMemo(() => {
    const line = (x1: number, y1: number, x2: number, y2: number, offset: number) =>
      generator.toPaths(generator.line(x1, y1, x2, y2, { roughness: 1.2, seed: seed + offset }))[0].d
    return {
      long: [line(0, 0, width, 0, 0), line(0, height, width, height, 1)],
      left: line(0, 0, 0, height, 2),
      right: line(0, 0, 0, height, 3),
    }
  }, [width, height, seed])

  // Move the front along while pushes are in flight. This changes attributes React doesn't set, so renders keep them.
  const stripeClip = useRef<SVGRectElement>(null)
  const edgeClip = useRef<SVGRectElement>(null)
  const rightEdge = useRef<SVGGElement>(null)
  useLayoutEffect(() => {
    const place = (now: number) => {
      const x = frontAt(now, growth.drawn, growth.pushes)
      stripeClip.current?.setAttribute('width', String(x))
      edgeClip.current?.setAttribute('width', String(x + 4))
      rightEdge.current?.setAttribute('transform', `translate(${x} 0)`)
    }
    const until = Math.max(...growth.pushes.map((push) => push.at + GROWTH_MS))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || performance.now() >= until) {
      place(Infinity)
      return
    }
    let frame = 0
    const tick = (now: number) => {
      place(now)
      if (now < until) frame = requestAnimationFrame(tick)
    }
    tick(performance.now())
    return () => cancelAnimationFrame(frame)
  }, [growth])

  return (
    <svg ref={svg} className="bar" aria-hidden="true">
      {/* Taller than the bar, so the wobbly line ends above and below it aren't cut off. */}
      <clipPath id={stripeClipId}>
        <rect ref={stripeClip} x={0} y={-4} height={height + 8} />
      </clipPath>
      <clipPath id={edgeClipId}>
        <rect ref={edgeClip} x={-4} y={-4} height={height + 8} />
      </clipPath>
      <g clipPath={`url(#${stripeClipId})`}>
        {stripes.map((paths, index) => (
          <Stripe key={index} paths={paths} startsAt={startsAt[index] ?? -Infinity} />
        ))}
      </g>
      {end > 0 && (
        <g className="bar-border">
          <g clipPath={`url(#${edgeClipId})`}>
            {edges.long.map((d, index) => (
              <path key={index} d={d} />
            ))}
          </g>
          <path d={edges.left} />
          <g ref={rightEdge}>
            <path d={edges.right} />
          </g>
        </g>
      )}
    </svg>
  )
}

// A stripe that starts drawing at `startsAt` (a performance.now() time). Its animation runs from when it mounted,
// so the delay is counted from then; if a later push moves `startsAt` earlier, the browser retimes the running
// animation to the new delay. A stripe that should already be drawn gets a delay that puts it at the end.
function Stripe({ paths, startsAt }: { paths: string[]; startsAt: number }) {
  const [mountedAt] = useState(() => performance.now())
  const delay = Math.max(startsAt - mountedAt, -STROKE_MS)
  return paths.map((d, index) => (
    <path
      key={index}
      d={d}
      pathLength={1}
      className="bar-stroke"
      style={{ animationDuration: `${STROKE_MS}ms`, animationDelay: `${delay}ms` }}
    />
  ))
}

// How far the front has got at `now`, in pixels, pushed along by `pushes` from `drawn`.
function frontAt(now: number, drawn: number, pushes: Push[]): number {
  return pushes.reduce(
    (front, push) => front + push.distance * Math.min(Math.max((now - push.at) / GROWTH_MS, 0), 1),
    drawn,
  )
}

// When each of the first `count` stripes starts drawing: the moment the front, pushed along by `pushes` from
// `drawn`, reaches the stripe's bottom end. Starting there keeps the bar filled right up to the front; the stripe's
// tip runs ahead of it and is clipped. Stripes the front had already passed at `drawn` are drawn, at -Infinity.
function startTimes(count: number, height: number, drawn: number, pushes: Push[]): number[] {
  // Stripe k's bottom end; stripes exist only for bottom ends left of the bar's end, so before a bar has any length
  // there are none, and the ones that start left of the bar are new rather than drawn.
  const reach = (stripe: number) => (stripe + 1) * STRIPE_GAP - height
  const times = Array.from({ length: count }, (_, stripe) => (drawn > 0 && reach(stripe) < drawn ? -Infinity : NaN))
  // Between consecutive push starts and ends the front moves at a constant speed.
  const breaks = pushes.flatMap((push) => [push.at, push.at + GROWTH_MS]).sort((a, b) => a - b)
  let front = drawn
  let stripe = times.findIndex(Number.isNaN)
  if (stripe < 0) return times
  for (let i = 0; i + 1 < breaks.length && stripe < count; i++) {
    const [start, end] = [breaks[i], breaks[i + 1]]
    const speed = pushes
      .filter((push) => push.at <= start && end <= push.at + GROWTH_MS)
      .reduce((sum, push) => sum + push.distance / GROWTH_MS, 0)
    const next = front + speed * (end - start)
    // The small allowance keeps rounding from leaving the last stripe of a push unscheduled.
    for (; stripe < count && reach(stripe) <= next + 1e-6; stripe++) {
      times[stripe] = start + Math.max(0, reach(stripe) - front) / speed
    }
    front = next
  }
  for (; stripe < count; stripe++) times[stripe] = breaks[breaks.length - 1] ?? -Infinity
  return times
}

// The 45° line of stripe `index`, spanning `height` across from where it starts.
function stripePaths(index: number, height: number): string[] {
  const x = (index + 1) * STRIPE_GAP - height
  const line = generator.line(x, height, x + height, 0, { roughness: 1.2, seed: index + 1 })
  // Rough draws the line as two passes; split them so each pass animates on its own.
  return generator.toPaths(line).flatMap((path) => path.d.split(/(?=M)/))
}
