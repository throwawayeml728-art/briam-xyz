import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
await page.goto('https://brian.vsco.site', { waitUntil: 'networkidle', timeout: 60000 })

const info = await page.evaluate(() => {
  const imgs = [...document.querySelectorAll('img')]
  return imgs.map(img => ({
    cls: img.className,
    src: (img.currentSrc || img.src || '').slice(0, 100),
    complete: img.complete,
    nw: img.naturalWidth,
    nh: img.naturalHeight,
    alt: img.alt?.slice(0, 40),
  }))
})

console.log(JSON.stringify(info, null, 2))
await browser.close()
