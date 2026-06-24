// ==========================================
// CONFIGURATION
// ==========================================
const GEMINI_API_KEY = 'AQ.Ab8RN6KvwSyB0lGZH3yDZROGD_VkrIUhEntz9qTYBHElxnqimw'; // Your Gemini API Key
const GEMINI_MODEL = 'gemini-1.5-flash';
const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEzZWNmZjAwZWNiYTQ4YjE5MTQ3MGZhZTFhZGMyY2E5IiwiaCI6Im11cm11cjY0In0='; // OpenRouteService API Key

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = async function() {
    const savedCode = localStorage.getItem('userCode');
    if (savedCode) {
        document.getElementById('gate-title').innerText = "🔐 Ingresa tu código";
        document.getElementById('gate-btn').innerText = "Desbloquear";
    }

    // Camera setup removed since you don't want the scanner option

    // Add stagger animation to sections
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.1}s`;
    });
}

// ==========================================
// GATE & UI FUNCTIONS
// ==========================================
function handleGate() {
    const input = document.getElementById('gate-input').value;
    const savedCode = localStorage.getItem('userCode');
    if (!savedCode) {
        if (input.length === 4) { 
            localStorage.setItem('userCode', input); 
            showSuccessMessage('✅ Código creado exitosamente');
            setTimeout(unlockApp, 800);
        } else {
            alert("El código debe tener 4 dígitos.");
        }
    } else {
        if (input === savedCode) {
            showSuccessMessage('✅ Bienvenido de vuelta');
            setTimeout(unlockApp, 800);
        } else {
            alert("Código incorrecto.");
        }
    }
}

function showSuccessMessage(message) {
    const msg = document.createElement('div');
    msg.className = 'success-message';
    msg.innerText = message;
    const gateSection = document.getElementById('gate-section');
    if (gateSection && gateSection.parentNode) {
        gateSection.parentNode.insertBefore(msg, gateSection.nextSibling);
    }
    setTimeout(() => msg.remove(), 2000);
}

function unlockApp() {
    document.getElementById('gate-section').style.display = 'none';
    document.getElementById('main-app').style.display = 'block';
    
    const sections = document.querySelectorAll('#main-app section');
    sections.forEach((section, index) => {
        section.style.animationDelay = `${index * 0.1}s`;
    });
    
    updateDropdown('pickup');
    updateDropdown('final');
}

// ==========================================
// LOCATION & ADDRESS FUNCTIONS
// ==========================================
function saveNewLocation(type) {
    const input = document.getElementById(type === 'pickup' ? 'new-pickup' : 'new-final');
    if (!input.value) {
        alert('Por favor ingresa una dirección');
        return;
    }
    let list = JSON.parse(localStorage.getItem(type + 'List') || "[]");
    list.push(input.value);
    localStorage.setItem(type + 'List', JSON.stringify(list));
    updateDropdown(type);
    input.value = "";
    showSuccessMessage('✅ Dirección guardada');
}

function updateDropdown(type) {
    const select = document.getElementById(type === 'pickup' ? 'pickup-address' : 'final-address');
    const list = JSON.parse(localStorage.getItem(type + 'List') || "[]");
    if (list.length === 0) {
        select.innerHTML = '<option value="">Sin direcciones guardadas</option>';
    } else {
        select.innerHTML = list.map((addr, i) => `<option value="${addr}">${i + 1}. ${addr}</option>`).join('');
    }
}

function addBulkAddresses() {
    const textarea = document.getElementById('bulk-addresses');
    if(textarea.value.trim() === "") {
        alert('Por favor ingresa al menos una dirección');
        return;
    }
    const addresses = textarea.value.split(';');
    let count = 0;
    addresses.forEach(addr => { 
        if (addr.trim() !== "") {
            addStopToList(addr.trim());
            count++;
        }
    });
    textarea.value = "";
    showSuccessMessage(`✅ ${count} dirección(es) agregada(s)`);
}

function addManualAddress() {
    const input = document.getElementById('manual-address');
    if (input.value.trim() !== "") { 
        addStopToList(input.value.trim()); 
        input.value = "";
        showSuccessMessage('✅ Dirección agregada');
    }
}

function addStopToList(text) {
    const div = document.createElement('div');
    div.className = 'stop-card';
    div.innerHTML = `
        <input type="text" value="${text}" class="package-address" readonly>
        <button class="btn-red" onclick="this.parentElement.remove()">✕ Eliminar</button>
    `;
    const listContainer = document.getElementById('scanned-list');
    if (listContainer) listContainer.appendChild(div);
}

// ==========================================
// ROUTE OPTIMIZATION
// ==========================================
async function geocodeAddress(address) {
    const response = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${API_KEY}&text=${encodeURIComponent(address + ', Colombia')}`);
    const data = await response.json();
    if (data.features && data.features.length > 0) return data.features[0].geometry.coordinates;
    throw new Error(`No se encontró: ${address}`);
}

