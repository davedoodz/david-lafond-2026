import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/site.css'
import { App } from './App'

// Images never start a native drag (the translucent ghost copy), on any page.
document.addEventListener('dragstart', (event) => {
  if (event.target instanceof HTMLImageElement || event.target instanceof SVGElement) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
