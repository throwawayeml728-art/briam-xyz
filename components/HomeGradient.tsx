'use client'

export default function HomeGradient() {
  return (
    <main className="home-gradient-page">
      <div className="home-gradient" aria-hidden="true">
        <div className="home-gradient-blob home-gradient-blob--sky" />
        <div className="home-gradient-blob home-gradient-blob--azure" />
        <div className="home-gradient-blob home-gradient-blob--cyan" />
        <div className="home-gradient-blob home-gradient-blob--glow" />
        <div className="home-gradient-blob home-gradient-blob--deep" />
      </div>
    </main>
  )
}
