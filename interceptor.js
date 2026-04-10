(function() {
    if (window.__fetchIntercepted) return;
    window.__fetchIntercepted = true;

    function getInterceptData() {
        return new Promise((resolve) => {
            const responseEl = document.getElementById('__intercept_response');
            if (!responseEl) { resolve(null); return; }
            responseEl.textContent = '';
            document.dispatchEvent(new CustomEvent('__intercept_request'));

            setTimeout(() => {
                const data = responseEl.textContent;
                resolve(data || null);
            }, 50);
        });
    }

    function replacePhotoProof(body, imageData) {
        if (body instanceof FormData) {
            for (const [key] of body.entries()) {
                if (key === 'dev_pack_form[photo_proof]') {
                    const byteString = atob(imageData.split(',')[1]);
                    const mimeType = imageData.split(',')[0].split(':')[1].split(';')[0];
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }
                    const blob = new Blob([ab], { type: mimeType });
                    body.set('dev_pack_form[photo_proof]', blob, 'photo.jpg');
                    console.log("✅ photo_proof blob replaced in FormData");
                    return body;
                }
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
            const rawData = await getInterceptData();
            if (rawData) {
                try {
                    const parsed = JSON.parse(rawData);
                    const imageData = parsed.image;
                    if (imageData) {
                        console.log("📷 Intercepting fetch POST to developer_pack_applications");
                        options.body = replacePhotoProof(options.body, imageData);
                    }
                } catch(e) {
                    console.warn("Intercept parse error:", e);
                }
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
        const self = this;
        const isTarget = self.__interceptUrl && self.__interceptUrl.includes('developer_pack_applications');
        const isPost = self.__interceptMethod && self.__interceptMethod.toUpperCase() === 'POST';

        if (isTarget && isPost && body) {
            getInterceptData().then((rawData) => {
                if (rawData) {
                    try {
                        const parsed = JSON.parse(rawData);
                        const imageData = parsed.image;
                        if (imageData) {
                            console.log("📷 Intercepting XHR POST to developer_pack_applications");
                            body = replacePhotoProof(body, imageData);
                        }
                    } catch(e) {
                        console.warn("Intercept XHR parse error:", e);
                    }
                }
                originalXHRSend.call(self, body);
            });
            return;
        }

        return originalXHRSend.call(this, body);
    };

    console.log("🔗 Fetch/XHR interceptor installed (external script, event bridge)");
})();
