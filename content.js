// GitHub Education Upload Bypass Content Script

console.log("🚀 GitHub Upload Bypasser Loaded");

// ==================== PHOTO INTERCEPT FEATURE ====================

let interceptImageData = null;

chrome.storage.local.get(['interceptImageData'], (result) => {
    if (result.interceptImageData) {
        interceptImageData = result.interceptImageData;
        console.log("📷 Intercept image loaded from storage");
        injectFetchInterceptor();
    }
});

function injectFetchInterceptor() {
    if (document.getElementById('fetch-interceptor-script')) return;

    const script = document.createElement('script');
    script.id = 'fetch-interceptor-script';
    script.textContent = `
        (function() {
            if (window.__fetchIntercepted) return;
            window.__fetchIntercepted = true;

            const originalFetch = window.fetch;
            window.fetch = async function(...args) {
                let [url, options] = args;

                if (url && typeof url === 'string' &&
                    url.includes('developer_pack_applications') &&
                    options && options.method && options.method.toUpperCase() === 'POST' &&
                    options.body) {

                    const storedData = window.__interceptImageData;
                    if (storedData) {
                        console.log("📷 Intercepting submission — replacing photo_proof");

                        if (options.body instanceof FormData) {
                            const formData = options.body;
                            if (formData.has('dev_pack_form[photo_proof]')) {
                                formData.set('dev_pack_form[photo_proof]', storedData);
                                console.log("✅ photo_proof replaced in FormData");
                            }
                        } else if (typeof options.body === 'string') {
                            try {
                                const params = new URLSearchParams(options.body);
                                if (params.has('dev_pack_form[photo_proof]')) {
                                    params.set('dev_pack_form[photo_proof]', storedData);
                                    options = { ...options, body: params.toString() };
                                    args = [url, options];
                                    console.log("✅ photo_proof replaced in URL-encoded body");
                                }
                            } catch(e) {}
                        }
                    }
                }

                return originalFetch.apply(this, args);
            };

            const originalXHR = XMLHttpRequest.prototype.send;
            XMLHttpRequest.prototype.send = function(body) {
                if (this.__interceptUrl &&
                    this.__interceptUrl.includes('developer_pack_applications') &&
                    body && window.__interceptImageData) {

                    if (body instanceof FormData && body.has('dev_pack_form[photo_proof]')) {
                        body.set('dev_pack_form[photo_proof]', window.__interceptImageData);
                        console.log("✅ photo_proof replaced in XHR FormData");
                    } else if (typeof body === 'string') {
                        try {
                            const params = new URLSearchParams(body);
                            if (params.has('dev_pack_form[photo_proof]')) {
                                params.set('dev_pack_form[photo_proof]', window.__interceptImageData);
                                body = params.toString();
                                console.log("✅ photo_proof replaced in XHR body");
                            }
                        } catch(e) {}
                    }
                }
                return originalXHR.call(this, body);
            };

            const originalOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function(method, url, ...rest) {
                this.__interceptUrl = url;
                return originalOpen.call(this, method, url, ...rest);
            };

            console.log("🔗 Fetch/XHR interceptor installed");
        })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
}

function updateInterceptData(imageData) {
    interceptImageData = imageData;
    injectFetchInterceptor();

    const updateScript = document.createElement('script');
    updateScript.textContent = \`window.__interceptImageData = \${JSON.stringify(imageData)};\`;
    (document.head || document.documentElement).appendChild(updateScript);
    updateScript.remove();
    console.log("📷 Intercept data updated in page context");
}

function clearInterceptData() {
    interceptImageData = null;
    const clearScript = document.createElement('script');
    clearScript.textContent = 'window.__interceptImageData = null;';
    (document.head || document.documentElement).appendChild(clearScript);
    clearScript.remove();
    console.log("📷 Intercept data cleared");
}

if (interceptImageData) {
    updateInterceptData(interceptImageData);
}

// ==================== UPLOAD BYPASS FEATURE ====================

function enableUpload() {
    // 1. Disable the "Camera Required" flag
    const cameraInput = document.getElementById('dev_pack_form_camera_required');
    if (cameraInput) {
        console.log("Found camera requirement input. Setting to false.");
        cameraInput.value = 'false';
    }

    // 2. Check if we are on the proof page (look for camera container or proof input)
    // The camera container usually has class 'js-upload-proof-container' or similar
    const evidenceContainer = document.querySelector('.js-upload-proof-container') || document.querySelector('.Overlay-body');

    if (!evidenceContainer) {
        // Not on proof page yet
        return;
    }

    // 3. Inject our own Upload UI if it's not there
    if (document.getElementById('bypass-upload-ui')) {
        return; // Already injected
    }

    console.log("Injecting Upload UI...");

    const box = document.createElement('div');
    box.id = 'bypass-upload-ui';
    box.style.cssText = `
        border: 2px dashed #2ea44f;
        padding: 20px;
        margin: 20px 0;
        text-align: center;
        background: #f6f8fa;
        border-radius: 6px;
    `;

    box.innerHTML = `
        <h3 style="margin-top:0; color: #2ea44f;">📸 Upload Image Bypass</h3>
        <p>The camera requirement has been disabled.</p>
        <input type="file" id="bypass-file" accept="image/*" style="display: block; margin: 10px auto;">
        <div id="bypass-status">Waiting for file...</div>
    `;

    // Insert before the webcam container or at top of body
    evidenceContainer.prepend(box);

    // 4. Wire up the input
    document.getElementById('bypass-file').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const status = document.getElementById('bypass-status');
        status.innerText = "Processing...";

        const reader = new FileReader();
        reader.onload = function (evt) {
            const base64 = evt.target.result;

            // Populate the hidden photo_proof field
            let proofInput = document.querySelector('input[name="photo_proof"]');
            if (!proofInput) {
                // If it doesn't exist (because React didn't render it), create it
                proofInput = document.createElement('input');
                proofInput.type = 'hidden';
                proofInput.name = 'photo_proof';
                // Find the form
                const form = document.querySelector('form') || document.body;
                form.appendChild(proofInput);
            }
            proofInput.value = base64; // Or JSON.stringify wrapper if needed (usually base64 for this form)

            status.innerText = "✅ Ready! You can submit now.";
            status.style.color = "green";

            // Enable submit buttons
            document.querySelectorAll('button[type="submit"], .btn-primary').forEach(btn => {
                btn.disabled = false;
                btn.classList.remove('disabled');
            });
        };
        reader.readAsDataURL(file);
    });
}

// ==================== ADDRESS FILL FEATURE ====================

function extractNameFromPage() {
    // Get name from settings header: <h1 id="settings-header"><a>NAME (username)</a></h1>
    const headerLink = document.querySelector('#settings-header a');
    if (!headerLink) {
        console.warn("Could not find settings header");
        return null;
    }
    
    // Get text content and clean it up
    let fullText = headerLink.textContent.trim();
    
    // Remove the username part in parentheses, e.g., "(gitcoladev)"
    fullText = fullText.replace(/\s*\([^)]+\)\s*/g, '').trim();
    
    // Split into words
    const words = fullText.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length === 0) {
        return null;
    }
    
    // First word is first name, rest is last name
    const firstName = words[0];
    const lastName = words.slice(1).join(' ') || '';
    
    console.log(`📛 Extracted name: "${firstName}" "${lastName}"`);
    
    return { firstName, lastName };
}

function fillBillingAddress(address) {
    console.log("📍 Filling billing address:", address);

    // Helper to set input value and trigger events
    function setInputValue(selector, value) {
        const input = document.querySelector(selector);
        if (input) {
            input.value = value;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Set ${selector} to: ${value}`);
            return true;
        }
        console.warn(`Input not found: ${selector}`);
        return false;
    }

    // Helper to set select value
    function setSelectValue(selector, value) {
        const select = document.querySelector(selector);
        if (select) {
            select.value = value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`Set ${selector} to: ${value}`);
            return true;
        }
        console.warn(`Select not found: ${selector}`);
        return false;
    }

    // Extract and fill name from page
    const name = extractNameFromPage();
    if (name) {
        // First Name
        setInputValue('#billing_contact_first_name', name.firstName) ||
        setInputValue('input[name="billing_contact[first_name]"]', name.firstName);
        
        // Last Name
        setInputValue('#billing_contact_last_name', name.lastName) ||
        setInputValue('input[name="billing_contact[last_name]"]', name.lastName);
    }

    // 1. Address line
    setInputValue('#billing_contact_address1', address.address_line) ||
    setInputValue('input[name="billing_contact[address1]"]', address.address_line);

    // 2. City
    setInputValue('#billing_contact_city', address.city) ||
    setInputValue('input[name="billing_contact[city]"]', address.city);

    // 3. Country - select Indonesia
    setSelectValue('#billing_contact_country_code', 'ID') ||
    setSelectValue('select[name="billing_contact[country_code]"]', 'ID');

    // 4. State/Province/Region
    setInputValue('#region_region', address.state_province) ||
    setInputValue('input[name="billing_contact[region]"]', address.state_province);

    // 5. Postal code
    setInputValue('#billing_contact_postal_code', address.postal_code) ||
    setInputValue('input[name="billing_contact[postal_code]"]', address.postal_code);

    console.log("✅ Address fill complete");
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'fillAddress' && message.address) {
        fillBillingAddress(message.address);
        sendResponse({ success: true });
    } else if (message.action === 'setIntercept' && message.imageData) {
        updateInterceptData(message.imageData);
        sendResponse({ success: true });
    } else if (message.action === 'clearIntercept') {
        clearInterceptData();
        sendResponse({ success: true });
    }
    return true;
});

// ==================== INITIALIZATION ====================

// Run periodically to handle dynamic page changes (React routing)
setInterval(enableUpload, 1000);
enableUpload();
