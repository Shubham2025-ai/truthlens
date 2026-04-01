// Content script - runs on every page
// Listens for messages from popup
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.type === 'GET_URL') {
    sendResponse({ url: window.location.href })
  }
})
