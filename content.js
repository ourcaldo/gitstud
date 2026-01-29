// GitHub Education Upload Bypass Content Script

console.log("🚀 GitHub Upload Bypasser Loaded");

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

// Run periodically to handle dynamic page changes (React routing)
setInterval(enableUpload, 1000);
enableUpload();
