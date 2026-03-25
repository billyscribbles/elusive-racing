import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { getCachedCategories } from './lib/woocommerce.js'

// Pre-warm category cache so search taxonomy lookups are instant
getCachedCategories();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
