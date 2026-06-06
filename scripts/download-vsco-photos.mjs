import { chromium } from 'playwright'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '../public/photos')

const captured = new Map()

const browser = await chromium.launch()
const page = await browser.newPage()

page.on('response', async (response) => {
  const url = response.url()
  if (!url.includes('im.vsco.co') || response.status() !== 200) return
  try {
    const body = await response.body()
    if (body.length > 1000) captured.set(url.split('?')[0], body)
  } catch {}
})

await page.goto('https://brian.vsco.site', { waitUntil: 'networkidle', timeout: 60000 })
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
await page.waitForTimeout(3000)

const ordered = await page.evaluate(() =>
  [...document.querySelectorAll('img.recent-work_image__1J0wy')].map(img => {
    const m = img.alt.match(/(\d+)\s*x\s*(\d+)/i)
    return {
      base: (img.currentSrc || img.src || '').split('?')[0],
      width: m ? Number(m[1]) : 3,
      height: m ? Number(m[2]) : 4,
    }
  })
)

await mkdir(outDir, { recursive: true })

const results = []
for (let i = 0; i < ordered.length; i++) {
  const { base, width, height } = ordered[i]
  const body = captured.get(base)
  if (!body) {
    console.error(`Missing capture for ${base}`)
    continue
  }
  const filename = `select-${String(i + 1).padStart(2, '0')}.jpg`
  await writeFile(path.join(outDir, filename), body)
  results.push({ filename, local: `/photos/${filename}`, width, height })
  console.log(`Saved ${filename}`)
}

await browser.close()
console.log(`Captured ${results.length}/${ordered.length}`)
console.log(JSON.stringify(results, null, 2))
