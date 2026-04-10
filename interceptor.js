(function() {
    if (window.__fetchIntercepted) return;
    window.__fetchIntercepted = true;

    const PHOTO_KEY = 'dev_pack_form[photo_proof]';

    function getInterceptData() {
        document.dispatchEvent(new CustomEvent('__intercept_request_data'));

        const el = document.getElementById('__intercept_data');
        if (!el || !el.textContent) return null;

        try {
            const stored = JSON.parse(el.textContent);
            const imageDataUrl = stored.image;
            if (!imageDataUrl) return null;

            const mimeMatch = imageDataUrl.match(/^data:(image\/\w+);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
            const ext = mimeType.split('/')[1] || 'jpg';

            const replacement = JSON.stringify({
                image: imageDataUrl,
                metadata: {
                    filename: "camera." + ext,
                    type: "camera",
                    mimeType: mimeType,
                    deviceLabel: "USB2.0 HD UVC WebCam (322e:2103)"
                }
            });
            return replacement;
        } catch(e) {
            return null;
        }
    }

    function replaceInBody(body, replacementJson) {
        if (body instanceof FormData) {
            if (body.has(PHOTO_KEY)) {
                body.set(PHOTO_KEY, replacementJson);
                console.log("✅ photo_proof replaced in FormData");
                return body;
            }
            console.log("⚠️ FormData has no " + PHOTO_KEY + ". Keys:");
            for (const [key] of body.entries()) {
                console.log("  - " + key);
            }
            return body;
        }

        if (body instanceof URLSearchParams) {
            if (body.has(PHOTO_KEY)) {
                body.set(PHOTO_KEY, replacementJson);
                console.log("✅ photo_proof replaced in URLSearchParams");
                return body;
            }
            console.log("⚠️ URLSearchParams has no " + PHOTO_KEY + ". Keys:");
            for (const [key] of body.entries()) {
                console.log("  - " + key);
            }
            return body;
        }

        if (typeof body === 'string') {
            if (body.includes('dev_pack_form%5Bphoto_proof%5D') || body.includes(PHOTO_KEY)) {
                try {
                    const params = new URLSearchParams(body);
                    if (params.has(PHOTO_KEY)) {
                        params.set(PHOTO_KEY, replacementJson);
                        console.log("✅ photo_proof replaced in URL-encoded string");
                        return params.toString();
                    }
                } catch(e) {
                    console.warn("Failed to parse as URLSearchParams:", e);
                }
            }
            return body;
        }

        if (typeof body === 'object' && body !== null) {
            console.log("📦 Body is object type: " + body.constructor?.name);

            if (typeof body.has === 'function' && typeof body.set === 'function' &&
                typeof body.entries === 'function') {
                try {
                    if (body.has(PHOTO_KEY)) {
                        body.set(PHOTO_KEY, replacementJson);
                        console.log("✅ photo_proof replaced in entries-like object (" + body.constructor?.name + ")");
                        return body;
                    }
                    console.log("⚠️ Object has no " + PHOTO_KEY + ". Keys:");
                    for (const [key] of body.entries()) {
                        console.log("  - " + key);
                    }
                } catch(e) {
                    console.warn("Failed entries-based replacement:", e);
                }
            }

            try {
                const str = body.toString();
                if (str !== '[object Object]' &&
                    (str.includes('dev_pack_form%5Bphoto_proof%5D') || str.includes(PHOTO_KEY))) {
                    const params = new URLSearchParams(str);
                    if (params.has(PHOTO_KEY)) {
                        params.set(PHOTO_KEY, replacementJson);
                        console.log("✅ photo_proof replaced via toString() → URLSearchParams");
                        return params.toString();
                    }
                }
            } catch(e) {}

            console.log("⚠️ Could not replace in object. Constructor: " + body.constructor?.name);
            console.log("⚠️ Prototype chain: " + Object.getPrototypeOf(body)?.constructor?.name);
            if (typeof body.entries === 'function') {
                try {
                    for (const [key] of body.entries()) {
                        console.log("  Key: " + key);
                    }
                } catch(e) {}
            }
        }

        return body;
    }

    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
        let [resource, options] = args;

        let url = '';
        if (typeof resource === 'string') {
            url = resource;
        } else if (resource instanceof Request) {
            url = resource.url;
        }

        const isTarget = url.includes('developer_pack_applications');
        const isPost = options && options.method && options.method.toUpperCase() === 'POST';

        if (isTarget && isPost && options.body) {
            console.log("📷 Detected POST to developer_pack_applications");
            console.log("📷 Body type: " + typeof options.body + ", constructor: " + options.body?.constructor?.name);

            const rawData = getInterceptData();
            if (rawData) {
                console.log("📷 Intercept data found (" + rawData.length + " chars), replacing...");
                options = Object.assign({}, options);
                options.body = replaceInBody(options.body, rawData);
                args = [resource, options];
            } else {
                console.log("ℹ️ No intercept image loaded — passing through normally");
            }
        }

        return originalFetch.apply(this, args);
    };

    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
        this.__interceptMethod = method;
        this.__interceptUrl = url;
        return originalXHROpen.call(this, method, url, ...rest);
    };

    const originalXHRSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function(body) {
        const isTarget = this.__interceptUrl && this.__interceptUrl.includes('developer_pack_applications');
        const isPost = this.__interceptMethod && this.__interceptMethod.toUpperCase() === 'POST';

        if (isTarget && isPost && body) {
            console.log("📷 Detected XHR POST to developer_pack_applications");
            const rawData = getInterceptData();
            if (rawData) {
                body = replaceInBody(body, rawData);
            }
        }

        return originalXHRSend.call(this, body);
    };

    console.log("🔗 Fetch/XHR interceptor installed (MAIN world, CSP bypass)");
})();
