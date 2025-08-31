// Routing Management Module
class RoutingManager {
  constructor() {
    this.currentRoute = null;
    this.destinationMarker = null;
    this.currentDestination = null;
    this.lastDirection = null;
    this.lastAnnouncementTime = 0;
    this.reachedDestination = false;
    this.routeStarted = false;
  }

  // Geocode destination address to coordinates
  async geocodeDestination(destination) {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}&limit=1`
      );
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

  // Find route between current location and destination
  async findRoute(destination) {
    const routeInfo = document.getElementById('routeInfo');
    const currentLocation = locationManager.getCurrentLocation();
    
    if (!destination.trim()) {
      this.showRouteInfo('Please enter a destination', 'error');
      return false;
    }
    
    if (!currentLocation) {
      this.showRouteInfo('Please get your current location first', 'error');
      return false;
    }
    
    this.showRouteInfo('Finding destination...', 'info');
    
    // Geocode destination
    const destinationCoords = await this.geocodeDestination(destination);
    if (!destinationCoords) {
      this.showRouteInfo('Destination not found. Try a more specific address.', 'error');
      return false;
    }
    
    // Add destination marker
    mapManager.addDestinationMarker(destinationCoords);
    
    this.showRouteInfo('Calculating route...', 'info');
    
    // Try to get road-based route
    const routeSuccess = await this.getRoadBasedRoute(currentLocation, destinationCoords);
    return routeSuccess;
  }

  // Get road-based route using multiple routing services
  async getRoadBasedRoute(start, end) {
    // Try OSRM first (most reliable and free)
    try {
      const osrmRoute = await this.getOSRMRoute(start, end);
      if (osrmRoute) {
        this.drawRoute(osrmRoute, 'OSRM');
        return true;
      }
    } catch (error) {
      logger.log('OSRM failed, trying alternatives...');
    }

    // Try GraphHopper as fallback
    try {
      const ghRoute = await this.getGraphHopperRoute(start, end);
      if (ghRoute) {
        this.drawRoute(ghRoute, 'GraphHopper');
        return true;
      }
    } catch (error) {
      logger.log('GraphHopper failed, using straight line...');
    }

    // Fallback to straight line
    this.drawStraightLineRoute(start, end);
    return true;
  }

  // OSRM routing service
  async getOSRMRoute(start, end) {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/foot/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes[0]) {
        return {
          coordinates: data.routes[0].geometry.coordinates,
          distance: data.routes[0].distance,
          duration: data.routes[0].duration,
          type: 'road'
        };
      }
    }
    return null;
  }

  // GraphHopper routing service
  async getGraphHopperRoute(start, end) {
    const response = await fetch(
      `https://graphhopper.com/api/1/route?point=${start.lat},${start.lng}&point=${end.lat},${end.lng}&vehicle=foot&locale=en&calc_points=true&debug=true&elevation=false&points_encoded=false&type=json`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.paths && data.paths[0]) {
        return {
          coordinates: data.paths[0].points.coordinates,
          distance: data.paths[0].distance,
          duration: data.paths[0].time,
          type: 'road'
        };
      }
    }
    return null;
  }

  // Draw route on map
  drawRoute(routeData, service) {
    // Convert coordinates to Leaflet format
    const latlngs = routeData.coordinates.map(coord => [coord[1], coord[0]]);
    
    // Store route and destination for real-time navigation
    this.currentRoute = latlngs;
    this.currentDestination = {
      lat: latlngs[latlngs.length - 1][0],
      lng: latlngs[latlngs.length - 1][1]
    };
    this.routeStarted = true;
    this.reachedDestination = false;
    
    // Draw route on map
    mapManager.drawRoute(latlngs, {
      color: 'blue',
      weight: 5,
      opacity: 0.8
    });
    
    // Calculate display values
    const distance = (routeData.distance / 1000).toFixed(2);
    const duration = Math.round(
      routeData.type === 'road' ? 
      (routeData.duration / 60) : 
      (routeData.duration / 60000)
    );

    // Get direction information
    const currentLocation = locationManager.getCurrentLocation();
    const directionInfo = this.getDirectionInfo(currentLocation, this.currentDestination);
    
    // Show route information with direction
    this.showRouteInfo(`
      <strong>🚶 Walking Route Found!</strong><br>
      Distance: ${distance} km<br>
      Direction: ${directionInfo.direction.emoji} ${directionInfo.direction.name} (${directionInfo.bearing}°)<br>
      Estimated time: ${duration} minutes<br>
      <strong>📍 ${directionInfo.instruction}</strong><br>
      <em>Following roads and walkways (${service})</em><br>
      <strong>🔊 Real-time navigation active</strong>
    `, 'success');

    // Show compass direction
    this.showCompass(directionInfo);
    
    // Speak the route information
    if (typeof speechManager !== 'undefined') {
      speechManager.speakRoute({
        instruction: directionInfo.instruction,
        distance: parseFloat(distance),
        direction: directionInfo.direction.name,
        duration: duration
      });
      speechManager.speak('Real-time navigation started. You will hear direction updates as you walk.');
    }
    
    // Store initial direction
    this.lastDirection = directionInfo.direction.name;
  }

  // Draw straight line route (fallback)
  drawStraightLineRoute(start, end) {
    const latlngs = [[start.lat, start.lng], [end.lat, end.lng]];
    
    // Store route and destination for real-time navigation
    this.currentRoute = latlngs;
    this.currentDestination = end;
    this.routeStarted = true;
    this.reachedDestination = false;
    
    mapManager.drawRoute(latlngs, {
      color: 'red',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    });
    
    const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const directionInfo = this.getDirectionInfo(start, end);
    
    this.showRouteInfo(`
      <strong>⚠️ Straight Line Route</strong><br>
      Distance: ${distance.toFixed(2)} km (direct)<br>
      Direction: ${directionInfo.direction.emoji} ${directionInfo.direction.name} (${directionInfo.bearing}°)<br>
      Estimated time: ${Math.round(distance * 12)} minutes walking<br>
      <strong>📍 ${directionInfo.instruction}</strong><br>
      <em>Road routing unavailable - follow red dashed line</em><br>
      <strong>🔊 Real-time navigation active</strong>
    `, 'warning');

    // Show compass direction
    this.showCompass(directionInfo);
    
    // Speak the route information
    if (typeof speechManager !== 'undefined') {
      speechManager.speakRoute({
        instruction: directionInfo.instruction,
        distance: distance,
        direction: directionInfo.direction.name,
        duration: Math.round(distance * 12)
      });
      speechManager.speakAlert('Warning: Road routing unavailable. Following direct path.');
      speechManager.speak('Real-time navigation started. You will hear direction updates as you walk.');
    }
    
    // Store initial direction
    this.lastDirection = directionInfo.direction.name;
  }

  // Clear current route
  clearRoute() {
    mapManager.clearRoute();
    document.getElementById('routeInfo').innerHTML = '';
    document.getElementById('destinationInput').value = '';
    this.hideCompass();
    
    // Reset navigation state
    this.currentRoute = null;
    this.currentDestination = null;
    this.lastDirection = null;
    this.routeStarted = false;
    this.reachedDestination = false;
    
    // Announce route clearing
    if (typeof speechManager !== 'undefined') {
      speechManager.speak('Route cleared. Real-time navigation stopped.');
    }
    
    // Recenter map on current location
    const currentLocation = locationManager.getCurrentLocation();
    if (currentLocation) {
      mapManager.centerOnLocation(currentLocation);
    }
  }

  // Calculate straight-line distance using Haversine formula
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Calculate bearing (compass direction) from start to end point
  calculateBearing(lat1, lng1, lat2, lng2) {
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360°
  }

  // Convert bearing degrees to compass direction
  getCompassDirection(bearing) {
    const directions = [
      { name: "North", short: "N", emoji: "⬆️" },
      { name: "North-Northeast", short: "NNE", emoji: "↗️" },
      { name: "Northeast", short: "NE", emoji: "↗️" },
      { name: "East-Northeast", short: "ENE", emoji: "↗️" },
      { name: "East", short: "E", emoji: "➡️" },
      { name: "East-Southeast", short: "ESE", emoji: "↘️" },
      { name: "Southeast", short: "SE", emoji: "↘️" },
      { name: "South-Southeast", short: "SSE", emoji: "↘️" },
      { name: "South", short: "S", emoji: "⬇️" },
      { name: "South-Southwest", short: "SSW", emoji: "↙️" },
      { name: "Southwest", short: "SW", emoji: "↙️" },
      { name: "West-Southwest", short: "WSW", emoji: "↙️" },
      { name: "West", short: "W", emoji: "⬅️" },
      { name: "West-Northwest", short: "WNW", emoji: "↖️" },
      { name: "Northwest", short: "NW", emoji: "↖️" },
      { name: "North-Northwest", short: "NNW", emoji: "↖️" }
    ];
    
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  }

  // Get detailed direction information
  getDirectionInfo(start, end) {
    const bearing = this.calculateBearing(start.lat, start.lng, end.lat, end.lng);
    const distance = this.calculateDistance(start.lat, start.lng, end.lat, end.lng);
    const direction = this.getCompassDirection(bearing);
    
    return {
      bearing: Math.round(bearing),
      distance: distance,
      direction: direction,
      instruction: this.generateDirectionInstruction(direction, distance)
    };
  }

  // Generate human-readable direction instruction
  generateDirectionInstruction(direction, distance) {
    const distanceText = distance < 1 ? 
      `${Math.round(distance * 1000)} meters` : 
      `${distance.toFixed(1)} kilometers`;
    
    return `Head ${direction.name} for ${distanceText}`;
  }

  // Show compass direction
  showCompass(directionInfo) {
    const compass = document.getElementById('directionCompass');
    const arrow = document.getElementById('compassArrow');
    const directionText = document.getElementById('compassDirection');
    const bearingText = document.getElementById('compassBearing');

    if (compass && arrow && directionText && bearingText) {
      // Show compass
      compass.style.display = 'block';
      
      // Update direction text
      directionText.textContent = directionInfo.direction.short;
      bearingText.textContent = `${directionInfo.bearing}°`;
      
      // Rotate arrow based on direction
      const rotation = directionInfo.bearing;
      arrow.style.transform = `rotate(${rotation}deg)`;
      
      // Add direction class for styling
      arrow.className = 'compass-arrow';
      arrow.classList.add(directionInfo.direction.short.toLowerCase().replace('-', ''));
    }
  }

  // Hide compass
  hideCompass() {
    const compass = document.getElementById('directionCompass');
    if (compass) {
      compass.style.display = 'none';
    }
  }

  // Update direction in real-time (for live navigation)
  updateDirection() {
    const currentLocation = locationManager.getCurrentLocation();
    if (!currentLocation || !this.currentDestination) return;

    const directionInfo = this.getDirectionInfo(currentLocation, this.currentDestination);
    this.showCompass(directionInfo);
    
    // Update route info with current direction
    const distance = directionInfo.distance;
    const instruction = this.generateDirectionInstruction(directionInfo.direction, distance);
    
    return {
      distance: distance,
      bearing: directionInfo.bearing,
      direction: directionInfo.direction.name,
      instruction: instruction
    };
  }

  // Check if there's an active route for real-time navigation
  hasActiveRoute() {
    return this.routeStarted && this.currentDestination && !this.reachedDestination;
  }

  // Real-time navigation updates as user moves
  updateRealTimeNavigation(currentLocation) {
    if (!this.hasActiveRoute()) return;

    const now = Date.now();
    const distance = this.calculateDistance(
      currentLocation.lat, currentLocation.lng,
      this.currentDestination.lat, this.currentDestination.lng
    );

    // Check if destination reached (within 10 meters)
    if (distance < 0.01) { // ~10 meters in km
      this.announceDestinationReached();
      return;
    }

    // Get current direction
    const directionInfo = this.getDirectionInfo(currentLocation, this.currentDestination);
    const currentDirection = directionInfo.direction.name;

    // Update compass continuously
    this.showCompass(directionInfo);

    // Announce direction changes (throttled to avoid spam)
    const shouldAnnounce = this.shouldAnnounceUpdate(currentDirection, distance, now);
    
    if (shouldAnnounce) {
      this.announceDirectionUpdate(directionInfo, distance);
      this.lastDirection = currentDirection;
      this.lastAnnouncementTime = now;
    }

    // Update UI with current progress
    this.updateNavigationProgress(directionInfo, distance);
  }

  // Determine if we should announce an update
  shouldAnnounceUpdate(currentDirection, distance, now) {
    const timeSinceLastAnnouncement = now - this.lastAnnouncementTime;
    const minimumInterval = 15000; // 15 seconds minimum between announcements
    
    // Always announce if direction changed significantly
    if (this.lastDirection && currentDirection !== this.lastDirection) {
      return timeSinceLastAnnouncement > 5000; // 5 second cooldown for direction changes
    }
    
    // Announce distance milestones every 100m if close, or every 500m if far
    const milestone = distance < 0.5 ? 0.1 : 0.5; // 100m or 500m
    const timeForDistance = distance < 0.5 ? 30000 : 60000; // 30s or 60s intervals
    
    return timeSinceLastAnnouncement > timeForDistance;
  }

  // Announce direction updates during navigation
  announceDirectionUpdate(directionInfo, distance) {
    if (typeof speechManager === 'undefined') return;

    const distanceText = distance < 1 ? 
      `${Math.round(distance * 1000)} meters` : 
      `${distance.toFixed(1)} kilometers`;

    let message;
    if (distance < 0.05) { // Less than 50m
      message = `Almost there! Continue ${directionInfo.direction.name.toLowerCase()} for ${Math.round(distance * 1000)} meters.`;
    } else if (distance < 0.2) { // Less than 200m
      message = `Continue ${directionInfo.direction.name.toLowerCase()}. Destination ${Math.round(distance * 1000)} meters ahead.`;
    } else {
      message = `Keep heading ${directionInfo.direction.name.toLowerCase()}. ${distanceText} remaining.`;
    }

    speechManager.speak(message);
  }

  // Announce when destination is reached
  announceDestinationReached() {
    this.reachedDestination = true;
    this.routeStarted = false;
    
    if (typeof speechManager !== 'undefined') {
      speechManager.speak('Destination reached! You have arrived at your location.');
    }
    
    // Update UI
    this.showRouteInfo(`
      <strong>🎯 Destination Reached!</strong><br>
      You have successfully arrived at your destination.<br>
      <em>Real-time navigation completed</em>
    `, 'success');
    
    // Clear navigation state but keep route visible
    setTimeout(() => {
      this.hideCompass();
    }, 5000);
  }

  // Update navigation progress in UI
  updateNavigationProgress(directionInfo, distance) {
    const progressElement = document.getElementById('navigationProgress');
    if (progressElement) {
      const distanceText = distance < 1 ? 
        `${Math.round(distance * 1000)}m` : 
        `${distance.toFixed(1)}km`;
      
      progressElement.innerHTML = `
        <strong>📍 Current Direction:</strong> ${directionInfo.direction.emoji} ${directionInfo.direction.name}<br>
        <strong>📏 Distance Remaining:</strong> ${distanceText}<br>
        <strong>🧭 Bearing:</strong> ${directionInfo.bearing}°
      `;
    }
  }

  // Show route information
  showRouteInfo(message, type = 'info') {
    const routeInfo = document.getElementById('routeInfo');
    if (routeInfo) {
      routeInfo.innerHTML = message;
      routeInfo.className = `route-info ${type}`;
    }
  }
}

// Create global instance
const routingManager = new RoutingManager();
