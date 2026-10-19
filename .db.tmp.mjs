import { chromium } from 'playwright'
const b = await chromium.launch({ headless: true })
for (const [w, h, touch] of [[390, 844, true], [1280, 800, false]]) {
  const page = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch })
  await page.goto('http://127.0.0.1:5288/', { waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
  await page.evaluate(() => {
    window.__log = []; let t0 = 0
    const tick = () => { const g = document.querySelector('.davebot-ghost .ghost-mark')
      if (g) { if (!t0) t0 = performance.now(); const r = g.getBoundingClientRect(); window.__log.push([Math.round(performance.now() - t0), Math.round(r.left), Math.round(r.top), Math.round(r.width)]) }
      requestAnimationFrame(tick) }
    requestAnimationFrame(tick)
  })
  const nav = await page.evaluate(() => { const r = document.querySelector('.ghost-button .ghost-mark').getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width)] })
  await page.click('.ghost-button')
  await page.waitForTimeout(90); await page.screenshot({ path: `/tmp/db-${w}-a.png` })
  await page.waitForTimeout(1100); await page.screenshot({ path: `/tmp/db-${w}-b.png` })
  const layout = await page.evaluate(() => { const q = s => { const r = document.querySelector(s).getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)] }; return { ghost: q('.davebot-ghost .ghost-mark'), panel: q('.davebot-panel') } })
  await page.keyboard.press('Escape'); await page.waitForTimeout(1300)
  const log = await page.evaluate(() => window.__log)
  const open = log.filter(f => f[0] < 1000)
  console.log(w, 'nav ghost', JSON.stringify(nav), 'open layout', JSON.stringify(layout))
  console.log(' open frames', open.length, JSON.stringify(open.filter((_, i) => i % 4 === 0).slice(0, 10)))
  console.log(' close last 3', JSON.stringify(log.slice(-3)))
  await page.close()
}
await b.close()
