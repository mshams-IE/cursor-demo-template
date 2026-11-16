import { DemoApp } from '@cloudera-demos/kit'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { pack } from '../pack'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DemoApp spec={pack} />
  </StrictMode>,
)
