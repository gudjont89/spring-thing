import { Sketch } from './Sketch'

// How many avatars fit in the row; older ones still drawing are counted in a "+N" label instead.
const MAX_AVATARS = 5

export interface Voter {
  id: string
  name: string | undefined
}

// A right-aligned row of voter avatars, oldest on the left. New avatars come in at the far right and the ones
// already there slide left to make room; avatars that leave just vanish.
export function Avatars({ voters }: { voters: Voter[] }) {
  const shown = voters.slice(-MAX_AVATARS)
  const hidden = voters.length - shown.length
  return (
    <div className="avatars" aria-hidden="true">
      {hidden > 0 && <span className="avatars-more">+{hidden}</span>}
      {shown.map((voter) => (
        // The slot grows in from nothing, which pushes the avatars to its left along smoothly.
        <span key={voter.id} className="avatar-slot">
          <span className="avatar sketched">
            <Sketch shape="ellipse" />
            {voter.name?.[0]?.toUpperCase() ?? '?'}
          </span>
        </span>
      ))}
    </div>
  )
}
