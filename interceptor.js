(function() {
    if (window.__fetchIntercepted) return;
    window.__fetchIntercepted = true;

    function getInterceptData() {
        document.dispatchEvent(new CustomEvent('__intercept_request_data'));

        const el = document.getElementById('__intercept_data');
        if (!el || !el.textContent) return null;

        try {
            const parsed = JSON.parse(el.textContent);
            return parsed.image || null;
        } catch(e) {
            return null;
        }
    }

    function base64ToBlob(dataUrl) {
        const parts = dataUrl.split(',');
        const mime = parts[0].match(/:(.*?);/)[1];
        const raw = atob(parts[1]);
        const arr = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) {
            arr[i] = raw.charCodeAt(i);
        }
        return new Blob([arr], { type: mime });
    }

    function replacePhotoInFormData(formData, imageDataUrl) {
        for (const [key] of formData.entries()) {
            if (key === 'dev_pack_form[photo_proof]') {
                const blob = base64ToBlob(imageDataUrl);
                formData.set('dev_pack_form[photo_proof]', blob, 'photo.jpg');
                console.log("✅ photo_proof blob replaced in FormData (" + blob.size + " bytes)");
                return true;
            }
        }
        return false;
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

            const imageDataUrl = getInterceptData();
            if (imageDataUrl) {
                console.log("📷 Intercept data found, attempting replacement...");

                if (options.body instanceof FormData) {
                    const replaced = replacePhotoInFormData(options.body, imageDataUrl);
                    if (!replaced) {
                        console.log("⚠️ FormData has no dev_pack_form[photo_proof] key. Keys:");
                        for (const [key] of options.body.entries()) {
                            console.log("  - " + key);
                        }
                    }
                } else {
                    console.log("⚠️ Body is not FormData, type: " + typeof options.body);
                }
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

            const imageDataUrl = getInterceptData();
            if (imageDataUrl && body instanceof FormData) {
                replacePhotoInFormData(body, imageDataUrl);
            }
        }

        return originalXHRSend.call(this, body);
    };

    console.log("🔗 Fetch/XHR interceptor installed (MAIN world, CSP bypass)");
})();
