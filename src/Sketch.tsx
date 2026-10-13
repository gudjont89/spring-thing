import { useId, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react'
import rough from 'roughjs'

const generator = rough.generator()

interface Size {
  width: number
  height: number
}

interface SketchProps {
  shape?: 'rectangle' | 'ellipse'
  fill?: 'solid' | 'hachure'
}

function hash(text: string) {
  let value = 0
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0
  return Math.abs(value) + 1
}

// Draws a hand-drawn outline filling its host element, which must be `.sketched`.
// Colors come from the host's --sketch-stroke / --sketch-fill so CSS state selectors can restyle it.
export function Sketch({ shape = 'rectangle', fill }: SketchProps) {
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
        hachureGap: 6,
      }),
    }
    const inset = 2
    const drawable =
      shape === 'ellipse'
        ? generator.ellipse(width / 2, height / 2, width - 2 * inset, height - 2 * inset, options)
        : generator.rectangle(inset, inset, width - 2 * inset, height - 2 * inset, options)
    return generator.toPaths(drawable)
  }, [size, seed, shape, fill])

  return (
    <svg ref={svg} className="sketch" aria-hidden="true">
      {paths.map((path, index) => (
        <path key={index} d={path.d} stroke={path.stroke} strokeWidth={path.strokeWidth} fill={path.fill ?? 'none'} />
      ))}
    </svg>
  )
}

interface ButtonProps extends ComponentProps<'button'> {
  ghost?: boolean
  round?: boolean
}

export function Button({ ghost, round, className, children, ...props }: ButtonProps) {
  const classes = ['sketched', ghost && 'ghost', round && 'round', className].filter(Boolean).join(' ')
  return (
    <button {...props} className={classes}>
      <Sketch shape={round ? 'ellipse' : 'rectangle'} fill={ghost ? undefined : 'solid'} />
      {children}
    </button>
  )
}

// Inputs can't contain the sketch, so it is drawn on a wrapper that follows the input's focus state.
export function TextInput(props: ComponentProps<'input'>) {
  return (
    <span className="sketched input-box">
      <Sketch fill="solid" />
      <input {...props} />
    </span>
  )
}
