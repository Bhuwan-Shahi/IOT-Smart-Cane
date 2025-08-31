// Map Management Module
class MapManager {
  constructor() {
    this.map = null;
    this.currentLocationMarker = null;
    this.destinationMarker = null;
    this.routeLayer = null;
    this.isInitialized = false;
  }

  // Initialize the map
  initializeMap() {
    if (this.isInitialized) return;

    try {
      // Create map centered on a default location (Kathmandu)
      this.map = L.map('map').setView([27.7172, 85.3240], 13);
      
      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0
      }).addTo(this.map);

      // Add map controls
      this.addMapControls();
      
      this.isInitialized = true;
      console.log('Map initialized successfully');
    } catch (error) {
      console.error('Error initializing map:', error);
    }
  }

  // Add custom map controls
  addMapControls() {
    // Add scale control
    L.control.scale({
      position: 'bottomleft',
      metric: true,
      imperial: false
    }).addTo(this.map);

    // Add zoom control with custom position
    this.map.zoomControl.setPosition('topright');
  }

  // Update map with current location
  updateCurrentLocation(location) {
    if (!this.isInitialized) {
      this.initializeMap();
    }

    // Remove existing current location marker
    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker);
    }

    // Create custom icon for current location
    const currentLocationIcon = L.divIcon({
      html: '📍',
      iconSize: [25, 25],
      className: 'current-location-marker'
    });

    // Add new current location marker
    this.currentLocationMarker = L.marker([location.lat, location.lng], {
      icon: currentLocationIcon
    }).addTo(this.map);

    // Add popup with location info
    const popupContent = `
      <div class="location-popup">
        <strong>📍 Current Location</strong><br>
        Lat: ${location.lat.toFixed(6)}<br>
        Lng: ${location.lng.toFixed(6)}
        ${location.accuracy ? `<br>Accuracy: ${Math.round(location.accuracy)}m` : ''}
      </div>
    `;
    
    this.currentLocationMarker.bindPopup(popupContent).openPopup();

    // Center map on current location
    this.map.setView([location.lat, location.lng], 15);
  }

  // Add destination marker
  addDestinationMarker(destination) {
    // Remove existing destination marker
    if (this.destinationMarker) {
      this.map.removeLayer(this.destinationMarker);
    }

    // Create custom icon for destination
    const destinationIcon = L.divIcon({
      html: '🎯',
      iconSize: [25, 25],
      className: 'destination-marker'
    });

    // Add destination marker
    this.destinationMarker = L.marker([destination.lat, destination.lng], {
      icon: destinationIcon
    }).addTo(this.map);

    // Add popup with destination info
    const popupContent = `
      <div class="destination-popup">
        <strong>🎯 Destination</strong><br>
        ${destination.name || 'Selected Location'}<br>
        Lat: ${destination.lat.toFixed(6)}<br>
        Lng: ${destination.lng.toFixed(6)}
      </div>
    `;
    
    this.destinationMarker.bindPopup(popupContent);
  }

  // Draw route on map
  drawRoute(coordinates, style = {}) {
    // Remove existing route
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
    }

    // Default route style
    const defaultStyle = {
      color: 'blue',
      weight: 5,
      opacity: 0.8
    };

    // Merge with provided style
    const routeStyle = { ...defaultStyle, ...style };

    // Create route polyline
    this.routeLayer = L.polyline(coordinates, routeStyle).addTo(this.map);

    // Fit map to show entire route
    this.fitToRoute();
  }

  // Fit map to show current route
  fitToRoute() {
    if (this.routeLayer) {
      const bounds = this.routeLayer.getBounds();
      this.map.fitBounds(bounds, { 
        padding: [20, 20],
        maxZoom: 16 
      });
    }
  }

  // Clear route from map
  clearRoute() {
    if (this.routeLayer) {
      this.map.removeLayer(this.routeLayer);
      this.routeLayer = null;
    }
    
    if (this.destinationMarker) {
      this.map.removeLayer(this.destinationMarker);
      this.destinationMarker = null;
    }
  }

  // Center map on location
  centerOnLocation(location, zoom = 15) {
    if (this.map) {
      this.map.setView([location.lat, location.lng], zoom);
    }
  }

  // Get map instance
  getMap() {
    return this.map;
  }

  // Handle map resize
  invalidateSize() {
    if (this.map) {
      setTimeout(() => {
        this.map.invalidateSize();
      }, 100);
    }
  }

  // Add click handler for map
  onMapClick(callback) {
    if (this.map) {
      this.map.on('click', callback);
    }
  }

  // Remove all markers and routes
  clearAll() {
    this.clearRoute();
    
    if (this.currentLocationMarker) {
      this.map.removeLayer(this.currentLocationMarker);
      this.currentLocationMarker = null;
    }
  }
}

// Create global instance
const mapManager = new MapManager();

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  mapManager.initializeMap();
});
