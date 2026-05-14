const REQUEST_URL_FILTERS = ["<all_urls>"];

function shouldCapture(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    return false;
  }

  if (parsed.port === '8090' && parsed.pathname === '/__open_in_idea') return false;
  if (parsed.pathname.startsWith('/static')) return false;

  const ignored = /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i;
  return !ignored.test(parsed.pathname);
}

function isSafeUrl(url) {
  if (!url) return false;
  return !(
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('about:') ||
    url.startsWith('devtools://')
  );
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('Spring Boot Open in IDE installed');
});

chrome.webRequest.onCompleted.addListener((details) => {
  if (details.tabId < 0 || !isSafeUrl(details.url) || !shouldCapture(details.url)) return;

  chrome.tabs.sendMessage(details.tabId, {
    type: '__spring_ide_request',
    payload: {
      url: details.url,
      method: details.method,
      status: details.statusCode,
      duration: 0,
      reqHeaders: {},
      resHeaders: {},
      reqBody: null,
      resBody: ''
    }
  }).catch(() => {});
}, { urls: REQUEST_URL_FILTERS });

chrome.webRequest.onErrorOccurred.addListener((details) => {
  if (details.tabId < 0 || !isSafeUrl(details.url) || !shouldCapture(details.url)) return;

  chrome.tabs.sendMessage(details.tabId, {
    type: '__spring_ide_request',
    payload: {
      url: details.url,
      method: details.method,
      status: 0,
      duration: 0,
      reqHeaders: {},
      resHeaders: {},
      reqBody: null,
      resBody: '[request failed]'
    }
  }).catch(() => {});
}, { urls: REQUEST_URL_FILTERS });

chrome.action.onClicked.addListener((tab) => {
  if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:') || tab.url.startsWith('devtools://')) return;
  chrome.tabs.sendMessage(tab.id, { type: '__spring_ide_toggle' }).catch(() => {
    if (!isSafeUrl(tab.url)) return;
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    }).catch(() => {});
  });
});