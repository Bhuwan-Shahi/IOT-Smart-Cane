// script.js

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBPA7tBYL3T7f4arLFGwNOXHY-8jXIzbr4",
  authDomain: "esp866-gps-tracker.firebaseapp.com",
  databaseURL: "https://esp866-gps-tracker-default-rtdb.firebaseio.com",
  projectId: "esp866-gps-tracker",
  storageBucket: "esp866-gps-tracker.firebasestorage.app",
  messagingSenderId: "1016691213056",
  appId: "1:1016691213056:web:dd6535f1995836cf58e9e5",
  measurementId: "G-M6KJNGJ3XH"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const database = firebase.database();

// Reference to the GPS_Data path
const gpsDataRef = database.ref('GPS_DATA');

// Debug: Check Firebase connection
console.log('Firebase initialized:', app);
console.log('Database reference:', gpsDataRef);

// Test Firebase connection
database.ref('.info/connected').on('value', function(snapshot) {
  if (snapshot.val() === true) {
    console.log('Connected to Firebase');
    document.getElementById('status').textContent = 'Connected to Firebase';
  } else {
    console.log('Disconnected from Firebase');
    document.getElementById('status').textContent = 'Disconnected from Firebase';
  }
});

// Initialize map variables
let map;
let marker;
let destinationMarker;
let routeControl;
let currentLocation = null;

function initMap(lat, lng) {
  // Store current location
  currentLocation = { lat: lat, lng: lng };
  
  // Create map if it doesn't exist
  if (!map) {
    map = L.map('map').setView([lat, lng], 15);
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
  } else {
    // Update map center
    map.setView([lat, lng], 15);
  }

  // Remove existing marker
  if (marker) map.removeLayer(marker);

  // Add new marker
  marker = L.marker([lat, lng])
    .addTo(map)
    .bindPopup(`<b>Current Location</b><br>Lat: ${lat}<br>Lng: ${lng}`)
    .openPopup();
}

// Function to get current location
function getCurrentLocation() {
  const statusElement = document.getElementById('status');
  
  if (!navigator.geolocation) {
    statusElement.textContent = 'Geolocation is not supported by this browser.';
    return;
  }

  statusElement.textContent = 'Getting your location...';

  // Try multiple methods for better accuracy
  getHighAccuracyLocation();
}

// High accuracy location detection with multiple attempts
function getHighAccuracyLocation() {
  const statusElement = document.getElementById('status');
  
  if (!navigator.geolocation) {
    statusElement.textContent = 'Geolocation is not supported by this browser.';
    return;
  }

  statusElement.textContent = 'Getting high-accuracy location...';
  
  let bestPosition = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  function tryGetLocation() {
    attempts++;
    statusElement.textContent = `Getting location... (attempt ${attempts}/${maxAttempts})`;
    
    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0  // Don't use cached location
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const accuracy = position.coords.accuracy;
        statusElement.textContent = `Location found (accuracy: ${Math.round(accuracy)}m)`;
        
        // Keep the most accurate position
        if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
          bestPosition = position;
        }
        
        // If accuracy is good enough (< 20m) or we've tried enough times
        if (accuracy < 20 || attempts >= maxAttempts) {
          const lat = bestPosition.coords.latitude;
          const lng = bestPosition.coords.longitude;
          
          sendLocationToFirebase(lat, lng);
          statusElement.textContent = `Location updated! (accuracy: ${Math.round(bestPosition.coords.accuracy)}m)`;
        } else {
          // Try again for better accuracy
          setTimeout(tryGetLocation, 1000);
        }
      },
      (error) => {
        if (attempts < maxAttempts) {
          // Try again
          setTimeout(tryGetLocation, 2000);
        } else {
          let errorMessage = '';
          switch(error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied. Please allow location access.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location unavailable. Try going outside or near a window.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location timeout. Please try again.';
              break;
            default:
              errorMessage = 'Location error. Please try again.';
              break;
          }
          statusElement.textContent = errorMessage;
        }
      },
      options
    );
  }
  
  tryGetLocation();
}

// Alternative: IP-based location (less accurate but as fallback)
async function getLocationFromIP() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    
    if (data.latitude && data.longitude) {
      const lat = parseFloat(data.latitude);
      const lng = parseFloat(data.longitude);
      
      document.getElementById('status').textContent = `Approximate location from IP (${data.city}, ${data.country})`;
      sendLocationToFirebase(lat, lng);
      return true;
    }
  } catch (error) {
    console.error('IP location failed:', error);
  }
  return false;
}

