// ==========================================
// CONFIGURATION
// ==========================================
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
// 📸 TESSERACT OCR - AI SCANNER (FREE!)
// ==========================================
let uploadedImages = [];

// Handle image upload
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

// Analyze images with Tesseract OCR (FREE - No API Key!)
async function analyzeWithGemini() {
    const btn = document.getElementById('analyze-btn');
    const originalText = btn.innerText;
    btn.innerHTML = '<span class="loading"></span> Analizando...';
    btn.disabled = true;

    try {
        let allAddresses = [];

        // Process each image
        for (let i = 0; i < uploadedImages.length; i++) {
            const file = uploadedImages[i];
            
            // Show progress
            btn.innerText = `⏳ Procesando ${i + 1}/${uploadedImages.length}...`;
            
            const result = await Tesseract.recognize(file, 'spa', {
                logger: m => console.log(m)
            });
            
            const text = result.data.text;
            
            // Extract addresses from text using regex patterns
            const addresses = extractAddressesFromText(text);
            allAddresses = allAddresses.concat(addresses);
        }

        // Remove duplicates and format
        const uniqueAddresses = [...new Set(allAddresses)];
        
        if (uniqueAddresses.length === 0) {
            throw new Error('No se encontraron direcciones válidas en las imágenes');
        }

        // Display results
        const formattedText = uniqueAddresses.join('; ');
        document.getElementById('extracted-addresses').value = formattedText;
        document.getElementById('ai-result-box').style.display = 'block';
        showSuccessMessage(`✅ Se extrajeron ${uniqueAddresses.length} dirección(es)`);

    } catch (error) {
        alert('Error al analizar: ' + error.message);
        console.error(error);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// Extract addresses from OCR text using patterns
function extractAddressesFromText(text) {
    const addresses = [];
    const lines = text.split('\n');
    
    // Patterns for Colombian addresses (Funza/Mosquera)
    const patterns = [
        /(?:Calle|Cl|Carrera|Cra|Diagonal|Dia|Transversal|Tr|Avenida|Av|Crr)\s*\d+[A-Za-z]*\s*(?:#|-)?\s*\d+\s*(?:[-–]\s*\d+)?/gi,
        /(?:Funza|Mosquera)/gi
    ];
    
    lines.forEach(line => {
        line = line.trim();
        if (line.length < 5) return;
        
        // Check if line contains address patterns
        const hasStreet = /(?:Calle|Cl|Carrera|Cra|Diagonal|Dia|Transversal|Tr|Avenida|Av|Crr)/i.test(line);
        const hasNumber = /\d/.test(line);
        const hasCity = /(?:Funza|Mosquera)/i.test(line);
        
        if (hasStreet && hasNumber) {
            // Clean and format the address
            let address = cleanAddress(line);
            
            // Add city if not present
            if (hasCity && !address.toLowerCase().includes('funza') && !address.toLowerCase().includes('mosquera')) {
                const city = line.match(/(?:Funza|Mosquera)/i)[0];
                address += `, ${city}`;
            } else if (!hasCity) {
                // Default to Funza if no city mentioned
                address += ', Funza';
            }
            
            if (address.length > 10) {
                addresses.push(address);
            }
        }
    });
    
    return addresses;
}

// Clean and standardize address format
function cleanAddress(text) {
    let addr = text;
    
    // Remove common unwanted words
    const removeWords = [
        'nombre:', 'destinatario:', 'telefono:', 'tel:', 'cel:', 
        'barrio:', 'referencia:', 'cp:', 'codigo:', 'postal:',
        'cundinamarca', 'colombia'
    ];
    
    removeWords.forEach(word => {
        const regex = new RegExp(word, 'gi');
        addr = addr.replace(regex, '');
    });
    
    // Standardize street types
    addr = addr.replace(/\bCl\b/gi, 'Calle');
    addr = addr.replace(/\bCra\b/gi, 'Carrera');
    addr = addr.replace(/\bAv\b/gi, 'Avenida');
    addr = addr.replace(/\bDia\b/gi, 'Diagonal');
    
    // Clean up extra spaces
    addr = addr.replace(/\s+/g, ' ').trim();
    
    // Remove special characters except # and -
    addr = addr.replace(/[^\w\s#\-,\.]/g, '');
    
    return addr;
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
