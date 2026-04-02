import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE}/api/v1`,
  timeout: 60000,
})

export const analyzeUrl   = (url) => api.post('/analyze', { url })
export const analyzeHtml  = (url, html) => api.post('/analyze/html', { url, html })
export const analyzeText  = (text, title = 'Pasted Text') => api.post('/analyze/text', { text, title })
export const compareUrls  = (urls) => api.post('/compare', { urls })
export const getHistory   = (limit = 20) => api.get(`/history?limit=${limit}`)
export const getStats     = () => api.get('/stats')
export const deleteAnalysis  = (id) => api.delete(`/analysis/${id}`)
export const getAnalysisById = (id) => api.get(`/analysis/${id}`)

/**
 * Smart analyze — tries server-side first, then falls back to
 * browser-side fetch if the server gets blocked (CORS permitting).
 * This makes TruthLens work with virtually any URL.
 */
export async function smartAnalyze(url) {
  // Step 1: Try normal server-side scraping
  try {
    const res = await analyzeUrl(url)
    // If server got real content, use it
    if (!res.data.scrape_failed) {
      return res
    }
    // Server scraped but got no content — try browser fetch
    console.log('Server scrape returned no content, trying browser fetch...')
  } catch (err) {
    // 422 = URL validation error (section page etc) — don't retry
    if (err.response?.status === 422) throw err
    console.log('Server scrape failed, trying browser fetch...')
  }

  // Step 2: Browser fetches the page (bypasses server blocks)
  try {
    const html = await fetchViaProxy(url)
    if (html && html.length > 500) {
      console.log('Browser fetch succeeded, sending HTML to backend...')
      return await analyzeHtml(url, html)
    }
  } catch (e) {
    console.log('Browser fetch also failed:', e.message)
  }

  // Step 3: Fall back to URL-only server analysis (Groq source reputation)
  return await analyzeUrl(url)
}

/**
 * Fetch a URL through a CORS proxy so the browser can get the HTML.
 * Uses allorigins.win — free, no key needed.
 */
async function fetchViaProxy(url) {
  // Try allorigins proxy
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(15000) })
    if (resp.ok) {
      const data = await resp.json()
      if (data.contents && data.contents.length > 500) {
        return data.contents
      }
    }
  } catch (e) {
    console.log('allorigins failed:', e.message)
  }

  // Try corsproxy.io as backup
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`
    const resp = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(12000),
      headers: { 'User-Agent': 'Mozilla/5.0' }
    })
    if (resp.ok) {
      const html = await resp.text()
      if (html.length > 500) return html
    }
  } catch (e) {
    console.log('corsproxy failed:', e.message)
  }

  return null
}