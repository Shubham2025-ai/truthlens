const API_URL = 'https://truthlens-api.onrender.com'
const APP_URL = 'https://truthlens.vercel.app'

let currentUrl = ''
let analysisResult = null

const LOADING_STEPS = [
  'Fetching article...', 'Extracting content...',
  'Running bias detection...', 'Checking facts with AI...',
  'Building your report...'
]

function show(id) {
  ['view-main','view-loading','view-result','view-error'].forEach(v => {
    document.getElementById(v).style.display = v === id ? 'block' : 'none'
  })
}

function scoreColor(s) {
  return s >= 75 ? '#2ecc71' : s >= 50 ? '#f39c12' : s >= 30 ? '#e67e22' : '#e74c3c'
}

function manipColor(l) {
  return l === 'High' ? '#e74c3c' : l === 'Medium' ? '#f39c12' : '#2ecc71'
}

// Get current tab URL
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0]) {
    currentUrl = tabs[0].url
    const urlEl = document.getElementById('url-display')
    const domain = new URL(currentUrl).hostname.replace('www.','')
    urlEl.textContent = domain + new URL(currentUrl).pathname.slice(0, 40) + (new URL(currentUrl).pathname.length > 40 ? '...' : '')
    urlEl.title = currentUrl
  }
})

function openApp() {
  chrome.tabs.create({ url: currentUrl ? `${APP_URL}?url=${encodeURIComponent(currentUrl)}` : APP_URL })
}

async function startAnalysis() {
  if (!currentUrl || !currentUrl.startsWith('http')) {
    showError('Cannot analyze this page. Please navigate to a news article.')
    return
  }

  show('view-loading')
  let stepIndex = 0
  const stepInterval = setInterval(() => {
    stepIndex = Math.min(stepIndex + 1, LOADING_STEPS.length - 1)
    document.getElementById('loading-text').textContent = LOADING_STEPS[stepIndex]
  }, 2000)

  try {
    const response = await fetch(`${API_URL}/api/v1/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: currentUrl, use_cache: true })
    })

    clearInterval(stepInterval)

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.detail || 'Analysis failed')
    }

    analysisResult = await response.json()
    showResult(analysisResult)
  } catch (err) {
    clearInterval(stepInterval)
    showError(err.message || 'Could not analyze this article. Try opening the full app.')
  }
}

function showResult(data) {
  show('view-result')
  const bias = data.bias || {}
  const manip = data.manipulation || {}
  const score = data.credibility_score ?? 0
  const color = scoreColor(score)

  document.getElementById('result-content').innerHTML = `
    <div class="score-row">
      <div class="score-card">
        <div class="score-num" style="color:${color};">${score}</div>
        <div class="score-lbl">Credibility</div>
      </div>
      <div class="score-card">
        <div class="score-num" style="font-size:13px;color:#fff;margin-top:4px;">${bias.label || '—'}</div>
        <div class="score-lbl">Bias</div>
      </div>
      <div class="score-card">
        <div class="score-num" style="color:${manipColor(manip.level)};font-size:16px;margin-top:4px;">${manip.level || 'Low'}</div>
        <div class="score-lbl">Manipulation</div>
      </div>
    </div>

    <div class="bias-row">
      <div class="bias-label-row">
        <span class="bias-name">${bias.label || 'Unknown'}</span>
        <span class="bias-conf">${bias.confidence || 0}% confidence</span>
      </div>
      <div class="bias-track">
        <div style="width:${bias.pro_side_pct||0}%;background:#e74c3c;height:100%;"></div>
        <div style="width:${bias.neutral_pct||0}%;background:rgba(255,255,255,0.15);height:100%;"></div>
        <div style="width:${bias.against_side_pct||0}%;background:#3498db;height:100%;"></div>
      </div>
    </div>

    ${data.summary_eli15 ? `
    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:10px 12px;margin-bottom:10px;">
      <div style="font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,0.3);margin-bottom:5px;">ELI15</div>
      <div style="font-size:11px;color:rgba(255,255,255,0.6);line-height:1.6;">${data.summary_eli15.slice(0,180)}${data.summary_eli15.length > 180 ? '...' : ''}</div>
    </div>` : ''}
  `

  // Store result so we can pass to full app
  chrome.storage.local.set({ lastAnalysis: data, lastUrl: currentUrl })

  document.getElementById('view-full-btn').onclick = () => {
    chrome.tabs.create({ url: `${APP_URL}/result?id=${data.id || ''}` })
  }
}

function showError(msg) {
  show('view-error')
  document.getElementById('error-text').textContent = msg
}
