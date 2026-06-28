const API_BASE_URL = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000/api' 
  : 'https://infurnus-backend.onrender.com/api';

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => { navbar.classList.toggle('scrolled', window.scrollY > 50); });

const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const navLinks = document.getElementById('navLinks');
mobileMenuBtn.addEventListener('click', () => navLinks.classList.toggle('active'));

document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) { target.scrollIntoView({ behavior: 'smooth', block: 'start' }); navLinks.classList.remove('active'); }
    });
});

const scrollReveal = () => {
    document.querySelectorAll('.scroll-reveal').forEach(el => {
        if (el.getBoundingClientRect().top < window.innerHeight - 100) el.classList.add('visible');
    });
};
window.addEventListener('scroll', scrollReveal);
window.addEventListener('load', scrollReveal);

const bookingTabs = document.querySelectorAll('.booking-tab');
const bookingForms = document.querySelectorAll('.booking-form');
bookingTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        bookingTabs.forEach(t => t.classList.remove('active'));
        bookingForms.forEach(f => f.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    });
});

let map, directionsService, directionsRenderer;
let currentRoute = null;

function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: false,
        polylineOptions: { strokeColor: '#f59e0b', strokeWeight: 5 }
    });
    const mapElement = document.getElementById('pricingMap');
    if (mapElement) {
        map = new google.maps.Map(mapElement, {
            center: { lat: 25.5941, lng: 85.1376 },
            zoom: 7,
            mapTypeId: 'roadmap',
            styles: [
                { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
                { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
                { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#f59e0b' }] },
                { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] }
            ]
        });
        directionsRenderer.setMap(map);
    }
    initAutocomplete('fromAddress', 'from');
    initAutocomplete('toAddress', 'to');
    initAutocomplete('cabPickupInput', 'cabPickup');
    initAutocomplete('cabDropInput', 'cabDrop');
    initAutocomplete('logisticsPickupInput', 'logisticsPickup');
    initAutocomplete('logisticsDropInput', 'logisticsDrop');
}

function initAutocomplete(inputId, type) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const autocomplete = new google.maps.places.Autocomplete(input, {
        componentRestrictions: { country: 'in' },
        fields: ['formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment']
    });
    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry) {
            input.dataset.lat = place.geometry.location.lat();
            input.dataset.lng = place.geometry.location.lng();
            input.dataset.formatted = place.formatted_address;
            if (type === 'from' || type === 'to') calculatePricingRoute();
            if (type === 'cabPickup' || type === 'cabDrop') calculateCabRoute();
            if (type === 'logisticsPickup' || type === 'logisticsDrop') calculateLogisticsRoute();
        }
    });
}

function calculatePricingRoute() {
    const fromInput = document.getElementById('fromAddress');
    const toInput = document.getElementById('toAddress');
    if (!fromInput.value || !toInput.value) return;
    directionsService.route({
        origin: fromInput.value,
        destination: toInput.value,
        travelMode: google.maps.TravelMode.DRIVING
    }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(result);
            const route = result.routes[0].legs[0];
            currentRoute = route;
            const distanceKm = (route.distance.value / 1000).toFixed(1);
            document.getElementById('distanceText').textContent = distanceKm + ' km';
            document.getElementById('durationText').textContent = route.duration.text;
            updatePricing(distanceKm);
        } else {
            showToast('Could not calculate route. Please check addresses.', 'error');
        }
    });
}

function calculateCabRoute() {
    const pickup = document.getElementById('cabPickupInput');
    const drop = document.getElementById('cabDropInput');
    const routeInfo = document.getElementById('cabRouteInfo');
    if (!pickup.value || !drop.value) return;
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [pickup.value], destinations: [drop.value],
        travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC
    }, (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
            const el = response.rows[0].elements[0];
            const distanceKm = (el.distance.value / 1000).toFixed(1);
            routeInfo.classList.add('active');
            document.getElementById('cabRouteDistance').textContent = distanceKm + ' km';
            document.getElementById('cabRouteDuration').textContent = 'Estimated travel time: ' + el.duration.text;
            pickup.dataset.distance = distanceKm;
            pickup.dataset.duration = el.duration.text;
        }
    });
}

