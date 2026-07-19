import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import '@shared/styles/index.css'
import './admin.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="admin-app">
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </div>
  </StrictMode>,
)
