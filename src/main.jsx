import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

// Self-hosted fonts (no CDN) — Young Serif for display headings,
// Nunito Sans for body text and UI labels.
import '@fontsource/young-serif/400.css'
import '@fontsource/nunito-sans/400.css'
import '@fontsource/nunito-sans/600.css'
import '@fontsource/nunito-sans/700.css'
import '@fontsource/nunito-sans/800.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
