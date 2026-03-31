import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 60000,
})

export const analyzeUrl = (url) => api.post('/analyze', { url })
export const analyzeText = (text, title = 'Pasted Text') => api.post('/analyze/text', { text, title })
export const compareUrls = (urls) => api.post('/compare', { urls })
export const getHistory = (limit = 20) => api.get(`/history?limit=${limit}`)
export const getStats = () => api.get('/stats')
