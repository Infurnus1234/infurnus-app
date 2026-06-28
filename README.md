# Infurnus - Full Stack Logistics & Cab Services Platform

Complete full-stack web application for Infurnus Logistics & Cab Services, Patna, Bihar.

## Features

- Google Maps integration with real-time distance-based fare calculation
- Booking management system (Cab, Logistics, Rentals)
- Driver recruitment portal
- Admin dashboard to view and process all bookings
- MongoDB database for persistent storage

## Project Structure

```
infurnus-app/
├── backend/
│   ├── server.js          # Express.js server
│   ├── package.json       # Dependencies
│   └── .env.example       # Environment template
├── frontend/
│   ├── index.html         # Customer website
│   ├── js/
│   │   └── app.js         # Frontend logic + Google Maps
│   └── admin/
│       ├── index.html     # Admin dashboard
│       └── admin.js       # Dashboard logic
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MongoDB (local or MongoDB Atlas)
- Google Maps API Key

### Step 1: Get Google Maps API Key

1. Go to https://console.cloud.google.com/
2. Create/select a project
3. Enable these APIs:
   - Maps JavaScript API
   - Places API
   - Distance Matrix API
   - Geocoding API
4. Go to APIs & Services > Credentials
5. Click CREATE CREDENTIALS > API Key
6. Copy the key (starts with AIzaSy...)
7. Restrict the key for security (optional but recommended)

### Step 2: Configure Environment Variables

1. Open `backend/.env.example`
2. Replace `YOUR_GOOGLE_MAPS_API_KEY_HERE` with your actual API key
3. Save the file as `backend/.env` (remove .example from the filename)

### Step 3: Update Frontend Google Maps Script

1. Open `frontend/index.html`
2. Find this line:
   ```html
   <script src="https://maps.googleapis.com/maps/api/js?key=YOUR_GOOGLE_MAPS_API_KEY&libraries=places,geometry&callback=initMap" async defer></script>
   ```
3. Replace `YOUR_GOOGLE_MAPS_API_KEY` with your actual key

### Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 5: Start MongoDB

**Option A - Local MongoDB:**
```bash
# Windows: Start MongoDB service from Services panel
# Or run: mongod
```

**Option B - MongoDB Atlas (Cloud):**
1. Sign up at https://www.mongodb.com
2. Create a free cluster
3. Get connection string
4. Update MONGODB_URI in backend/.env

### Step 6: Start the Server

```bash
# In the backend folder
npm start
```

Server starts at: http://localhost:3000

### Step 7: Access the Application

- Customer Website: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin
  - Default login token: `infurnus-admin-2026`

## How It Works

1. Customer visits website and fills booking form
2. Google Maps calculates real road distance between pickup and drop
3. Fare is computed based on actual distance x vehicle rate
4. Booking is saved to MongoDB database
5. Admin logs into dashboard and sees all bookings
6. Admin can update booking status: Pending -> Confirmed -> In Progress -> Completed

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/bookings | Create new booking |
| GET | /api/bookings | Get all bookings (admin) |
| PATCH | /api/bookings/:id | Update booking status |
| DELETE | /api/bookings/:id | Delete booking |
| POST | /api/drivers | Submit driver application |
| GET | /api/drivers | Get all applications (admin) |
| POST | /api/calculate-fare | Calculate fare with real distance |
| GET | /api/stats | Get dashboard statistics |

## Deployment

### Render.com (Recommended Free Option)

1. Push code to GitHub
2. Sign up at https://render.com
3. New > Web Service > Connect GitHub repo
4. Settings:
   - Build Command: `cd backend && npm install`
   - Start Command: `cd backend && npm start`
   - Add environment variables from .env file
5. Deploy

## Google Maps API Pricing

| API | Free Tier |
|-----|-----------|
| Maps JavaScript API | 10,000 loads/month |
| Places API | 10,000 requests/month |
| Distance Matrix API | 10,000 elements/month |

Free tier is sufficient for small business startup.

## Support

For issues or questions:
- Phone: +91 91537 87859
- Location: Patna, Bihar