async function calculateRoute() {
    const vehicle = document.getElementById('vehicle').value;
    const addresses = Array.from(document.querySelectorAll('.package-address')).map(i => i.value);
    const pickup = document.getElementById('pickup-address').value;
    const final = document.getElementById('final-address').value;

    if(!pickup || addresses.length === 0 || !final) { 
        alert("⚠️ Por favor completa todos los campos requeridos"); 
        return; 
    }

    try {
        // FIXED: Select the correct button instead of the first .btn-green
        const btn = document.querySelector('button[onclick="calculateRoute()"]');
        const originalText = btn.innerText;
        btn.innerHTML = '<span class="loading"></span> Calculando...';
        btn.disabled = true;

        const coords = [];
        for (const text of [pickup, ...addresses, final]) coords.push(await geocodeAddress(text));

        const body = {
            jobs: addresses.map((addr, i) => ({ id: i + 1, location: coords[i + 1] })),
            vehicles: [{ id: 1, profile: vehicle, start: coords[0], end: coords[coords.length - 1] }]
        };

        const res = await fetch('https://api.openrouteservice.org/optimization', {
            method: 'POST',
            headers: { 'Authorization': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const optData = await res.json();

        if (!optData.routes || optData.routes.length === 0) throw new Error("No se pudo calcular la ruta.");

        const sorted = optData.routes[0].steps.map(s => s.type === 'job' ? addresses[s.id - 1] : (s.type === 'start' ? pickup : final));
        await displayRoute(sorted); // Added await because displayRoute is now async
        
        btn.innerText = originalText;
        btn.disabled = false;
        showSuccessMessage('✅ Ruta optimizada exitosamente');
        
        document.getElementById('route-results').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } catch(e) { 
        alert("Error: " + e.message); 
        const btn = document.querySelector('button[onclick="calculateRoute()"]');
        if(btn) { btn.innerText = "🎯 Optimizar Ruta"; btn.disabled = false; }
    }
}

async function displayRoute(stops) {
    const container = document.getElementById('optimized-stops');
    container.innerHTML = "";
    document.getElementById('route-results').style.display = "block";

    const distances = [];
    for (let i = 0; i < stops.length - 1; i++) {
        try {
            const dist = await calculateDistance(stops[i], stops[i + 1]);
            distances.push(dist);
        } catch (e) {
            distances.push('N/A');
        }
    }

    for (let i = 0; i < stops.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 300)); 
        
        const step = document.createElement('div');
        step.className = 'route-step map-icon';
        step.style.animationDelay = `${i * 0.3}s`;
        
        const distanceBadge = i < distances.length && distances[i] !== 'N/A' 
            ? `<span class="distance-badge">📍 ${distances[i]} km</span>` 
            : '';
        
        step.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <span>
                    <strong>${i === 0 ? '🏁' : i === stops.length - 1 ? '🏆' : '📦'} ${i + 1}.</strong> 
                    ${stops[i]}
                    ${distanceBadge}
                </span>
                <button onclick="navigateTo('${stops[i]}')" class="btn-blue" style="padding: 5px 10px; font-size: 0.9em;">
                    🗺️ Ir
                </button>
            </div>
        `;
        container.appendChild(step);
    }
}

async function calculateDistance(from, to) {
    try {
        const [fromCoords, toCoords] = await Promise.all([
            geocodeAddress(from),
            geocodeAddress(to)
        ]);

        const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${fromCoords[0]},${fromCoords[1]}&end=${toCoords[0]},${toCoords[1]}`
        );
        
        const data = await response.json();
        const distanceInMeters = data.features[0].properties.summary.distance;
        return (distanceInMeters / 1000).toFixed(1); 
    } catch (e) {
        console.error('Error calculating distance:', e);
        return 'N/A';
    }
}

function navigateTo(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Colombia')}`;
    window.open(url, '_blank');
}

// ==========================================
// GEMINI AI SCANNER FUNCTIONS
// ==========================================
let uploadedImages = [];

const imageInput = document.getElementById('image-input');
if (imageInput) {
    imageInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        uploadedImages = [...uploadedImages, ...files];
        
        document.getElementById('file-count').innerText = `${uploadedImages.length} fotos seleccionadas`;
        document.getElementById('analyze-btn').disabled = uploadedImages.length === 0;
        
        const previewContainer = document.getElementById('preview-container');
