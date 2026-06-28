const API_BASE = window.location.origin.includes('localhost') 
  ? 'http://localhost:3000' 
  : 'https://infurnus-backend.onrender.com';
let authToken = localStorage.getItem('infurnus_admin_token') || '';
let currentBookings = [];
let currentDrivers = [];
let selectedBookingId = null;
let selectedDriverId = null;
let currentPage = 1;

// Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
  e.preventDefault();
  const token = document.getElementById('adminToken').value.trim();
  if (!token) return alert('Please enter admin token');
  authToken = token;
  localStorage.setItem('infurnus_admin_token', token);
  showDashboard();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
  e.preventDefault();
  authToken = '';
  localStorage.removeItem('infurnus_admin_token');
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
});

// Auto-login if token exists
if (authToken) {
  showDashboard();
}

function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  updateTime();
  setInterval(updateTime, 60000);
  loadStats();
  loadRecentBookings();
}

function updateTime() {
  document.getElementById('currentTime').textContent = new Date().toLocaleString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + authToken
  };
}

function handleResponse(res) {
  if (res.status === 401) {
    alert('Invalid admin token. Please sign in again.');
    authToken = '';
    localStorage.removeItem('infurnus_admin_token');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
    throw new Error('Unauthorized');
  }
  return res.json();
}

// Stats
async function loadStats() {
  try {
    const res = await fetch(API_BASE + '/api/stats', { headers: getHeaders() });
    const data = await handleResponse(res);
    if (data.success) {
      document.getElementById('statTotalBookings').textContent = data.stats.totalBookings || 0;
      document.getElementById('statPendingBookings').textContent = data.stats.pendingBookings || 0;
      document.getElementById('statRevenue').textContent = 'Rs.' + (data.stats.totalRevenue || 0).toLocaleString('en-IN');
      document.getElementById('statTotalDrivers').textContent = data.stats.totalDrivers || 0;
    }
  } catch (err) {
    console.error('Stats error:', err);
  }
}

// Recent Bookings
async function loadRecentBookings() {
  try {
    const res = await fetch(API_BASE + '/api/bookings?status=pending&limit=5', { headers: getHeaders() });
    const data = await handleResponse(res);
    const tbody = document.getElementById('recentBookingsTable');
    if (data.success && data.bookings.length > 0) {
      tbody.innerHTML = data.bookings.map(b => renderBookingRow(b, false)).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:2rem">No pending bookings</td></tr>';
    }
  } catch (err) {
    console.error('Recent bookings error:', err);
  }
}

// All Bookings
async function loadBookings(page = 1) {
  currentPage = page;
  const type = document.getElementById('bookingTypeFilter').value;
  const status = document.getElementById('bookingStatusFilter').value;
  const search = document.getElementById('bookingSearch').value;

  let url = `/api/bookings?page=${page}&limit=20`;
  if (type) url += `&type=${type}`;
  if (status) url += `&status=${status}`;

  try {
    const res = await fetch(API_BASE + url, { headers: getHeaders() });
    const data = await handleResponse(res);
    const tbody = document.getElementById('allBookingsTable');
    if (data.success && data.bookings.length > 0) {
      currentBookings = data.bookings;
      let bookings = data.bookings;
      if (search) {
        const s = search.toLowerCase();
        bookings = bookings.filter(b => 
          (b.fullName || '').toLowerCase().includes(s) || 
          (b.phone || '').includes(s) ||
          (b.companyName || '').toLowerCase().includes(s)
        );
      }
      tbody.innerHTML = bookings.map(b => renderBookingRow(b, true)).join('');
      renderPagination(data.pagination);
    } else {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:var(--text-muted);padding:2rem">No bookings found</td></tr>';
      document.getElementById('bookingsPagination').innerHTML = '';
    }
  } catch (err) {
    console.error('Bookings error:', err);
  }
}

function renderBookingRow(b, full) {
  const id = b._id ? b._id.toString().slice(-6).toUpperCase() : 'N/A';
  const customer = b.fullName || b.companyName || 'N/A';
  const route = (b.pickupLocation || 'N/A') + ' → ' + (b.dropLocation || 'N/A');
  const date = b.pickupDate ? new Date(b.pickupDate).toLocaleDateString('en-IN') : 'N/A';
  const fare = b.estimatedFare ? 'Rs.' + b.estimatedFare : 'N/A';

  let actions = `<button class="btn btn-info btn-sm" onclick="viewBooking('${b._id}')"><i class="fas fa-eye"></i></button>`;
  if (full) {
    actions += ` <button class="btn btn-danger btn-sm" onclick="deleteBooking('${b._id}')"><i class="fas fa-trash"></i></button>`;
  }

  if (full) {
    return `<tr>
      <td>#${id}</td>
      <td><span class="status-badge status-${b.bookingType}">${b.bookingType}</span></td>
      <td>${customer}</td>
      <td>${b.phone || 'N/A'}</td>
      <td>${route}</td>
      <td>${date}</td>
      <td>${fare}</td>
      <td><span class="status-badge status-${b.status}">${b.status}</span></td>
      <td>${actions}</td>
    </tr>`;
  } else {
    return `<tr>
      <td>#${id}</td>
      <td><span class="status-badge status-${b.bookingType}">${b.bookingType}</span></td>
      <td>${customer}</td>
      <td>${route}</td>
      <td>${date}</td>
      <td><span class="status-badge status-${b.status}">${b.status}</span></td>
      <td>${actions}</td>
    </tr>`;
  }
}

