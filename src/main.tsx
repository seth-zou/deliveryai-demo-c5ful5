import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n'
import App from './App'
import { ChildModeProvider } from '@/hooks/useChildMode'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode><ChildModeProvider><App /></ChildModeProvider></StrictMode>,
)
