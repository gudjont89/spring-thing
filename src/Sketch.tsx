import { useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import rough from 'roughjs'

const generator = rough.generator()

interface Size {
  width: number
  height: number
}

interface SketchProps {
  shape?: 'rectangle' | 'ellipse'
  fill?: 'solid' | 'hachure' | 'cross-hatch'
  /** Space between fill lines, in pixels. */
  hachureGap?: number
}

// A stable number for `text`, for seeding Rough so each element keeps its own wobble across redraws.
export function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0
  return Math.abs(value) + 1
}

// Draws a hand-drawn outline filling its host element, which must be `.sketched`.
// Colors come from the host's --sketch-stroke / --sketch-fill so CSS state selectors can restyle it.
export function Sketch({ shape = 'rectangle', fill, hachureGap = 6 }: SketchProps) {
  const svg = useRef<SVGSVGElement>(null)
  const [size, setSize] = useState<Size>({ width: 0, height: 0 })
  // A fixed seed per element keeps the wobble from changing on every redraw.
  const seed = hash(useId())

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

  const paths = useMemo(() => {
    const { width, height } = size
    if (width < 4 || height < 4) return []
    const options = {
      seed,
      stroke: 'var(--sketch-stroke)',
      strokeWidth: 1.5,
      roughness: 1.2,
      ...(fill && {
        fill: 'var(--sketch-fill)',
        fillStyle: fill,
        fillWeight: 1.5,
        hachureGap,
      }),
    }
    const inset = 2
    const drawable =
      shape === 'ellipse'
        ? generator.ellipse(width / 2, height / 2, width - 2 * inset, height - 2 * inset, options)
        : generator.rectangle(inset, inset, width - 2 * inset, height - 2 * inset, options)
    return generator.toPaths(drawable)
  }, [size, seed, shape, fill, hachureGap])

  return (
    <svg ref={svg} className="sketch" aria-hidden="true">
      {paths.map((path, index) => (
        <path key={index} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill={path.fill ?? 'none'} />
      ))}
    </svg>
  )
}

const ICON_LINES = {
  plus: [
    [12, 4, 12, 20],
    [4, 12, 20, 12],
  ],
  minus: [[4, 12, 20, 12]],
  cross: [
    [5, 5, 19, 19],
    [19, 5, 5, 19],
  ],
} as const

export type IconName = keyof typeof ICON_LINES

// Hand-drawn glyph in the current text color, stroked like the outlines drawn by <Sketch>.
export function Icon({ name }: { name: IconName }) {
  const seed = hash(useId())
  const paths = useMemo(
    () =>
      ICON_LINES[name].flatMap(([x1, y1, x2, y2]) =>
        generator.toPaths(
          generator.line(x1, y1, x2, y2, { seed, stroke: 'currentColor', strokeWidth: 1.5, roughness: 1.2 }),
        ),
      ),
    [name, seed],
  )
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths.map((path, index) => (
        <path key={index} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill="none" />
      ))}
    </svg>
  )
}

interface ButtonProps extends ComponentProps<'button'> {
  ghost?: boolean
  round?: boolean
  icon?: IconName
}

export function Button({ ghost, round, icon, className, children, ...props }: ButtonProps) {
  const classes = ['sketched', ghost && 'ghost', round && 'round', icon && 'icon-button', className]
    .filter(Boolean)
    .join(' ')
  return (
    <button {...props} className={classes}>
      <Sketch shape={round ? 'ellipse' : 'rectangle'} fill={ghost ? undefined : 'solid'} />
      {icon ? <Icon name={icon} /> : children}
    </button>
  )
}

// Inputs can't contain the sketch, so it is drawn on a wrapper that follows the input's focus state.
export function TextInput(props: ComponentProps<'input'>) {
  return (
    <span className="sketched input-box">
      <Sketch />
      <input {...props} />
    </span>
  )
}
