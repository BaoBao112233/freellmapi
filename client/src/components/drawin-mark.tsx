// The Drawin AI mark: a goldfish that grew legs. Kept as a component (rather
// than an <img> to favicon.svg) so it inherits the current text colour for the
// eye and stays crisp in the navbar at any zoom.
export function DrawinMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <g fill="#F97316">
        <path d="M17 31 L5 19 Q11 31 5 43 Z" />
        <rect x="24" y="41" width="5" height="13" rx="2.5" />
        <rect x="36" y="41" width="5" height="13" rx="2.5" />
        <ellipse cx="35" cy="29" rx="20" ry="15" />
      </g>
      <circle cx="43" cy="25" r="8.5" fill="#fafafa" />
      <circle cx="45.5" cy="26" r="3.8" fill="#09090b" />
    </svg>
  )
}
