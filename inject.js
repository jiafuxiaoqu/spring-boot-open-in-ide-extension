// inject.js - 运行在页面主世界（MAIN world），拦截 fetch 和 XMLHttpRequest
(function () {
    if (window.__spring_ide_injected) return;
    window.__spring_ide_injected = true;

    function normalizeUrl(url) {
        try {
            return new URL(String(url), window.location.href).href;
        } catch (e) {
            return String(url);
        }
    }

    function shouldCapture(rawUrl) {
        const url = normalizeUrl(rawUrl);
        let parsed;
        try {
            parsed = new URL(url);
        } catch (e) {
            return false;
        }

        if (parsed.port === '8090' && parsed.pathname === '/__open_in_idea') return false;
        if (parsed.pathname.startsWith('/static')) return false;

        const ignorePatterns = [
            /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
            /chrome-extension:\/\//,
            /devtools:\/\//
        ];
        return !ignorePatterns.some(p => p.test(parsed.pathname));
    }

    function post(data) {
        window.postMessage({ type: '__spring_ide_request', payload: data }, '*');
    }

    function headersToObject(headers) {
        const result = {};
        if (!headers) return result;
        try {
            if (headers instanceof Headers) {
                headers.forEach((v, k) => { result[k] = v; });
            } else if (Array.isArray(headers)) {
                headers.forEach(([k, v]) => { result[k] = v; });
            } else if (typeof headers === 'object') {
                Object.assign(result, headers);
            }
        } catch (e) { }
        return result;
    }

    async function readBody(body) {
        if (body === undefined || body === null) return null;
        try {
            if (typeof body === 'string') return body;
            if (body instanceof URLSearchParams) return body.toString();
            if (body instanceof FormData) {
                const entries = {};
                body.forEach((value, key) => {
                    entries[key] = value instanceof File ? `[file: ${value.name}]` : value;
                });
                return JSON.stringify(entries);
            }
            if (body instanceof Blob) return await body.text();
            if (body instanceof ArrayBuffer) return `[ArrayBuffer ${body.byteLength} bytes]`;
            if (ArrayBuffer.isView(body)) return `[${body.constructor.name} ${body.byteLength} bytes]`;
            return JSON.stringify(body);
        } catch (e) {
            return '[unable to read request body]';
        }
    }

    async function readFetchResponse(response) {
        try {
            if (response.status === 204 || response.status === 205) return '';
            const clone = response.clone();
            const ct = (response.headers.get('content-type') || '').toLowerCase();
            if (ct.includes('text/event-stream')) {
                return '[stream response]';
            }
            const binaryTypes = ['image/', 'video/', 'audio/', 'font/', 'application/pdf', 'application/octet-stream'];
            if (binaryTypes.some(t => ct.includes(t))) {
                return `[${ct || 'binary response'}]`;
            }
            return await clone.text();
        } catch (e) {
            return '[无法读取响应体]';
        }
    }

    function readXhrResponse(xhr) {
        try {
            if (xhr.status === 204 || xhr.status === 205) return '';
            const responseType = xhr.responseType || 'text';
            if (responseType === '' || responseType === 'text') {
                const text = xhr.responseText || '';
                return  text;
            }
            if (responseType === 'json') {
                const text = JSON.stringify(xhr.response);
                return text;
            }
            return `[${responseType} response]`;
        } catch (e) {
            return '[无法读取响应体]';
        }
    }

    // 拦截 fetch
    const origFetch = window.fetch;
    window.fetch = function (...args) {
        const [input, init = {}] = args;
        const url = normalizeUrl(typeof input === 'string' ? input : (input instanceof Request ? input.url : String(input)));
        const method = (init.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase();
        const reqHeaders = {
            ...(input instanceof Request ? headersToObject(input.headers) : {}),
            ...headersToObject(init.headers)
        };
        let reqBody = null;
        if (init.body !== undefined && init.body !== null) {
            try {
                reqBody = typeof init.body === 'string' ? init.body : JSON.stringify(init.body);
            } catch (e) {
                reqBody = '[无法序列化]';
            }
        }

        let reqBodyPromise = readBody(init.body);
        if ((init.body === undefined || init.body === null) && input instanceof Request) {
            reqBodyPromise = input.clone().text().catch(() => null);
        }

        const startTime = performance.now();
        return origFetch.apply(this, args).then(async (response) => {
            if (shouldCapture(url)) {
                reqBody = await reqBodyPromise || reqBody;
                const duration = Math.round(performance.now() - startTime);
                const resHeaders = {};
                response.headers.forEach((v, k) => { resHeaders[k] = v; });
                const resBody = await readFetchResponse(response);
                post({ url, method, reqBody, reqHeaders, status: response.status, resBody, resHeaders, duration });
            }
            return response;
        }).catch(err => {
            if (shouldCapture(url)) {
                post({ url, method, reqBody, reqHeaders, status: 0, resBody: '[请求失败: ' + err.message + ']', resHeaders: {}, duration: Math.round(performance.now() - startTime) });
            }
            throw err;
        });
    };

    // 拦截 XMLHttpRequest
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;

    XMLHttpRequest.prototype.open = function (method, url) {
        this.__spring_ide = { method: (method || 'GET').toUpperCase(), url: normalizeUrl(url), headers: {}, startTime: 0 };
        return origOpen.apply(this, arguments);
    };

    XMLHttpRequest.prototype.setRequestHeader = function (name, value) {
        if (this.__spring_ide) this.__spring_ide.headers[name] = value;
        return origSetHeader.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function (body) {
        if (this.__spring_ide) {
            const info = this.__spring_ide;
            info.startTime = performance.now();
            let reqBody = null;
            if (body !== undefined && body !== null) {
                try {
                    reqBody = typeof body === 'string' ? body : JSON.stringify(body);
                } catch (e) {
                    reqBody = '[无法序列化]';
                }
            }
            info.reqBody = reqBody;
            info.reqBodyPromise = readBody(body);
            this.addEventListener('load', async function () {
                if (!shouldCapture(info.url)) return;
                info.reqBody = await info.reqBodyPromise || info.reqBody;
                const duration = Math.round(performance.now() - info.startTime);
                const resBody = readXhrResponse(this);
                const resHeaders = {};
                try { this.getAllResponseHeaders().trim().split(/\r?\n/).forEach(l => { const [k, ...v] = l.split(': '); if (k) resHeaders[k] = v.join(': '); }); } catch (e) { }
                post({ url: info.url, method: info.method, reqBody: info.reqBody, reqHeaders: info.headers, status: this.status, resBody, resHeaders, duration });
            });
            this.addEventListener('error', function () {
                if (!shouldCapture(info.url)) return;
                post({ url: info.url, method: info.method, reqBody: info.reqBody, reqHeaders: info.headers, status: 0, resBody: '[请求失败]', resHeaders: {}, duration: Math.round(performance.now() - info.startTime) });
            });
        }
        return origSend.apply(this, arguments);
    };
})();