function calculateLogisticsRoute() {
    const pickup = document.getElementById('logisticsPickupInput');
    const drop = document.getElementById('logisticsDropInput');
    const routeInfo = document.getElementById('logisticsRouteInfo');
    if (!pickup.value || !drop.value) return;
    const service = new google.maps.DistanceMatrixService();
    service.getDistanceMatrix({
        origins: [pickup.value], destinations: [drop.value],
        travelMode: google.maps.TravelMode.DRIVING, unitSystem: google.maps.UnitSystem.METRIC
    }, (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
            const el = response.rows[0].elements[0];
            const distanceKm = (el.distance.value / 1000).toFixed(1);
            routeInfo.classList.add('active');
            document.getElementById('logisticsRouteDistance').textContent = distanceKm + ' km';
            document.getElementById('logisticsRouteDuration').textContent = 'Estimated travel time: ' + el.duration.text;
        }
    });
}

let currentRate = 15;
const vehicleOptions = document.querySelectorAll('.vehicle-option');
vehicleOptions.forEach(opt => {
    opt.addEventListener('click', () => {
        vehicleOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        currentRate = parseInt(opt.dataset.rate);
        document.getElementById('vehicleText').textContent = opt.dataset.name;
        if (currentRoute) {
            const distanceKm = (currentRoute.distance.value / 1000).toFixed(1);
            updatePricing(distanceKm);
        }
    });
});

function updatePricing(distanceKm) {
    const baseFare = Math.round(distanceKm * currentRate);
    document.getElementById('priceValue').textContent = 'Rs.' + baseFare.toLocaleString('en-IN');
    document.getElementById('baseFare').textContent = 'Rs.' + baseFare.toLocaleString('en-IN');
    document.getElementById('totalFare').textContent = 'Rs.' + baseFare.toLocaleString('en-IN');
}

document.getElementById('cabForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const pickupInput = document.getElementById('cabPickupInput');
    const dropInput = document.getElementById('cabDropInput');
    const data = {
        bookingType: 'cab',
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        pickupLocation: pickupInput.value,
        dropLocation: dropInput.value,
        pickupDate: formData.get('pickupDate'),
        pickupTime: formData.get('pickupTime'),
        vehicleType: formData.get('vehicleType'),
        passengers: formData.get('passengers'),
        specialRequests: formData.get('specialRequests'),
        distanceKm: pickupInput.dataset.distance || null,
        durationText: pickupInput.dataset.duration || null
    };
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showToast('Booking submitted! We will call you within 15 minutes.', 'success');
            e.target.reset();
            document.getElementById('cabRouteInfo').classList.remove('active');
            document.getElementById('formSuccess').style.display = 'block';
            setTimeout(() => { document.getElementById('formSuccess').style.display = 'none'; }, 5000);
        } else { showToast(result.error || 'Something went wrong.', 'error'); }
    } catch (error) { showToast('Network error. Please check your connection.', 'error'); }
});

document.getElementById('logisticsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        bookingType: 'logistics',
        companyName: formData.get('companyName'),
        phone: formData.get('phone'),
        pickupAddress: formData.get('pickupAddress'),
        dropAddress: formData.get('dropAddress'),
        cargoType: formData.get('cargoType'),
        vehicleRequired: formData.get('vehicleRequired'),
        cargoWeight: formData.get('cargoWeight'),
        pickupDate: formData.get('pickupDate'),
        cargoDescription: formData.get('cargoDescription')
    };
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showToast('Logistics quote request submitted! Quote within 30 minutes.', 'success');
            e.target.reset();
            document.getElementById('logisticsRouteInfo').classList.remove('active');
        } else { showToast(result.error || 'Something went wrong.', 'error'); }
    } catch (error) { showToast('Network error. Please check your connection.', 'error'); }
});

document.getElementById('rentalForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        bookingType: 'rental',
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        rentalType: formData.get('rentalType'),
        vehicleType: formData.get('vehicleType'),
        startDate: formData.get('startDate'),
        startTime: formData.get('startTime'),
        pickupLocation: formData.get('pickupLocation'),
        purpose: formData.get('purpose'),
        notes: formData.get('notes')
    };
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showToast('Rental request submitted! We will contact you shortly.', 'success');
            e.target.reset();
        } else { showToast(result.error || 'Something went wrong.', 'error'); }
    } catch (error) { showToast('Network error. Please check your connection.', 'error'); }
});

