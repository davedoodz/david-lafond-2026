import { createRoot } from 'react-dom/client'
import { RenderOnly, Studio } from './Studio'

createRoot(document.getElementById('root')!).render(
  new URLSearchParams(location.search).has('render') ? <RenderOnly /> : <Studio />,
)
