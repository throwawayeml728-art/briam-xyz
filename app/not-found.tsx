import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="not-found">
      <h1>Page not found</h1>
      <p>That page doesn&rsquo;t exist.</p>
      <Link href="/">Back home</Link>
    </main>
  )
}
