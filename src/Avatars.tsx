import { useState } from 'react'
import { Sketch } from './Sketch'

// How many avatars fit in the row; older ones still drawing are counted in a "+N" label instead.
const MAX_AVATARS = 5

export interface Voter {
  id: string
  name: string | undefined
}

interface Slot {
  voter: Voter
  leaving: boolean
}

// A right-aligned row of voter avatars, oldest on the left. New avatars come in at the far right and the ones
// already there slide left to make room; avatars that leave fade out in place.
export function Avatars({ voters }: { voters: Voter[] }) {
  const shown = voters.slice(-MAX_AVATARS)
  const hidden = voters.length - shown.length

  // Avatars that leave stay in their slots until they have faded out. Voters only ever leave from the oldest end,
  // so the leaving ones always come first.
  const [slots, setSlots] = useState<Slot[]>(() => shown.map((voter) => ({ voter, leaving: false })))
  const staying = slots.filter((slot) => !slot.leaving)
  if (staying.map((slot) => slot.voter.id).join() !== shown.map((voter) => voter.id).join()) {
    const stillShown = (slot: Slot) => shown.some((voter) => voter.id === slot.voter.id)
    setSlots([
      ...slots.filter((slot) => slot.leaving),
      ...staying.filter((slot) => !stillShown(slot)).map((slot) => ({ ...slot, leaving: true })),
      ...shown.map((voter) => ({ voter, leaving: false })),
    ])
  }

  return (
    <div className="avatars" aria-hidden="true">
      {hidden > 0 && <span className="avatars-more">+{hidden}</span>}
      {slots.map(({ voter, leaving }) => (
        // The slot grows in from nothing, which pushes the avatars to its left along smoothly.
        <span key={voter.id} className="avatar-slot">
          <span
            className={leaving ? 'avatar sketched leaving' : 'avatar sketched'}
            onAnimationEnd={(event) => {
              if (event.animationName === 'avatar-hide') {
                setSlots((slots) => slots.filter((slot) => slot.voter.id !== voter.id))
              }
            }}
          >
            <Sketch shape="ellipse" />
            {voter.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </span>
      ))}
    </div>
  )
}
