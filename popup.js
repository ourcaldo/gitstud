// Popup script for GitHub Education Helper

const COUNTRY_FLAGS = {
    'ID': '🇮🇩', 'US': '🇺🇸', 'GB': '🇬🇧', 'JP': '🇯🇵', 'SG': '🇸🇬',
    'MY': '🇲🇾', 'AU': '🇦🇺', 'DE': '🇩🇪', 'FR': '🇫🇷', 'NL': '🇳🇱',
    'IN': '🇮🇳', 'KR': '🇰🇷', 'BR': '🇧🇷', 'CA': '🇨🇦', 'TH': '🇹🇭',
    'VN': '🇻🇳', 'PH': '🇵🇭', 'RU': '🇷🇺', 'CN': '🇨🇳', 'HK': '🇭🇰',
};

document.addEventListener('DOMContentLoaded', async () => {
    const proxyToggle = document.getElementById('proxyToggle');
    const spoofToggle = document.getElementById('spoofToggle');
    const proxyStatus = document.getElementById('proxyStatus');
    const spoofStatus = document.getElementById('spoofStatus');
    const proxyInfo = document.getElementById('proxyInfo');
    const spoofInfo = document.getElementById('spoofInfo');
    const spoofDetails = document.getElementById('spoofDetails');
    const generateAddressBtn = document.getElementById('generateAddress');
    const addressStatus = document.getElementById('addressStatus');
    const addressPreview = document.getElementById('addressPreview');
    const addressDetails = document.getElementById('addressDetails');
    const refreshProxyBtn = document.getElementById('refreshProxy');
    const citySelect = document.getElementById('citySelect');
    const cityStatus = document.getElementById('cityStatus');
    const ipBanner = document.getElementById('ipBanner');
    const ipFlag = document.getElementById('ipFlag');
    const ipAddress = document.getElementById('ipAddress');
    const ipLocation = document.getElementById('ipLocation');
    const ipBadge = document.getElementById('ipBadge');
    const ipRefreshBtn = document.getElementById('ipRefreshBtn');

    async function checkIP() {
        ipBanner.className = 'ip-banner checking';
        ipFlag.textContent = '🌐';
        ipAddress.textContent = 'Checking IP...';
        ipLocation.textContent = '';
        ipBadge.style.display = 'none';
        ipRefreshBtn.classList.add('spinning');

        try {
            const response = await chrome.runtime.sendMessage({ action: 'checkIP' });
            ipRefreshBtn.classList.remove('spinning');

            if (response.success) {
                const settings = await chrome.storage.local.get(['proxyEnabled']);
                const isProxied = settings.proxyEnabled;
                const isIndonesia = response.countryCode === 'ID';
                const isProtected = isProxied && isIndonesia;

                ipFlag.textContent = COUNTRY_FLAGS[response.countryCode] || '🏳️';
                ipAddress.textContent = response.ip;
                ipLocation.textContent = `${response.city}, ${response.country}`;

                ipBadge.style.display = 'flex';
                if (isProtected) {
                    ipBanner.className = 'ip-banner protected';
                    ipBadge.className = 'ip-badge protected';
                    ipBadge.textContent = '🛡️ PROTECTED';
                } else if (isProxied && !isIndonesia) {
                    ipBanner.className = 'ip-banner unprotected';
                    ipBadge.className = 'ip-badge unprotected';
                    ipBadge.textContent = '⚠️ PROXY ERROR';
                } else {
                    ipBanner.className = 'ip-banner unprotected';
                    ipBadge.className = 'ip-badge unprotected';
                    ipBadge.textContent = '⚠️ EXPOSED';
                }
            } else {
                ipAddress.textContent = 'Failed to check IP';
                ipBanner.className = 'ip-banner checking';
            }
        } catch (error) {
            ipRefreshBtn.classList.remove('spinning');
            ipAddress.textContent = 'Error checking IP';
            ipBanner.className = 'ip-banner checking';
        }
    }

    ipRefreshBtn.addEventListener('click', checkIP);
    checkIP();

    const settings = await chrome.storage.local.get(['proxyEnabled', 'spoofEnabled', 'proxyData', 'spoofData', 'lastAddress', 'selectedCity']);
    
    proxyToggle.checked = settings.proxyEnabled || false;
    spoofToggle.checked = settings.spoofEnabled || false;
    
    if (settings.selectedCity) {
        citySelect.value = settings.selectedCity;
    }
    updateCityStatus(settings.selectedCity || 'kediri');

    updateProxyUI(settings.proxyEnabled, settings.proxyData);
    updateSpoofUI(settings.spoofEnabled, settings.spoofData);
    
    if (settings.lastAddress) {
        showAddressPreview(settings.lastAddress);
    }

    citySelect.addEventListener('change', async () => {
        const newCity = citySelect.value;
        citySelect.disabled = true;
        cityStatus.textContent = 'Switching to ' + citySelect.options[citySelect.selectedIndex].text + '...';
        cityStatus.className = 'status';

        try {
            const response = await chrome.runtime.sendMessage({ action: 'changeCity', city: newCity });

            if (response.success) {
                updateCityStatus(newCity);
                if (response.proxyData) {
                    updateProxyUI(true, response.proxyData);
                }
                if (response.spoofData) {
                    updateSpoofUI(true, response.spoofData);
                }
                cityStatus.textContent = response.cityLabel + ' — Active';
                cityStatus.className = 'status active';
                setTimeout(checkIP, 1000);
            } else {
                cityStatus.textContent = 'Error: ' + response.error;
                cityStatus.className = 'status error';
            }
        } catch (error) {
            cityStatus.textContent = 'Error: ' + error.message;
            cityStatus.className = 'status error';
        }

        citySelect.disabled = false;
    });

    function updateCityStatus(city) {
        const labels = {
            kediri: 'Kediri, East Java',
            nganjuk: 'Nganjuk, East Java',
            ponorogo: 'Ponorogo, East Java',
            probolinggo: 'Probolinggo, East Java',
            madiun: 'Madiun, East Java'
        };
        cityStatus.textContent = labels[city] || city;
    }

    // Proxy toggle handler
    proxyToggle.addEventListener('change', async () => {
        const enabled = proxyToggle.checked;
        
        if (enabled) {
            proxyStatus.textContent = 'Connecting...';
            proxyStatus.className = 'status';
            
            // Request proxy from background script
            const response = await chrome.runtime.sendMessage({ action: 'enableProxy' });
            
            if (response.success) {
                await chrome.storage.local.set({ proxyEnabled: true, proxyData: response.proxyData });
                updateProxyUI(true, response.proxyData);
                checkIP();
            } else {
                proxyToggle.checked = false;
                proxyStatus.textContent = 'Error: ' + response.error;
                proxyStatus.className = 'status error';
            }
        } else {
            await chrome.runtime.sendMessage({ action: 'disableProxy' });
            await chrome.storage.local.set({ proxyEnabled: false });
            updateProxyUI(false, null);
            checkIP();
        }
    });

    // Spoofing toggle handler
    spoofToggle.addEventListener('change', async () => {
        const enabled = spoofToggle.checked;
        
        if (enabled) {
            spoofStatus.textContent = 'Activating...';
            spoofStatus.className = 'status';
            
            const response = await chrome.runtime.sendMessage({ action: 'enableSpoofing' });
            
            if (response.success) {
                await chrome.storage.local.set({ spoofEnabled: true, spoofData: response.spoofData });
                updateSpoofUI(true, response.spoofData);
            } else {
                spoofToggle.checked = false;
                spoofStatus.textContent = 'Error: ' + response.error;
                spoofStatus.className = 'status error';
            }
        } else {
            await chrome.runtime.sendMessage({ action: 'disableSpoofing' });
            await chrome.storage.local.set({ spoofEnabled: false });
            updateSpoofUI(false, null);
        }
    });

    // Generate address handler
    generateAddressBtn.addEventListener('click', async () => {
        generateAddressBtn.disabled = true;
        addressStatus.textContent = 'Generating address...';
        addressStatus.className = 'status';
        
        try {
            const response = await chrome.runtime.sendMessage({ action: 'generateAddress' });
            
            if (response.success) {
                await chrome.storage.local.set({ lastAddress: response.address });
                showAddressPreview(response.address);
                
                // Send to content script to fill the form
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    await chrome.tabs.sendMessage(tab.id, { 
                        action: 'fillAddress', 
                        address: response.address 
                    });
                    addressStatus.textContent = '✅ Address filled!';
                    addressStatus.className = 'status active';
                }
            } else {
                addressStatus.textContent = 'Error: ' + response.error;
                addressStatus.className = 'status error';
            }
        } catch (error) {
            addressStatus.textContent = 'Error: ' + error.message;
            addressStatus.className = 'status error';
        }
        
        generateAddressBtn.disabled = false;
    });

    // Refresh proxy handler
    refreshProxyBtn.addEventListener('click', async () => {
        refreshProxyBtn.disabled = true;
        proxyStatus.textContent = 'Refreshing proxy...';
        
        const response = await chrome.runtime.sendMessage({ action: 'refreshProxy' });
        
        if (response.success) {
            await chrome.storage.local.set({ proxyData: response.proxyData });
            updateProxyUI(proxyToggle.checked, response.proxyData);
        } else {
            proxyStatus.textContent = 'Error: ' + response.error;
            proxyStatus.className = 'status error';
        }
        
        refreshProxyBtn.disabled = false;
    });

    function updateProxyUI(enabled, proxyData) {
        if (enabled && proxyData) {
            proxyStatus.textContent = '✅ Connected';
            proxyStatus.className = 'status active';
            proxyInfo.style.display = 'block';
            proxyInfo.textContent = `Proxy: ${proxyData.host}:${proxyData.port}`;
        } else {
            proxyStatus.textContent = 'Disabled';
            proxyStatus.className = 'status';
            proxyInfo.style.display = 'none';
        }
    }

    function updateSpoofUI(enabled, spoofData) {
        if (enabled && spoofData) {
            spoofStatus.textContent = '✅ Active';
            spoofStatus.className = 'status active';
            spoofInfo.style.display = 'block';
            spoofDetails.innerHTML = `
                <strong>Timezone:</strong> ${spoofData.timezone}<br>
                <strong>Language:</strong> ${spoofData.language}<br>
                <strong>Location:</strong> ${spoofData.city}, ${spoofData.country}
            `;
        } else {
            spoofStatus.textContent = 'Disabled';
            spoofStatus.className = 'status';
            spoofInfo.style.display = 'none';
        }
    }

    function showAddressPreview(address) {
        addressPreview.style.display = 'block';
        addressDetails.innerHTML = `
            <strong>Address:</strong> ${address.address_line}<br>
            <strong>City:</strong> ${address.city}<br>
            <strong>State:</strong> ${address.state_province}<br>
            <strong>Postal:</strong> ${address.postal_code}<br>
            <strong>Country:</strong> ${address.country}
        `;
    }
});
