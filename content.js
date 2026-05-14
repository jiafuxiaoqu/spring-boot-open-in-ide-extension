// content.js - 在页面上注入浮窗，显示Spring Boot请求列表
// 请求数据由 inject.js（MAIN world）通过 postMessage 传入
(function () {
  // 防止重复注入
  if (document.getElementById('__spring_ide_panel')) return;

  const MAX_REQUESTS = 50;
  const requestDataMap = new Map();
  let requestId = 0;
  let addRequestToUIRef = null;
  const recentRequestKeys = new Map();
  const recentDetailedKeys = new Map();
  // 面板创建前的请求缓存
  let pendingRequests = [];

  function hasDetails(data) {
    return Boolean(
      data.reqBody ||
      data.resBody ||
      Object.keys(data.reqHeaders || {}).length ||
      Object.keys(data.resHeaders || {}).length
    );
  }

  function enqueueRequest(p) {
    const id = ++requestId;
    const data = {
      id,
      url: p.url,
      method: p.method || 'GET',
      reqBody: p.reqBody,
      reqHeaders: p.reqHeaders || {},
      status: p.status,
      resBody: p.resBody || '',
      resHeaders: p.resHeaders || {},
      duration: p.duration,
      time: new Date().toLocaleTimeString()
    };

    const key = `${data.method}|${data.url}|${data.status || ''}`;
    const now = Date.now();
    const last = recentRequestKeys.get(key) || 0;
    const lastDetailed = recentDetailedKeys.get(key) || 0;
    if (!hasDetails(data) && now - lastDetailed < 5000) return;
    if (now - last < 3000) return;
    recentRequestKeys.set(key, now);
    if (hasDetails(data)) recentDetailedKeys.set(key, now);
    for (const [oldKey, ts] of recentRequestKeys) {
      if (now - ts > 5000) recentRequestKeys.delete(oldKey);
    }
    for (const [oldKey, ts] of recentDetailedKeys) {
      if (now - ts > 5000) recentDetailedKeys.delete(oldKey);
    }

    requestDataMap.set(id, data);
    if (addRequestToUIRef) {
      addRequestToUIRef(data);
    } else {
      pendingRequests.push(data);
    }
  }

  // 监听来自 inject.js（MAIN world）的 postMessage
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data && event.data.type === '__spring_ide_request') {
      enqueueRequest(event.data.payload);
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === '__spring_ide_request') {
      setTimeout(() => enqueueRequest(msg.payload), 1500);
    }
  });

  // ========== 创建面板 ==========
  function createPanel() {
    if (document.getElementById('__spring_ide_panel')) return;

    const style = document.createElement('style');
    style.textContent = `
 #__spring_ide_panel {
 position: fixed;
 top: 0;
 right: 0;
 width: 560px;
 height: 100vh;
 max-width: 100vw;
 max-height: 100vh;
 min-width: 320px;
 min-height: 200px;
 background: #1e1e1e;
 border: 1px solid #3c3c3c;
 border-radius: 8px 0 0 8px;
 box-sizing: border-box;
 box-shadow: 0 4px 24px rgba(0,0,0,0.5);
 z-index: 2147483647;
 font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;
 font-size: 12px;
 color: #d4d4d4;
 display: flex;
 flex-direction: column;
 overflow: hidden;
 transition: width 0.2s ease, height 0.2s ease;
 resize: none;
 }
 #__spring_ide_panel.minimized {
 width: 52px !important;
 height: 52px !important;
 min-width: 52px !important;
 min-height: 52px !important;
 border-radius: 50%;
 cursor: pointer;
 }
 #__spring_ide_panel.minimized #__spring_ide_header,
 #__spring_ide_panel.minimized #__spring_ide_list,
 #__spring_ide_panel.minimized .__spring_ide_resize_handle,
 #__spring_ide_panel.minimized .__spring_ide_config_dialog {
 display: none !important;
 }
 .__spring_ide_minimized_icon {
 display: none;
 width: 100%;
 height: 100%;
 padding: 8px;
 box-sizing: border-box;
 object-fit: contain;
 background: #2d2d2d;
 }
 #__spring_ide_panel.minimized .__spring_ide_minimized_icon {
 display: block;
 }
 #__spring_ide_header {
 display: flex;
 align-items: center;
 justify-content: space-between;
 padding: 6px 12px;
 background: #2d2d2d;
 border-bottom: 1px solid #3c3c3c;
 cursor: move;
 user-select: none;
 flex-shrink: 0;
 }
 #__spring_ide_header h3 {
 margin: 0;
 font-size: 13px;
 color: #d4d4d4;
 }
  .__spring_ide_resize_handle {
 position: absolute;
 bottom: 0;
 left: 0;
 width: 12px;
 height: 12px;
 cursor: sw-resize;
 background: linear-gradient(225deg, transparent 50%, #666 50%);
 z-index: 1000;
 }
  .__spring_ide_resize_handle:hover {
 background: linear-gradient(225deg, transparent 50%, #007acc 50%);
 }
 .__spring_ide_header_btns {
 display: flex;
 gap: 6px;
 }
 .__spring_ide_btn {
 background: #007acc;
 border: none;
 color: white;
 padding: 3px 10px;
 border-radius: 4px;
 cursor: pointer;
 font-size: 11px;
 white-space: nowrap;
 font-family: inherit;
 }
 .__spring_ide_btn:hover {
 background: #005a9e;
 }
 .__spring_ide_btn.danger {
 background: #dc3545;
 }
 .__spring_ide_btn.danger:hover {
 background: #b02a37;
 }
 .__spring_ide_btn.toggle {
 background: #555;
 }
 .__spring_ide_btn.toggle:hover {
 background: #777;
 }
 .__spring_ide_config_dialog {
 display: none;
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translate(-50%, -50%);
 background: #1e1e1e;
 border: 1px solid #3c3c3c;
 border-radius: 8px;
 padding: 16px;
 z-index: 100;
 box-shadow: 0 4px 24px rgba(0,0,0,0.5);
 width: 320px;
 }
 .__spring_ide_config_dialog.visible {
 display: block;
 }
 .__spring_ide_config_dialog h4 { margin: 0 0 12px 0; color: #d4d4d4; font-size: 13px; }
 .__spring_ide_form_group { margin-bottom: 10px; }
 .__spring_ide_form_group label { display: block; margin-bottom: 4px; font-size: 11px; color: #888; }
 .__spring_ide_form_group input { width: 100%; box-sizing: border-box; background: #2d2d2d; border: 1px solid #3c3c3c; color: #d4d4d4; padding: 4px 6px; border-radius: 4px; font-size: 11px; }
 .__spring_ide_dialog_btns { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
 #__spring_ide_list {
 overflow-y: auto;
 flex: 1;
 padding: 6px;
 }
 .__spring_ide_item {
 padding: 6px 8px;
 margin-bottom: 2px;
 background: #2d2d2d;
 border-radius: 4px;
 display: flex;
 align-items: center;
 gap: 8px;
 cursor: pointer;
 }
 .__spring_ide_item:hover {
 background: #363636;
 }
 .__spring_ide_item.expanded {
 background: #333;
 }
 .__spring_ide_method {
 font-weight: bold;
 min-width: 54px;
 padding: 2px 6px;
 border-radius: 3px;
 text-align: center;
 font-size: 11px;
 flex-shrink: 0;
 }
 .__spring_ide_method-GET { background: #0d6efd; color: white; }
 .__spring_ide_method-POST { background: #198754; color: white; }
 .__spring_ide_method-PUT { background: #ffca2c; color: #000; }
 .__spring_ide_method-DELETE { background: #dc3545; color: white; }
 .__spring_ide_method-PATCH { background: #6f42c1; color: white; }
 .__spring_ide_url {
 flex: 1;
 min-width: 0;
 word-break: break-all;
 color: #9cdcfe;
 overflow: visible;
 white-space: normal;
 }
 .__spring_ide_url-main {
 display: block;
 color: #9cdcfe;
 line-height: 1.35;
 }
 .__spring_ide_query-list {
 display: flex;
 flex-wrap: wrap;
 gap: 4px;
 margin-top: 4px;
 }
 .__spring_ide_query-chip {
 display: inline-flex;
 align-items: baseline;
 max-width: 100%;
 padding: 2px 6px;
 border: 1px solid #3d5a6e;
 border-radius: 4px;
 background: #182833;
 color: #cfe8f8;
 line-height: 1.35;
 }
 .__spring_ide_query-chip-key {
 color: #7dd3fc;
 font-weight: 600;
 }
 .__spring_ide_query-chip-val {
 color: #f0c674;
 word-break: break-all;
 }
 .__spring_ide_status {
 min-width: 36px;
 text-align: center;
 color: #888;
 flex-shrink: 0;
 }
 .__spring_ide_dur {
 min-width: 40px;
 text-align: right;
 color: #666;
 font-size: 10px;
 flex-shrink: 0;
 }
 .__spring_ide_open {
 background: #007acc;
 border: none;
 color: white;
 padding: 3px 10px;
 border-radius: 4px;
 cursor: pointer;
 font-size: 11px;
 white-space: nowrap;
 font-family: inherit;
 flex-shrink: 0;
 }
 .__spring_ide_open:hover {
 background: #005a9e;
 }
 .__spring_ide_empty {
 padding: 20px;
 text-align: center;
 color: #888;
 }
 .__spring_ide_count {
 background: #007acc;
 color: white;
 border-radius: 10px;
 padding: 1px 7px;
 font-size: 11px;
 margin-left: 6px;
 }
 .__spring_ide_detail {
 display: none;
 background: #252526;
 border: 1px solid #3c3c3c;
 border-radius: 4px;
 margin: 4px 0 6px 0;
 padding: 8px;
 font-size: 11px;
 }
 .__spring_ide_detail.visible {
 display: block;
 }
 .__spring_ide_detail pre {
 margin: 4px 0;
 padding: 8px 10px;
 background: linear-gradient(180deg, #161b22 0%, #101418 100%);
 border: 1px solid #30363d;
 border-radius: 6px;
 overflow-x: auto;
 max-height: 200px;
 overflow-y: auto;
 white-space: pre-wrap;
 word-break: break-all;
 font-family: 'Consolas', 'Courier New', monospace;
 font-size: 11px;
 line-height: 1.45;
 color: #d6deeb;
 box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
 }
 .__spring_ide_detail-res pre {
 background: linear-gradient(180deg, #101820 0%, #0d1117 100%);
 border-color: #24445c;
 color: #b9f6ca;
 }
 .__spring_ide_detail-tab-bar {
 display: flex;
 gap: 0;
 margin-bottom: 6px;
 border-bottom: 1px solid #3c3c3c;
 }
 .__spring_ide_detail-tab {
 padding: 4px 10px;
 cursor: pointer;
 color: #888;
 border-bottom: 2px solid transparent;
 font-size: 11px;
 }
 .__spring_ide_detail-tab:hover {
 color: #ccc;
 }
 .__spring_ide_detail-tab.active {
 color: #d4d4d4;
 border-bottom-color: #007acc;
 }
 .__spring_ide_detail-section {
 margin-bottom: 6px;
 }
 .__spring_ide_detail-label {
 color: #569cd6;
 font-weight: bold;
 font-size: 11px;
 margin-bottom: 2px;
 }
 .__spring_ide_detail-inline {
 display: flex;
 align-items: flex-start;
 gap: 4px;
 margin: 2px 0;
 }
 .__spring_ide_detail-inline-key {
 color: #9cdcfe;
 min-width: 0;
 word-break: break-all;
 flex-shrink: 0;
 }
 .__spring_ide_detail-inline-val {
 color: #ce9178;
 word-break: break-all;
 }
  .__spring_ide_detail-pre-wrapper {
  position: relative;
  margin: 4px 0;
  }
  .__spring_ide_detail-pre-res {
  background: linear-gradient(180deg, #101820 0%, #0d1117 100%) !important;
  border-color: #24445c !important;
  color: #b9f6ca !important;
  padding: 8px 10px !important;
  }
  .__spring_ide_copy-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  background: #007acc;
  border: none;
  color: white;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  white-space: nowrap;
  font-family: inherit;
  opacity: 0.7;
  transition: opacity 0.2s;
  z-index: 10;
  }
  .__spring_ide_copy-btn:hover {
  opacity: 1;
  background: #005a9e;
  }
  `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = '__spring_ide_panel';
    panel.innerHTML = `
 <img class="__spring_ide_minimized_icon" src="${chrome.runtime.getURL('icon.png')}" alt="Spring Boot 请求" title="点击展开 Spring Boot 请求">
 <div id="__spring_ide_header">
 <h3>📡 Spring Boot 请求 <span id="__spring_ide_count" class="__spring_ide_count" style="display:none;">0</span></h3>
 <div class="__spring_ide_header_btns">
 <button class="__spring_ide_btn" id="__spring_ide_config_btn">配置</button>
 <button class="__spring_ide_btn danger" id="__spring_ide_clear">清空</button>
 <button class="__spring_ide_btn toggle" id="__spring_ide_toggle">_</button>
 </div>
 </div>
 <div id="__spring_ide_list">
 <div class="__spring_ide_empty">等待请求...</div>
 </div>
 <div class="__spring_ide_resize_handle"></div>
 <div class="__spring_ide_config_dialog" id="__spring_ide_config_dialog">
 <h4>设置配置</h4>
 <div class="__spring_ide_form_group">
 <label>IDEA执行文件目录</label>
 <input type="text" id="__spring_ide_cfg_dir" placeholder="例如: C:\\Program Files\\JetBrains\\IntelliJ IDEA\\bin">
 </div>
 <div class="__spring_ide_form_group">
 <label>IDEA执行文件名称</label>
 <input type="text" id="__spring_ide_cfg_name" placeholder="例如: idea64.exe">
 </div>
 <div class="__spring_ide_form_group">
 <label>请求地址</label>
 <input type="text" id="__spring_ide_cfg_url" value="http://localhost:8090/__open_in_idea">
 </div>
 <div class="__spring_ide_dialog_btns">
 <button class="__spring_ide_btn" id="__spring_ide_cfg_cancel">取消</button>
 <button class="__spring_ide_btn" id="__spring_ide_cfg_save" style="background:#198754">保存</button>
 </div>
 </div>
 `;
    document.body.appendChild(panel);

    // 从 storage 恢复面板位置和最小化状态
    chrome.storage.local.get(['__spring_ide_pos', '__spring_ide_minimized', '__spring_ide_size'], (data) => {
      if (data.__spring_ide_pos && data.__spring_ide_pos.userMoved) {
        panel.style.left = data.__spring_ide_pos.left;
        panel.style.top = data.__spring_ide_pos.top;
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
      }
      if (data.__spring_ide_minimized) {
        panel.classList.add('minimized');
        document.getElementById('__spring_ide_toggle').textContent = '□';
      }
      if (data.__spring_ide_size) {
        panel.style.width = data.__spring_ide_size.width;
        panel.style.height = data.__spring_ide_size.height;
      }
    });

    const listEl = document.getElementById('__spring_ide_list');
    const countEl = document.getElementById('__spring_ide_count');
    let requestCount = 0;

    function savePos() {
      chrome.storage.local.set({
        __spring_ide_pos: {
          left: panel.style.left,
          top: panel.style.top,
          userMoved: true
        }
      });
    }

    // 最小化/展开
    function setMinimized(minimized) {
      panel.classList.toggle('minimized', minimized);
      document.getElementById('__spring_ide_toggle').textContent = minimized ? '□' : '_';
      chrome.storage.local.set({
        __spring_ide_minimized: minimized
      });
    }

    document.getElementById('__spring_ide_toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      setMinimized(!panel.classList.contains('minimized'));
    });

    panel.addEventListener('click', (e) => {
      if (!panel.classList.contains('minimized')) return;
      if (e.target.closest('.__spring_ide_minimized_icon') || e.target === panel) {
        setMinimized(false);
      }
    });

    // 清空
    document.getElementById('__spring_ide_clear').addEventListener('click', () => {
      listEl.innerHTML = '<div class="__spring_ide_empty">等待请求...</div>';
      requestCount = 0;
      requestDataMap.clear();
      countEl.style.display = 'none';
    });

    // 配置
    const configDialog = document.getElementById('__spring_ide_config_dialog');
    const inputDir = document.getElementById('__spring_ide_cfg_dir');
    const inputName = document.getElementById('__spring_ide_cfg_name');
    const inputUrl = document.getElementById('__spring_ide_cfg_url');

    document.getElementById('__spring_ide_config_btn').addEventListener('click', () => {
      chrome.storage.local.get(['__spring_ide_cfg'], (data) => {
        const cfg = data.__spring_ide_cfg || {};
        inputDir.value = cfg.ideaDir || '';
        inputName.value = cfg.ideaName || '';
        inputUrl.value = cfg.requestUrl || 'http://localhost:8090/__open_in_idea';
        configDialog.classList.add('visible');
      });
    });

    document.getElementById('__spring_ide_cfg_cancel').addEventListener('click', () => {
      configDialog.classList.remove('visible');
    });

    document.getElementById('__spring_ide_cfg_save').addEventListener('click', () => {
      chrome.storage.local.set({
        __spring_ide_cfg: {
          ideaDir: inputDir.value.trim(),
          ideaName: inputName.value.trim(),
          requestUrl: inputUrl.value.trim() || 'http://localhost:8090/__open_in_idea'
        }
        
      }, () => {
        configDialog.classList.remove('visible');
      });
      const tip = document.createElement('div');
      tip.textContent = '配置保存成功！';
      tip.style.position = 'fixed';
      tip.style.top = '40px';
      tip.style.right = '20px';
      tip.style.padding = '10px 15px';
      tip.style.background = '#4caf50';
      tip.style.color = '#fff';
      tip.style.borderRadius = '4px';
      tip.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      tip.style.zIndex = '2147483647';
      document.body.appendChild(tip);
      setTimeout(() => tip.remove(), 2000);
    });

    // 拖拽
    const header = document.getElementById('__spring_ide_header');
    let dragging = false, offsetX = 0, offsetY = 0;
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      dragging = true;
      offsetX = e.clientX - panel.getBoundingClientRect().left;
      offsetY = e.clientY - panel.getBoundingClientRect().top;
      panel.style.transition = 'none';
    });
    document.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const rect = panel.getBoundingClientRect();
      const left = Math.min(Math.max(0, e.clientX - offsetX), Math.max(0, window.innerWidth - rect.width));
      const top = Math.min(Math.max(0, e.clientY - offsetY), Math.max(0, window.innerHeight - rect.height));
      panel.style.left = left + 'px';
      panel.style.top = top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (!dragging) return;
      dragging = false;
      panel.style.transition = '';
      savePos();
    });

    // 调整大小功能
    const resizeHandle = panel.querySelector('.__spring_ide_resize_handle');
    let resizing = false, startX = 0, startY = 0, startWidth = 0, startHeight = 0, startRightEdge = 0;

    resizeHandle.addEventListener('mousedown', (e) => {
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      const rect = panel.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      startRightEdge = rect.right;
      panel.style.transition = 'none';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!resizing) return;
      const rect = panel.getBoundingClientRect();
      const maxWidth = Math.max(320, startRightEdge);
      const maxHeight = Math.max(200, window.innerHeight - rect.top);
      const newWidth = Math.min(maxWidth, Math.max(320, startWidth + startX - e.clientX));
      const newHeight = Math.min(maxHeight, Math.max(200, startHeight + e.clientY - startY));
      if (panel.style.right === 'auto') {
        panel.style.left = Math.max(0, startRightEdge - newWidth) + 'px';
      }
      panel.style.width = newWidth + 'px';
      panel.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!resizing) return;
      resizing = false;
      panel.style.transition = '';
      saveSize();
    });

    function saveSize() {
      chrome.storage.local.set({
        __spring_ide_size: {
          width: panel.style.width,
          height: panel.style.height
        }
      });
    }

    // ====== 详情面板 ======
    function buildDetailHTML(data) {
      const reqBodyStr = formatBody(data.reqBody);
      const resBodyStr = formatBody(data.resBody);
      const reqHeadersStr = formatHeaders(data.reqHeaders);
      const resHeadersStr = formatHeaders(data.resHeaders);
      const queryStr = formatQuery(data.url);

      let reqTabContent = '';
      if (reqHeadersStr) {
        reqTabContent += `<div class="__spring_ide_detail-section"><div class="__spring_ide_detail-label">请求头</div>${reqHeadersStr}</div>`;
      }
      if (queryStr) {
        reqTabContent += `<div class="__spring_ide_detail-section"><div class="__spring_ide_detail-label">Query 参数</div>${queryStr}</div>`;
      }

      if (reqBodyStr && data.method !== 'GET') {
        reqTabContent += `<div class="__spring_ide_detail-section"><div class="__spring_ide_detail-label">请求体</div><pre>${escHTML(reqBodyStr)}</pre></div>`;
      }
      if (!reqTabContent) {
        reqTabContent = '<div style="color:#888;padding:8px;">无请求参数</div>';
      }

      let resTabContent = '';
      if (resHeadersStr) {
        resTabContent += `<div class="__spring_ide_detail-section"><div class="__spring_ide_detail-label">响应头</div>${resHeadersStr}</div>`;
      }
      if (resBodyStr) {
        resTabContent += `<div class="__spring_ide_detail-section"><div class="__spring_ide_detail-label">响应体</div><div class="__spring_ide_detail-pre-wrapper"><pre class="__spring_ide_detail-pre-res">${escHTML(resBodyStr)}</pre><button class="__spring_ide_copy-btn">复制</button></div></div>`;
      }
      if (!resTabContent) {
        resTabContent = '<div style="color:#888;padding:8px;">无响应内容</div>';
      }

      return `
 <div class="__spring_ide_detail" data-rid="${data.id}">
 <div class="__spring_ide_detail-tab-bar">
 <div class="__spring_ide_detail-tab active" data-tab="req">请求参数</div>
 <div class="__spring_ide_detail-tab" data-tab="res">响应内容</div>
 </div>
 <div class="__spring_ide_detail-req">${reqTabContent}</div>
 <div class="__spring_ide_detail-res" style="display:none;">${resTabContent}</div>
 </div>`;
    }

    function escHTML(s) {
      if (!s) return '';
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatBody(body) {
      if (!body) return '';
      try {
        const obj = JSON.parse(body);
        return JSON.stringify(obj, null, 2);
      } catch (e) {
        return body;
      }
    }

    function formatHeaders(headers) {
      if (!headers || typeof headers !== 'object') return '';
      const entries = Object.entries(headers);
      if (entries.length === 0) return '';
      return entries.map(([k, v]) =>
        `<div class="__spring_ide_detail-inline"><span class="__spring_ide_detail-inline-key">${escHTML(k)}:</span><span class="__spring_ide_detail-inline-val">${escHTML(String(v))}</span></div>`
      ).join('');
    }

    function formatQuery(url) {
      try {
        const qs = getQueryEntries(url);
        if (qs.length === 0) return '';
        return qs.map(([k, v]) =>
          `<div class="__spring_ide_detail-inline"><span class="__spring_ide_detail-inline-key">${escHTML(k)}:</span><span class="__spring_ide_detail-inline-val">${escHTML(v)}</span></div>`
        ).join('');
      } catch (e) {
        return '';
      }
    }

    function getUrlParts(url) {
      try {
        const parsed = new URL(url, window.location.href);
        return {
          displayUrl: parsed.origin + parsed.pathname,
          queryEntries: [...parsed.searchParams.entries()]
        };
      } catch (e) {
        const [displayUrl, query = ''] = String(url).split('?');
        const params = new URLSearchParams(query.split('#')[0]);
        return {
          displayUrl,
          queryEntries: [...params.entries()]
        };
      }
    }

    function getQueryEntries(url) {
      return getUrlParts(url).queryEntries;
    }

    function buildQueryChips(entries) {
      if (!entries.length) return '';
      return entries.map(([k, v]) =>
        `<span class="__spring_ide_query-chip"><span class="__spring_ide_query-chip-key">${escHTML(k)}</span><span>=</span><span class="__spring_ide_query-chip-val">${escHTML(v)}</span></span>`
      ).join('');
    }

    // ====== 添加请求到 UI ======
    function addRequestToUI(data) {
      const emptyEl = listEl.querySelector('.__spring_ide_empty');
      if (emptyEl) emptyEl.remove();

      const wrapper = document.createElement('div');
      wrapper.className = '__spring_ide_item-wrapper';

      const item = document.createElement('div');
      item.className = '__spring_ide_item';

      const methodSpan = document.createElement('span');
      methodSpan.className = `__spring_ide_method __spring_ide_method-${data.method}`;
      methodSpan.textContent = data.method;

      const urlSpan = document.createElement('span');
      urlSpan.className = '__spring_ide_url';
      const urlParts = getUrlParts(data.url);
      urlSpan.innerHTML = `<span class="__spring_ide_url-main">${escHTML(urlParts.displayUrl)}</span>`;
      const queryHTML = buildQueryChips(urlParts.queryEntries);
      if (queryHTML) {
        urlSpan.insertAdjacentHTML('beforeend', `<span class="__spring_ide_query-list">${queryHTML}</span>`);
      }
      urlSpan.title = data.url;

      const statusSpan = document.createElement('span');
      statusSpan.className = '__spring_ide_status';
      statusSpan.textContent = data.status || '?';
      if (data.status >= 400) statusSpan.style.color = '#f44747';
      else if (data.status >= 300) statusSpan.style.color = '#ffca2c';
      else if (data.status >= 200) statusSpan.style.color = '#89d185';

      const durSpan = document.createElement('span');
      durSpan.className = '__spring_ide_dur';
      durSpan.textContent = data.duration ? data.duration + 'ms' : '';

      const openBtn = document.createElement('button');
      openBtn.textContent = '📂 IDEA';
      openBtn.className = '__spring_ide_open';
      openBtn.onclick = (e) => {
        e.stopPropagation();
        openInIdea(data.url, data.method);
      };

      item.appendChild(methodSpan);
      item.appendChild(urlSpan);
      item.appendChild(statusSpan);
      item.appendChild(durSpan);
      item.appendChild(openBtn);

      // 点击条目展开/收起详情
      item.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        const existing = wrapper.querySelector('.__spring_ide_detail');
        if (existing) {
          existing.classList.toggle('visible');
          item.classList.toggle('expanded', existing.classList.contains('visible'));
          return;
        }
        // 首次展开：创建详情 DOM
        wrapper.insertAdjacentHTML('beforeend', buildDetailHTML(data));
        const detail = wrapper.querySelector('.__spring_ide_detail');
        detail.classList.add('visible');
        item.classList.add('expanded');

        // Tab 切换
        detail.querySelectorAll('.__spring_ide_detail-tab').forEach(tab => {
          tab.addEventListener('click', (ev) => {
            ev.stopPropagation();
            detail.querySelectorAll('.__spring_ide_detail-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const which = tab.dataset.tab;
            detail.querySelector('.__spring_ide_detail-req').style.display = which === 'req' ? '' : 'none';
            detail.querySelector('.__spring_ide_detail-res').style.display = which === 'res' ? '' : 'none';
          });
        });

        // 复制按钮事件
        const copyBtn = detail.querySelector('.__spring_ide_copy-btn');
        if (copyBtn) {
          const preEl = detail.querySelector('.__spring_ide_detail-pre-res');
          if (preEl) {
            copyBtn.addEventListener('click', (ev) => {
              ev.stopPropagation();
              const text = preEl.textContent || preEl.innerText;
              
              // 尝试使用现代的 Clipboard API
              const copyToClipboard = (text) => {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                  return navigator.clipboard.writeText(text);
                }
                
                // 降级到 document.execCommand
                return new Promise((resolve, reject) => {
                  const textArea = document.createElement('textarea');
                  textArea.value = text;
                  textArea.style.position = 'fixed';
                  textArea.style.left = '-999999px';
                  textArea.style.top = '-999999px';
                  document.body.appendChild(textArea);
                  textArea.focus();
                  textArea.select();
                  
                  try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (successful) {
                      resolve();
                    } else {
                      reject(new Error('document.execCommand 失败'));
                    }
                  } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                  }
                });
              };
              
              copyToClipboard(text).then(() => {
                const originalText = copyBtn.textContent;
                copyBtn.textContent = '已复制';
                copyBtn.style.background = '#198754';
                setTimeout(() => {
                  copyBtn.textContent = originalText;
                  copyBtn.style.background = '';
                }, 1500);
              }).catch(err => {
                console.error('复制失败:', err);
                copyBtn.textContent = '失败';
                copyBtn.style.background = '#dc3545';
                setTimeout(() => {
                  copyBtn.textContent = '复制';
                  copyBtn.style.background = '';
                }, 1500);
              });
            });
          }
        }
      });

      wrapper.appendChild(item);

      // 最新的在顶部
      listEl.insertBefore(wrapper, listEl.firstChild);

      // 限制数量
      while (listEl.children.length > MAX_REQUESTS) {
        listEl.removeChild(listEl.lastChild);
      }

      requestCount++;
      countEl.textContent = requestCount;
      countEl.style.display = '';
    }

    addRequestToUIRef = addRequestToUI;

    function truncateUrl(url, maxLen) {
      if (url.length <= maxLen) return url;
      return url.substring(0, maxLen - 3) + '...';
    }

    function openInIdea(url, method) {
      chrome.storage.local.get(['__spring_ide_cfg'], (data) => {
        const cfg = data.__spring_ide_cfg || {};
        
        // 验证 ideaDir 和 ideaName 参数
        if (!cfg.ideaDir && !cfg.ideaName && !cfg.ideaName) {
          const tip = document.createElement('div');
          tip.textContent = '请先配置信息内容';
          tip.style.position = 'fixed';
          tip.style.top = '40px';
          tip.style.right = '20px';
          tip.style.padding = '10px 15px';
          tip.style.background = '#f44336';
          tip.style.color = '#fff';
          tip.style.borderRadius = '4px';
          tip.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
          tip.style.zIndex = '2147483647';
          document.body.appendChild(tip);
          setTimeout(() => tip.remove(), 3000);
          return;
        }
        
        const backendUrl = cfg.requestUrl;
        const payload = {
          requestUrl: url,
          method: method,
          ideaDir: cfg.ideaDir || '',
          ideaName: cfg.ideaName || ''
        };

        fetch(backendUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
          .then(res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          })
          .then(data => {
            if (!data.success) console.error('打开失败:', data.message);
          })
          .catch(err => {
            console.error('请求后端服务失败:', err);
          });
      });
    }

    // 监听来自 background.js 的消息（扩展图标点击）
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.type === '__spring_ide_toggle') {
        const el = document.getElementById('__spring_ide_panel');
        if (el) {
          el.style.display = el.style.display === 'none' ? '' : 'none';
        }
      }
    });

    // 处理面板创建前缓存的请求
    if (pendingRequests) {
      pendingRequests.forEach(d => addRequestToUI(d));
      pendingRequests = null;
    }
  }

  // 等 DOM 就绪后创建面板
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createPanel);
  } else {
    createPanel();
  }
})();
