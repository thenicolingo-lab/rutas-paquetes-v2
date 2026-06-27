// ==========================================
// CONFIGURATION
// ==========================================
const GROQ_API_KEY = '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';
const API_KEY = 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjEzZWNmZjAwZWNiYTQ4YjE5MTQ3MGZhZTFhZGMyY2E5IiwiaCI6Im11cm11cjY0In0=';

// ==========================================
// INITIALIZATION
// ==========================================
window.onload = async function() {
    const savedCode = localStorage.getItem('userCode');
    if (savedCode) {
        document.getElementById('gate-title').innerText = "🔐 Ingresa tu código";
        document.getElementById('gate-btn').innerText = "Desbloquear";
    }
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
            setTimeout(() => {
                showSetupScreen();
            }, 800);
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

function showSetupScreen() {
    document.getElementById('gate-section').style.display = 'none';
    document.getElementById('setup-section').style.display = 'block';
}

function completeSetup() {
    const pickupAddress = document.getElementById('setup-pickup').value.trim();
    const finalType = document.querySelector('input[name="final-type"]:checked').value;
    let finalAddress = '';
    
    if (finalType === 'home') {
        finalAddress = 'Casa';
    } else {
        finalAddress = document.getElementById('final-destination-custom').value.trim();
    }
    
    if (!pickupAddress) {
        alert('⚠️ Por favor ingresa la dirección del punto de partida');
        return;
    }
    
    if (finalType === 'other' && !finalAddress) {
        alert('⚠️ Por favor especifica la dirección del punto final');
        return;
    }
    
    // Save to localStorage
    let pickupList = JSON.parse(localStorage.getItem('pickupList') || '[]');
    if (!pickupList.includes(pickupAddress)) {
        pickupList.push(pickupAddress);
        localStorage.setItem('pickupList', JSON.stringify(pickupList));
    }
    
    let finalList = JSON.parse(localStorage.getItem('finalList') || '[]');
    if (!finalList.includes(finalAddress)) {
        finalList.push(finalAddress);
        localStorage.setItem('finalList', JSON.stringify(finalList));
    }
    
    showSuccessMessage('✅ Configuración guardada exitosamente');
    setTimeout(unlockApp, 1000);
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
    document.getElementById('setup-section').style.display = 'none';
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
// 📸 GROQ AI SCANNER
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
        previewContainer.innerHTML = '';
        
        uploadedImages.forEach((file) => {
            const reader = new FileReader();
            reader.onload = function(event) {
                const img = document.createElement('img');
                img.src = event.target.result;
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
    });
}

async function analyzeWithGroq() {
    if (!GROQ_API_KEY) {
        alert('⚠️ Falta la API Key de Groq.');
        return;
    }
    
    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerText;
    btn.innerHTML = '<span class="loading"></span> Analizando...';
    btn.disabled = true;

    try {
        const messages = [{
            role: "user",
            content: [
                {
                    type: "text",
                    text: `# ROLE & TASK
Actúa como un asistente de logística automatizado experto en geocodificación de Colombia. Tu tarea es analizar las imágenes de guías de envío adjuntas, limpiar las inconsistencias de texto y extraer exclusivamente la dirección estructurada (Nomenclatura urbana + Municipio).

# TARGET CITIES
- Funza
- Mosquera
*Nota: Trata "Funza" y "Mosquera" estrictamente como el municipio/ciudad de destino. Nunca los ignores, nunca los elimines y nunca los confundas con nombres de barrios.*

# DATA FILTERING RULES
- [KEEP] Solo extrae: Tipo de vía (Calle, Carrera, Diagonal, Av, Cl, Cra, etc.), las letras/números de la nomenclatura urbana y el Municipio de destino (Funza o Mosquera).
- [DELETE] Elimina por completo de la salida: Nombres de personas, teléfonos, códigos postales (C.P.), nombres de departamentos (Cundinamarca), nombres de barrios (ej: "La Cita", "La Chaguya") y referencias/descripciones de ubicación (ej: "casa esquinera", "primer piso", "local", "asadero").

# DATA STANDARDIZATION & CLEANING (ANTI-ERROR)
Si la etiqueta contiene errores de digitación o inconsistencias del usuario, corrígelos automáticamente antes de dar la salida:
1. Elimina duplicaciones de palabras clave de vías (ej: Si dice "Calle Calle 10" o "Cl Calle 10", unifícalo a "Calle 10").
2. Corrige abreviaciones confusas para que mantengan la estructura estándar: Tipo de vía + Número # Número - Número (ej: "carrera 10b#10-02").
3. Si el municipio (Funza/Mosquera) aparece pegado a otras palabras o repetido en la sección de departamento (como "FUNZA/CUNDINAMARCA"), extrae únicamente el nombre limpio del municipio separado por una coma.

# FORMATTING SPECIFICATIONS
- Entrega TODO el resultado final en una única línea de texto continuo.
- Separa cada dirección extraída utilizando únicamente un punto y coma (;).
- No agregues saludos, introducciones, viñetas, saltos de línea ni texto aclaratorio. La salida debe ser puramente de datos crudos limpios.

# OUTPUT FORMAT TARGET
Dirección 1, Municipio; Dirección 2, Municipio; Dirección 3, Municipio`
                }
            ]
        }];
        
        for (const file of uploadedImages) {
            const base64 = await imageToBase64(file);
            messages[0].content.push({
                type: "image_url",
                image_url: {
                    url: `data:${file.type};base64,${base64}`
                }
            });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'meta-llama/llama-4-scout-17b-16e-instruct',
                messages: messages,
                temperature: 0.1,
                max_tokens: 1024
            })
        });

        const data = await response.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const extractedText = data.choices[0].message.content.trim();
            document.getElementById('extracted-addresses').value = extractedText;
            document.getElementById('ai-result-box').style.display = 'block';
            showSuccessMessage('✅ Análisis completado con IA');
        } else {
            throw new Error('No se pudo procesar las imágenes');
        }

    } catch (error) {
        alert('Error al analizar: ' + error.message);
        console.error(error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

async function imageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function copyAddresses() {
    const textarea = document.getElementById('extracted-addresses');
    textarea.select();
    document.execCommand('copy');
    showSuccessMessage('📋 Direcciones copiadas');
}

function loadToRoute() {
    const addresses = document.getElementById('extracted-addresses').value;
    const addressList = addresses.split(';').map(addr => addr.trim()).filter(addr => addr);
    
    addressList.forEach(addr => {
        addStopToList(addr);
    });
    
    showSuccessMessage(`✅ ${addressList.length} direcciones cargadas`);
    document.getElementById('ai-result-box').style.display = 'none';
}

function clearAIResults() {
    document.getElementById('extracted-addresses').value = '';
    document.getElementById('ai-result-box').style.display = 'none';
    uploadedImages = [];
    document.getElementById('image-input').value = '';
    document.getElementById('file-count').innerText = '0 fotos seleccionadas';
    document.getElementById('preview-container').innerHTML = '';
    document.getElementById('analyze-btn').disabled = true;
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
        await displayRoute(sorted);
        
        btn.innerText = originalText;
        btn.disabled = false;
        showSuccessMessage('✅ Ruta optimizada exitosamente');
        
        
    } catch(e) { 
        alert("Error: " + e.message); 
        const btn = document.querySelector('button[onclick="calculateRoute()"]');
        if(btn) { btn.innerText = "🎯 Optimizar Ruta"; btn.disabled = false; }
    }
}

async function displayRoute(stops) {
    const container = document.getElementById('optimized-stops');
    const routeResults = document.getElementById('route-results');
    
    routeResults.style.display = 'none';
    routeResults.classList.remove('show');
    container.innerHTML = "";
    
    const pickup = stops[0];
    const deliveries = stops.slice(1, -1);
    const finalDest = stops[stops.length - 1];
    
    // Build timeline items
    const timelineItems = [];
    
    // 1. Pickup
    timelineItems.push({
        type: 'pickup',
        number: '🏢',
        label: 'Punto de Carga',
        address: pickup,
        index: 0
    });
    
    // 2. Deliveries
    deliveries.forEach((addr, i) => {
        timelineItems.push({
            type: 'delivery',
            number: i + 1,
            label: `Entrega #${i + 1}`,
            address: addr,
            index: i + 1
        });
    });
    
    // 3. Final destination
    timelineItems.push({
        type: 'final',
        number: '🏠',
        label: 'Destino Final',
        address: finalDest,
        index: timelineItems.length
    });
    
    // Render HTML
    const timelineHTML = `
        <div class="route-header">
            <h4>✅ Tu Ruta Optimizada</h4>
            <p>Toca cualquier tarjeta para abrir <strong>Google Maps</strong> <span class="hint-icon">📍 Toca aquí</span></p>
        </div>
        
        <div class="timeline">
            <div class="timeline-line"></div>
            ${timelineItems.map((item, i) => `
                <div class="timeline-item" style="animation-delay: ${i * 0.1}s">
                    <div class="stop-badge ${item.type}" onclick="navigateTo('${item.address.replace(/'/g, "\\'")}')">
                        ${item.number}
                    </div>
                    <div class="stop-card-new ${item.type}" onclick="navigateTo('${item.address.replace(/'/g, "\\'")}')">
                        <div class="stop-label ${item.type}">
                            <span class="emoji">${item.type === 'pickup' ? '📦' : item.type === 'delivery' ? '🚚' : '🎯'}</span>
                            <span>${item.label}</span>
                        </div>
                        <div class="stop-address">${item.address}</div>
                        <div class="stop-map-hint">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                                <circle cx="12" cy="10" r="3"></circle>
                            </svg>
                            <span>Toca para navegar</span>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="route-summary">
            <div class="summary-item">
                <span class="summary-value">${deliveries.length}</span>
                <span class="summary-label">Entregas</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">${timelineItems.length}</span>
                <span class="summary-label">Paradas Totales</span>
            </div>
            <div class="summary-item">
                <span class="summary-value">🚀</span>
                <span class="summary-label">Optimizado</span>
            </div>
        </div>
    `;
    
    container.innerHTML = timelineHTML;
    
    setTimeout(() => {
        routeResults.style.display = 'block';
        routeResults.offsetHeight;
        routeResults.classList.add('show');
        
        setTimeout(() => {
            routeResults.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start'
            });
        }, 100);
    }, 50);
}

function startVehicleAnimation() {
    const vehicleContainer = document.getElementById('vehicle-container');
    if (!vehicleContainer) return;
    
    const vehicles = [
        { emoji: '🚗', side: 'right', speed: 8000 },
        { emoji: '🚴', side: 'left', speed: 12000 }
    ];
    
    vehicles.forEach((v) => {
        const vehicle = document.createElement('div');
        vehicle.className = 'vehicle-animated';
        vehicle.textContent = v.emoji;
        
        if (v.side === 'right') {
            vehicle.style.left = 'calc(50% + 10px)';
            vehicle.style.animation = `driveDown ${v.speed}ms linear infinite`;
        } else {
            vehicle.style.left = 'calc(50% - 25px)';
            vehicle.style.animation = `driveUp ${v.speed}ms linear infinite`;
        }
        
        vehicleContainer.appendChild(vehicle);
    });
}

// Add keyframe animations
const style = document.createElement('style');
style.textContent = `
    @keyframes driveUp {
        0% { bottom: -50px; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { bottom: calc(100% + 50px); opacity: 0; }
    }
    @keyframes driveDown {
        0% { top: 80px; opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { top: calc(100% + 50px); opacity: 0; }
    }
`;
if (!document.getElementById('vehicle-animations-style')) {
    style.id = 'vehicle-animations-style';
    document.head.appendChild(style);
}

async function calculateDistance(from, to) {
    try {
        console.log(`Calculating distance: "${from}" to "${to}"`);
        
        const [fromCoords, toCoords] = await Promise.all([
            geocodeAddress(from),
            geocodeAddress(to)
        ]);

        console.log(`Coords: ${fromCoords} to ${toCoords}`);

        const response = await fetch(
            `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${API_KEY}&start=${fromCoords[0]},${fromCoords[1]}&end=${toCoords[0]},${toCoords[1]}`
        );
        
        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.features || !data.features[0] || !data.features[0].properties.summary) {
            throw new Error('Invalid response data');
        }
        
        const distanceInMeters = data.features[0].properties.summary.distance;
        const distanceInKm = (distanceInMeters / 1000).toFixed(1);
        
        console.log(`Distance calculated: ${distanceInKm} km`);
        return distanceInKm;
    } catch (e) {
        console.error('Error calculating distance:', e);
        return '0.0';
    }
}

function navigateTo(address) {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address + ', Colombia')}`;
    window.open(url, '_blank');
}

// Handle radio button change for custom destination
document.addEventListener('DOMContentLoaded', function() {
    const otherRadio = document.getElementById('final-other');
    const customInput = document.getElementById('final-destination-custom');
    
    if (otherRadio && customInput) {
        otherRadio.addEventListener('change', function() {
            customInput.style.display = this.checked ? 'block' : 'none';
        });
    }
});