document.getElementById('driverForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
        fullName: formData.get('fullName'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        city: formData.get('city'),
        experience: formData.get('experience'),
        vehicleType: formData.get('vehicleType'),
        licenseNumber: formData.get('licenseNumber'),
        aadhaarNumber: formData.get('aadhaarNumber'),
        about: formData.get('about')
    };
    try {
        const response = await fetch(`${API_BASE_URL}/drivers`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data)
        });
        const result = await response.json();
        if (result.success) {
            showToast('Application submitted! HR will contact you within 48 hours.', 'success');
            e.target.reset();
        } else { showToast(result.error || 'Something went wrong.', 'error'); }
    } catch (error) { showToast('Network error. Please check your connection.', 'error'); }
});

document.querySelectorAll('.file-upload input').forEach(input => {
    input.addEventListener('change', function() {
        const p = this.parentElement.querySelector('p');
        if (this.files.length > 0) {
            p.innerHTML = '<strong style="color:var(--accent);">' + this.files[0].name + '</strong><br>File selected successfully';
            this.parentElement.style.borderColor = 'var(--accent)';
            this.parentElement.style.background = 'var(--accent-light)';
        }
    });
});

const chatToggle = document.getElementById('chatToggle');
const chatBox = document.getElementById('chatBox');
const chatBody = document.getElementById('chatBody');
const chatInput = document.getElementById('chatInput');
const chatSend = document.getElementById('chatSend');

chatToggle.addEventListener('click', () => {
    chatBox.classList.toggle('active');
    chatToggle.classList.toggle('active');
    if (chatBox.classList.contains('active')) document.querySelector('.chat-badge').style.display = 'none';
});

function addMessage(text, isUser = false) {
    const msg = document.createElement('div');
    msg.className = 'chat-message ' + (isUser ? 'user' : 'bot');
    msg.textContent = text;
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    addMessage(text, true);
    chatInput.value = '';
    setTimeout(() => {
        const replies = {
            "book a cab": "You can book a cab directly through our booking form above or call us at +91 91537 87859.",
            "logistics quote": "Please fill out the logistics form above with your cargo details, and we will send a quote within 30 minutes.",
            "pricing info": "Use our fare calculator above to get instant estimates for intercity rides. Sedan starts at Rs.15/km, Pickup at Rs.12/km.",
            "talk to agent": "Connecting you to an agent... Our team will call you within 5 minutes. Please share your phone number."
        };
        const lower = text.toLowerCase();
        let reply = "Thank you for your message! Our team will get back to you shortly. For immediate assistance, please call +91 91537 87859.";
        for (const [key, val] of Object.entries(replies)) { if (lower.includes(key)) { reply = val; break; } }
        addMessage(reply);
    }, 800);
}

chatSend.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', e => { if (e.key === 'Enter') sendMessage(); });

document.querySelectorAll('.chat-quick-reply').forEach(btn => {
    btn.addEventListener('click', () => {
        addMessage(btn.dataset.reply, true);
        setTimeout(() => {
            const replies = {
                "Book a cab": "You can book a cab directly through our booking form above or call us at +91 91537 87859.",
                "Logistics quote": "Please fill out the logistics form above with your cargo details, and we will send a quote within 30 minutes.",
                "Pricing info": "Use our fare calculator above to get instant estimates for intercity rides. Sedan starts at Rs.15/km, Pickup at Rs.12/km.",
                "Talk to agent": "Connecting you to an agent... Our team will call you within 5 minutes. Please share your phone number."
            };
            addMessage(replies[btn.dataset.reply]);
        }, 800);
    });
});

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.querySelectorAll('.stat-number').forEach(stat => {
                const target = parseInt(stat.textContent);
                let start = 0;
                const inc = target / (2000 / 16);
                const timer = setInterval(() => {
                    start += inc;
                    if (start >= target) { stat.textContent = target + (target > 100 ? '+' : ''); clearInterval(timer); }
                    else { stat.textContent = Math.floor(start) + (target > 100 ? '+' : ''); }
                }, 16);
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });
const statsRow = document.querySelector('.stats-row');
if (statsRow) statsObserver.observe(statsRow);

document.querySelectorAll('input[type="date"]').forEach(input => {
    input.min = new Date().toISOString().split('T')[0];
});

console.log('Infurnus App Loaded');
