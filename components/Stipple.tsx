// Decorative stipple-engraving accents generated from Brian's own photos
// (scripts/stipple.py). Purely ornamental: hidden from AT, never interactive.
const SIZES = {
  'horizon-mesas': [2400, 468],
  'butte-mitten': [1040, 582],
  'hoodoo-corner': [720, 1702],
  'road-valley': [1440, 572],
  'merrick-butte': [840, 510],
  'cowboy-rider': [468, 432],
  'cowboy-pair': [520, 526],
  'cowboy-standing': [658, 534],
} as const

export type StippleName = keyof typeof SIZES

export default function Stipple({ name, className = '' }: { name: StippleName; className?: string }) {
  const [w, h] = SIZES[name]
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/art/${name}.svg`}
      alt=""
      aria-hidden="true"
      role="presentation"
      width={w}
      height={h}
      loading="lazy"
      decoding="async"
      draggable={false}
      className={`stipple ${className}`}
    />
  )
}
