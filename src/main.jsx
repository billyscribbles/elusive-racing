import './instrument'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './App.css'
import App from './App.jsx'
import { primeWholesaleTiers } from './lib/wholesaleTiers'

if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual';
}

primeWholesaleTiers();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
