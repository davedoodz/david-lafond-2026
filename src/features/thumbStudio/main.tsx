/** Dev-only entry for /studio/harvard-mit-thumbnail.html (not part of the production build). */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'dialkit/styles.css'
import { DialRoot } from 'dialkit'
import { ThumbStudio } from './ThumbStudio'
import './thumbStudio.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThumbStudio />
    <DialRoot position="top-right" theme="dark" defaultOpen />
  </StrictMode>,
)