function renderPagination(pagination) {
  if (!pagination || pagination.pages <= 1) {
    document.getElementById('bookingsPagination').innerHTML = '';
    return;
  }
  let html = '';
  html += `<button ${pagination.page <= 1 ? 'disabled' : ''} onclick="loadBookings(${pagination.page - 1})">Prev</button>`;
  for (let i = 1; i <= pagination.pages; i++) {
    html += `<button class="${i === pagination.page ? 'active' : ''}" onclick="loadBookings(${i})">${i}</button>`;
  }
  html += `<button ${pagination.page >= pagination.pages ? 'disabled' : ''} onclick="loadBookings(${pagination.page + 1})">Next</button>`;
  document.getElementById('bookingsPagination').innerHTML = html;
}

// Drivers
async function loadDrivers() {
  const status = document.getElementById('driverStatusFilter').value;
  let url = '/api/drivers';
  if (status) url += `?status=${status}`;

  try {
    const res = await fetch(API_BASE + url, { headers: getHeaders() });
    const data = await handleResponse(res);
    const tbody = document.getElementById('driversTable');
    if (data.success && data.drivers.length > 0) {
      currentDrivers = data.drivers;
      tbody.innerHTML = data.drivers.map(d => {
        const statusClass = 'status-' + d.status;
        return `<tr>
          <td>${d.fullName}</td>
          <td>${d.phone}</td>
          <td>${d.city}</td>
          <td>${d.experience || 'N/A'}</td>
          <td>${d.vehicleType || 'N/A'}</td>
          <td>${d.licenseNumber}</td>
          <td><span class="status-badge ${statusClass}">${d.status}</span></td>
          <td><button class="btn btn-info btn-sm" onclick="viewDriver('${d._id}')"><i class="fas fa-eye"></i></button></td>
        </tr>`;
      }).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">No driver applications found</td></tr>';
    }
  } catch (err) {
    console.error('Drivers error:', err);
  }
}

// View Booking
async function viewBooking(id) {
  selectedBookingId = id;
  try {
    const res = await fetch(API_BASE + '/api/bookings/' + id, { headers: getHeaders() });
    const data = await handleResponse(res);
    if (data.success) {
      const b = data.booking;
      document.getElementById('bookingModalBody').innerHTML = `
        <div class="detail-row"><span>Booking ID</span><span>#${b._id.toString().slice(-6).toUpperCase()}</span></div>
        <div class="detail-row"><span>Type</span><span>${b.bookingType}</span></div>
        <div class="detail-row"><span>Customer</span><span>${b.fullName || b.companyName || 'N/A'}</span></div>
        <div class="detail-row"><span>Phone</span><span>${b.phone || 'N/A'}</span></div>
        <div class="detail-row"><span>Email</span><span>${b.email || 'N/A'}</span></div>
        <div class="detail-row"><span>Pickup</span><span>${b.pickupLocation || 'N/A'}</span></div>
        <div class="detail-row"><span>Drop</span><span>${b.dropLocation || 'N/A'}</span></div>
        <div class="detail-row"><span>Distance</span><span>${b.distanceText || 'N/A'}</span></div>
        <div class="detail-row"><span>Estimated Fare</span><span>${b.estimatedFare ? 'Rs.' + b.estimatedFare : 'N/A'}</span></div>
        <div class="detail-row"><span>Pickup Date</span><span>${b.pickupDate ? new Date(b.pickupDate).toLocaleString('en-IN') : 'N/A'}</span></div>
        <div class="detail-row"><span>Vehicle Type</span><span>${b.vehicleType || 'N/A'}</span></div>
        <div class="detail-row"><span>Passengers</span><span>${b.passengers || 'N/A'}</span></div>
        <div class="detail-row"><span>Special Requests</span><span>${b.specialRequests || 'N/A'}</span></div>
        <div class="detail-row"><span>Status</span><span><span class="status-badge status-${b.status}">${b.status}</span></span></div>
        <div class="detail-row"><span>Assigned Driver</span><span>${b.assignedDriver || 'Not assigned'}</span></div>
        <div class="detail-row"><span>Notes</span><span>${b.notes || 'N/A'}</span></div>
        <div class="detail-row"><span>Created</span><span>${new Date(b.createdAt).toLocaleString('en-IN')}</span></div>
      `;
      document.getElementById('bookingModal').classList.add('active');
    }
  } catch (err) {
    console.error('View booking error:', err);
  }
}

