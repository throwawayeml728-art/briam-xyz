import Link from 'next/link'
import SiteShell from '@/components/SiteShell'

export default function NotFound() {
  return (
    <SiteShell number="404">
      <section className="shell-hero" aria-labelledby="not-found-title">
        <h1 id="not-found-title">Page not found</h1>
        <div className="shell-copy">
          <p>That page doesn&rsquo;t exist.</p>
        </div>
        <div className="shell-actions">
          <Link href="/" className="shell-btn shell-btn--solid">Back home</Link>
        </div>
      </section>
    </SiteShell>
  )
}