// Function to geocode destination (convert address to coordinates)
async function geocodeDestination(destination) {
  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

// Function to find route between two points
async function findRoute() {
  const destination = document.getElementById('destinationInput').value.trim();
  const routeInfo = document.getElementById('routeInfo');
  
  if (!destination) {
    routeInfo.innerHTML = '<span style="color: red;">Please enter a destination</span>';
    return;
  }
  
  if (!currentLocation) {
    routeInfo.innerHTML = '<span style="color: red;">Please get your current location first</span>';
    return;
  }
  
  routeInfo.innerHTML = 'Finding destination...';
  
  // Geocode destination
  const destinationCoords = await geocodeDestination(destination);
  if (!destinationCoords) {
    routeInfo.innerHTML = '<span style="color: red;">Destination not found. Try a more specific address.</span>';
    return;
  }
  
  // Add destination marker
  if (destinationMarker) map.removeLayer(destinationMarker);
  destinationMarker = L.marker([destinationCoords.lat, destinationCoords.lng])
    .addTo(map)
    .bindPopup(`<b>Destination</b><br>${destinationCoords.name}`)
    .openPopup();
  
  routeInfo.innerHTML = 'Calculating route...';
  
  // Try to get real road-based route
  await getRoadBasedRoute(currentLocation, destinationCoords);
}

// Function to get road-based route using OpenRouteService API
async function getRoadBasedRoute(start, end) {
  const routeInfo = document.getElementById('routeInfo');
  
  try {
    // Try OpenRouteService first (free tier available)
    const orsResponse = await fetch(`https://api.openrouteservice.org/v2/directions/foot-walking/geojson`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json, application/geo+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        coordinates: [[start.lng, start.lat], [end.lng, end.lat]],
        format: 'geojson'
      })
    });

    if (orsResponse.ok) {
      const data = await orsResponse.json();
      if (data.features && data.features[0]) {
        drawRoadBasedRoute(data.features[0], start, end);
        return;
      }
    }
  } catch (error) {
    console.log('OpenRouteService failed, trying GraphHopper...');
  }

  try {
    // Try GraphHopper routing API (also free tier)
    const ghResponse = await fetch(`https://graphhopper.com/api/1/route?point=${start.lat},${start.lng}&point=${end.lat},${end.lng}&vehicle=foot&locale=en&calc_points=true&debug=true&elevation=false&points_encoded=false&type=json`);
    
    if (ghResponse.ok) {
      const data = await ghResponse.json();
      if (data.paths && data.paths[0]) {
        drawGraphHopperRoute(data.paths[0], start, end);
        return;
      }
    }
  } catch (error) {
    console.log('GraphHopper failed, trying OSRM...');
  }

  try {
    // Try OSRM (Open Source Routing Machine) - completely free
    const osrmResponse = await fetch(`https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`);
    
    if (osrmResponse.ok) {
      const data = await osrmResponse.json();
      if (data.routes && data.routes[0]) {
        drawOSRMRoute(data.routes[0], start, end);
        return;
      }
    }
  } catch (error) {
    console.log('OSRM failed, falling back to straight line...');
  }

  // Fallback to straight line if all routing services fail
  routeInfo.innerHTML = 'Road routing unavailable, showing straight line...';
  setTimeout(() => drawSimpleRoute(start, end), 1000);
}

// Function to draw OpenRouteService route
function drawRoadBasedRoute(routeFeature, start, end) {
  const routeInfo = document.getElementById('routeInfo');
  
  // Remove existing route
  if (routeControl) map.removeLayer(routeControl);
  
  // Extract coordinates from GeoJSON
  const coordinates = routeFeature.geometry.coordinates;
  const latlngs = coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng, lat] to [lat, lng]
  
  // Draw route following roads
  routeControl = L.polyline(latlngs, {
    color: 'blue',
    weight: 5,
    opacity: 0.8
  }).addTo(map);
  
  // Fit map to route
  map.fitBounds(routeControl.getBounds(), { padding: [20, 20] });
  
  // Display route info
  const properties = routeFeature.properties;
  const segments = properties.segments || [properties];
  const distance = (segments[0].distance / 1000).toFixed(2);
  const duration = Math.round(segments[0].duration / 60);
  
  routeInfo.innerHTML = `
    <strong>🚶 Walking Route Found!</strong><br>
    Distance: ${distance} km<br>
    Estimated time: ${duration} minutes<br>
    <em>Following roads and walkways</em>
  `;
}

// Function to draw GraphHopper route
function drawGraphHopperRoute(path, start, end) {
  const routeInfo = document.getElementById('routeInfo');
  
  // Remove existing route
  if (routeControl) map.removeLayer(routeControl);
  
  // Extract coordinates
  const coordinates = path.points.coordinates;
  const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
  
  // Draw route
  routeControl = L.polyline(latlngs, {
    color: 'blue',
    weight: 5,
    opacity: 0.8
  }).addTo(map);
  
  map.fitBounds(routeControl.getBounds(), { padding: [20, 20] });
  
  const distance = (path.distance / 1000).toFixed(2);
  const duration = Math.round(path.time / 60000); // Convert from ms to minutes
  
  routeInfo.innerHTML = `
    <strong>🚶 Walking Route Found!</strong><br>
    Distance: ${distance} km<br>
    Estimated time: ${duration} minutes<br>
    <em>Following roads and walkways</em>
  `;
}

