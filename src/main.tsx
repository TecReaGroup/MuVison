import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './app/App'
import { I18nProvider } from './shared/i18n/I18nProvider'
import { CatalogProvider } from './feature/catalog/CatalogProvider'
import { AuthGate } from './feature/auth/AuthGate'
import { UpdatePrompt } from './feature/pwa/UpdatePrompt'
import './app/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nProvider>
      <AuthGate>
        <CatalogProvider>
          <App />
        </CatalogProvider>
      </AuthGate>
      <UpdatePrompt />
    </I18nProvider>
  </React.StrictMode>,
)
