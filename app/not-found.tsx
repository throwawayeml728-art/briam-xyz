import Link from 'next/link'
import Stipple from '@/components/Stipple'

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>That page doesn&rsquo;t exist.</p>
      <Link href="/">Back home</Link>
      <Stipple name="road-valley" className="stipple--404" />
      <Stipple name="cowboy-standing" className="stipple--standing" />
    </main>
  )
}
