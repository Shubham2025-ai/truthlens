import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#1a1a1a',
            color: '#fafaf8',
            border: '1px solid rgba(255,255,255,0.1)',
            fontFamily: 'Outfit, sans-serif',
            fontSize: '14px',
          },
          success: { iconTheme: { primary: '#2ecc71', secondary: '#0d0d0d' } },
          error: { iconTheme: { primary: '#e74c3c', secondary: '#0d0d0d' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
