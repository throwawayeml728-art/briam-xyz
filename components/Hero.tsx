import ReactDOM from 'react-dom'

// Procedural desert plate (scripts/make-desert.py): Monument Valley-style buttes in the
// manner of a vintage geologic shaded-relief print. Static, no JS: a <picture> with an
// art-directed portrait crop for phones. Both are AVIF-preloaded so the LCP image starts
// downloading with the HTML.
const PORTRAIT = '(max-aspect-ratio: 4/5)'
const LANDSCAPE = '(min-aspect-ratio: 4/5)'

const LEGEND = [
  ['#8b8a50', 'Shinarump cap'],
  ['#c9a24a', 'Moenkopi ledges'],
  ['#cf6d45', 'De Chelly sandstone'],
  ['#b9694e', 'Organ Rock shale'],
  ['#d4a089', 'Siltstone'],
  ['#dcc07f', 'Dune sand & alluvium'],
  ['#6f9690', 'Wash'],
] as const

export default function Hero() {
  ReactDOM.preload('/hero/desert-desktop.avif', { as: 'image', type: 'image/avif', media: LANDSCAPE, fetchPriority: 'high' } as any)
  ReactDOM.preload('/hero/desert-mobile.avif', { as: 'image', type: 'image/avif', media: PORTRAIT, fetchPriority: 'high' } as any)

  return (
    <section className="hero" aria-label="Hero">
      <picture>
        <source media={PORTRAIT} type="image/avif" srcSet="/hero/desert-mobile.avif" />
        <source media={PORTRAIT} type="image/webp" srcSet="/hero/desert-mobile.webp" />
        <source type="image/avif" srcSet="/hero/desert-desktop.avif" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/hero/desert-desktop.webp"
          width={2560}
          height={1440}
          alt="Relief-map illustration of desert buttes and mesas, banded in rust, ochre and olive like a vintage geologic print"
          fetchPriority="high"
          decoding="async"
          draggable={false}
          className="hero-img"
        />
      </picture>

      <div className="hero-plate" aria-hidden="true">
        <div className="hero-title">
          <span className="hero-title-kicker">Geologic sketch</span>
          <span className="hero-title-of">of the</span>
          <span className="hero-title-main">Monument Valley</span>
          <span className="hero-title-sub">Arizona</span>
          <span className="hero-scale">
            <i /><i /><i /><i />
          </span>
          <span className="hero-scale-label">Miles</span>
        </div>
        <ul className="hero-legend">
          {LEGEND.map(([c, label]) => (
            <li key={label}><i style={{ background: c }} />{label}</li>
          ))}
        </ul>
      </div>
    </section>
  )
}
