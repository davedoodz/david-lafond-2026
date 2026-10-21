import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/site.css'
import { App } from './App'

// Images never start a native drag (the translucent ghost copy), on any page.
document.addEventListener('dragstart', (event) => {
  if (event.target instanceof HTMLImageElement || event.target instanceof SVGElement) event.preventDefault()
})

// A tab opened before a deploy asks for chunks that no longer exist. Reload to pick up the new
// build instead of rendering without its styles or code. At most once a minute, so a chunk that is
// really missing cannot cause a reload loop.
window.addEventListener('vite:preloadError', (event) => {
  const last = Number(sessionStorage.getItem('reloaded-for-deploy'))
  if (Date.now() - last < 60_000) return
  sessionStorage.setItem('reloaded-for-deploy', String(Date.now()))
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
