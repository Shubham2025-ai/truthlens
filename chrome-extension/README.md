# TruthLens Chrome Extension

## Install (unpacked — for hackathon demo)
1. Open Chrome → go to chrome://extensions
2. Enable "Developer mode" (top right toggle)
3. Click "Load unpacked"
4. Select this chrome-extension/ folder
5. Pin the TruthLens extension to your toolbar

## How to use
1. Open any news article in Chrome
2. Click the TruthLens icon in toolbar
3. Click "Analyze This Article"
4. See bias, credibility, and manipulation in the popup
5. Click "View Full Report" for complete analysis

## Update API URL
Edit popup.js line 1 if your backend URL is different:
const API_URL = 'https://truthlens-api.onrender.com'