// Update Booking Status
async function updateBookingStatus(status) {
  if (!selectedBookingId) return;
  try {
    const res = await fetch(API_BASE + '/api/bookings/' + selectedBookingId, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await handleResponse(res);
    if (data.success) {
      closeModal('bookingModal');
      loadStats();
      loadRecentBookings();
      if (document.getElementById('bookingsPage').style.display !== 'none') loadBookings(currentPage);
    }
  } catch (err) {
    console.error('Update booking error:', err);
  }
}

// Delete Booking
async function deleteBooking(id) {
  if (!confirm('Are you sure you want to delete this booking?')) return;
  try {
    const res = await fetch(API_BASE + '/api/bookings/' + id, {
      method: 'DELETE',
      headers: getHeaders()
    });
    const data = await handleResponse(res);
    if (data.success) {
      loadStats();
      loadBookings(currentPage);
    }
  } catch (err) {
    console.error('Delete booking error:', err);
  }
}

// View Driver
async function viewDriver(id) {
  selectedDriverId = id;
  try {
    // Drivers endpoint doesn't have individual GET, so find from current list
    const d = currentDrivers.find(drv => drv._id === id);
    if (!d) return alert('Driver not found');

    document.getElementById('driverModalBody').innerHTML = `
      <div class="detail-row"><span>Name</span><span>${d.fullName}</span></div>
      <div class="detail-row"><span>Phone</span><span>${d.phone}</span></div>
      <div class="detail-row"><span>Email</span><span>${d.email || 'N/A'}</span></div>
      <div class="detail-row"><span>City</span><span>${d.city}</span></div>
      <div class="detail-row"><span>Experience</span><span>${d.experience || 'N/A'}</span></div>
      <div class="detail-row"><span>Vehicle Type</span><span>${d.vehicleType || 'N/A'}</span></div>
      <div class="detail-row"><span>License Number</span><span>${d.licenseNumber}</span></div>
      <div class="detail-row"><span>Aadhaar</span><span>${d.aadhaarNumber || 'N/A'}</span></div>
      <div class="detail-row"><span>About</span><span>${d.about || 'N/A'}</span></div>
      <div class="detail-row"><span>Status</span><span><span class="status-badge status-${d.status}">${d.status}</span></span></div>
      <div class="detail-row"><span>Applied On</span><span>${new Date(d.createdAt).toLocaleString('en-IN')}</span></div>
    `;
    document.getElementById('driverModal').classList.add('active');
  } catch (err) {
    console.error('View driver error:', err);
  }
}

// Update Driver Status
async function updateDriverStatus(status) {
  if (!selectedDriverId) return;
  try {
    const res = await fetch(API_BASE + '/api/drivers/' + selectedDriverId, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify({ status })
    });
    const data = await handleResponse(res);
    if (data.success) {
      closeModal('driverModal');
      loadDrivers();
      loadStats();
    }
  } catch (err) {
    console.error('Update driver error:', err);
  }
}

// Close Modal
function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Navigation
function showPage(page) {
  document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
  document.querySelectorAll('[id$="Page"]').forEach(p => p.style.display = 'none');

  const pageMap = {
    'overview': { nav: 'overview', title: 'Dashboard Overview' },
    'bookings': { nav: 'bookings', title: 'All Bookings' },
    'drivers': { nav: 'drivers', title: 'Driver Applications' },
    'pricing': { nav: 'pricing', title: 'Pricing Configuration' },
    'settings': { nav: 'settings', title: 'Admin Settings' }
  };

  const info = pageMap[page];
  if (info) {
    document.querySelector(`[data-page="${info.nav}"]`).classList.add('active');
    document.getElementById(page + 'Page').style.display = 'block';
    document.getElementById('pageTitle').textContent = info.title;
  }

  if (page === 'bookings') loadBookings();
  if (page === 'drivers') loadDrivers();
}

// Sidebar navigation
document.querySelectorAll('.sidebar-nav a[data-page]').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    showPage(this.dataset.page);
  });
});

// Filter change handlers
document.getElementById('bookingTypeFilter').addEventListener('change', () => loadBookings(1));
document.getElementById('bookingStatusFilter').addEventListener('change', () => loadBookings(1));
document.getElementById('bookingSearch').addEventListener('input', () => loadBookings(1));
document.getElementById('driverStatusFilter').addEventListener('change', loadDrivers);