// Function to draw OSRM route
function drawOSRMRoute(route, start, end) {
  const routeInfo = document.getElementById('routeInfo');
  
  // Remove existing route
  if (routeControl) map.removeLayer(routeControl);
  
  // Extract coordinates from GeoJSON
  const coordinates = route.geometry.coordinates;
  const latlngs = coordinates.map(coord => [coord[1], coord[0]]);
  
  // Draw route
  routeControl = L.polyline(latlngs, {
    color: 'blue',
    weight: 5,
    opacity: 0.8
  }).addTo(map);
  
  map.fitBounds(routeControl.getBounds(), { padding: [20, 20] });
  
  const distance = (route.distance / 1000).toFixed(2);
  const duration = Math.round(route.duration / 60);
  
  routeInfo.innerHTML = `
    <strong>🚶 Walking Route Found!</strong><br>
    Distance: ${distance} km<br>
    Estimated time: ${duration} minutes<br>
    <em>Following roads and walkways</em>
  `;
}

// Function to draw simple straight line route (fallback)
// Function to draw simple straight line route (fallback)
function drawSimpleRoute(start, end) {
  const routeInfo = document.getElementById('routeInfo');
  
  // Remove existing route
  if (routeControl) map.removeLayer(routeControl);
  
  // Draw simple line
  const latlngs = [[start.lat, start.lng], [end.lat, end.lng]];
  routeControl = L.polyline(latlngs, {
    color: 'red',
    weight: 4,
    opacity: 0.7,
    dashArray: '10, 10' // Dashed line to indicate it's not following roads
  }).addTo(map);
  
  // Calculate distance
  const distance = calculateDistance(start.lat, start.lng, end.lat, end.lng);
  
  // Fit map to show both points
  const bounds = L.latLngBounds([[start.lat, start.lng], [end.lat, end.lng]]);
  map.fitBounds(bounds, { padding: [20, 20] });
  
  routeInfo.innerHTML = `
    <strong>⚠️ Straight Line Route</strong><br>
    Distance: ${distance.toFixed(2)} km (direct)<br>
    Estimated time: ${Math.round(distance * 12)} minutes walking<br>
    <em>Road routing unavailable - follow red dashed line</em>
  `;
}

// Function to calculate distance between two points (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Function to clear route
function clearRoute() {
  if (routeControl) {
    map.removeLayer(routeControl);
    routeControl = null;
  }
  if (destinationMarker) {
    map.removeLayer(destinationMarker);
    destinationMarker = null;
  }
  document.getElementById('routeInfo').innerHTML = '';
  document.getElementById('destinationInput').value = '';
  
  // Recenter map on current location
  if (currentLocation) {
    map.setView([currentLocation.lat, currentLocation.lng], 15);
  }
}

// Function to send location to Firebase
function sendLocationToFirebase(lat, lng) {
  database.ref('GPS_Data').set({
    Latitude: lat,
    Longitude: lng
  }).then(() => {
    console.log('Location sent to Firebase successfully');
  }).catch((error) => {
    console.error('Error sending location to Firebase:', error);
    document.getElementById('status').textContent = 'Error sending to Firebase';
  });
}

// Function to update UI directly (alternative to Firebase)
function updateUIDirectly(lat, lng) {
  document.getElementById('latitude').textContent = lat.toFixed(6);
  document.getElementById('longitude').textContent = lng.toFixed(6);
  initMap(lat, lng);
}

// Add event listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('getCurrentLocation').addEventListener('click', getCurrentLocation);
  document.getElementById('getIPLocation').addEventListener('click', getLocationFromIP);
  document.getElementById('findRoute').addEventListener('click', findRoute);
  document.getElementById('clearRoute').addEventListener('click', clearRoute);
  
  // Allow Enter key in destination input
  document.getElementById('destinationInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      findRoute();
    }
  });
});

// Update UI with real-time data from Firebase
gpsDataRef.on('value', (snapshot) => {
  const data = snapshot.val();
  console.log('Firebase data received:', data);
  
  if (data) {
    document.getElementById('latitude').textContent = data.Latitude || 'N/A';
    document.getElementById('longitude').textContent = data.Longitude || 'N/A';

    // Parse coordinates and update map
    const lat = parseFloat(data.Latitude);
    const lng = parseFloat(data.Longitude);

    if (!isNaN(lat) && !isNaN(lng)) {
      initMap(lat, lng);
    }
  } else {
    document.getElementById('latitude').textContent = 'N/A';
    document.getElementById('longitude').textContent = 'N/A';
  }
}, (error) => {
  console.error("Error fetching data: ", error);
  document.getElementById('latitude').textContent = 'Error';
  document.getElementById('longitude').textContent = 'Error';
  document.getElementById('status').textContent = 'Firebase Error: ' + error.message;
});

// Fallback: If no data after 5 seconds, suggest using manual location
setTimeout(() => {
  if (document.getElementById('latitude').textContent === 'Loading...') {
    document.getElementById('status').textContent = 'No Firebase data found. Try "Get My Current Location" button.';
  }
}, 5000);