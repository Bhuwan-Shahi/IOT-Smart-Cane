// Main Application Controller
class SmartCaneApp {
  constructor() {
    this.isFirebaseConnected = false;
    this.dataUpdateInterval = null;
  }

  // Initialize application
  async initialize() {
    try {
      this.setupFirebaseDataListener();
      this.setupEventListeners();
      this.initializeSpeech();
      
      // Try to get initial location after a short delay
      setTimeout(() => {
        this.checkAndPromptLocation();
      }, 3000);
      
      if (typeof logger !== 'undefined') {
        logger.info('Smart Cane App initialized');
      } else {
        console.log('Smart Cane App initialized');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      this.showStatus('App initialization failed', 'error');
    }
  }

    // Check if location is available and prompt user if needed
  async checkAndPromptLocation() {
    const locationNameElement = document.getElementById('locationName');
    
    // If still loading after 3 seconds, try to get location automatically
    if (locationNameElement && locationNameElement.textContent === 'Loading...') {
      if (typeof logger !== 'undefined') {
        logger.log('No location data, attempting to get current location...');
      }
      
      try {
        // Try to get location automatically
        await this.handleGetCurrentLocation();
      } catch (error) {
        if (typeof logger !== 'undefined') {
          logger.log('Auto-location failed, showing manual prompt');
        }
        this.showStatus('Click "Get Current Location" to start navigation', 'info');
      }
    }
  }

  // Initialize speech functionality
  initializeSpeech() {
    // Add speech toggle function to global scope
    window.toggleSpeech = () => {
      const isEnabled = speechManager.toggle();
      const button = document.getElementById('speechToggle');
      
      if (button) {
        button.textContent = isEnabled ? '🔊 Voice On' : '🔇 Voice Off';
        button.classList.toggle('disabled', !isEnabled);
      }
      
      // Initialize speech with user interaction when first enabled
      if (isEnabled) {
        speechManager.initializeWithUserInteraction();
        setTimeout(() => speechManager.speak('Voice navigation enabled'), 300);
      }
    };
    
        // Add click listeners to initialize speech on first user interaction
    document.addEventListener('click', () => {
      if (speechManager && !speechManager.userInteractionDone) {
        logger.log('First user click - initializing speech...');
        speechManager.initializeWithUserInteraction();
        speechManager.userInteractionDone = true;
      }
    }, { once: true });
    
    // Initial speech test (delayed to allow for voice loading)
    setTimeout(() => {
      if (speechManager.isEnabled) {
        logger.log('Testing initial speech...');
        speechManager.test();
      }
    }, 3000);
  }

  // Show status message to user
  showStatus(message, type = 'info') {
    if (typeof logger !== 'undefined') {
      logger.log(`Status (${type}): ${message}`);
    }
    
    const statusElement = document.getElementById('statusMessage');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
      
      // Auto-hide after 5 seconds for non-error messages
      if (type !== 'error') {
        setTimeout(() => {
          statusElement.classList.add('hidden');
        }, 5000);
      }
    }
  }

  // Setup event listeners for UI components
  setupEventListeners() {
    // Make sure DOM is loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
      return;
    }
    
    try {
      // Route to destination button
      const routeBtn = document.getElementById('findRoute');
      if (routeBtn) {
        routeBtn.addEventListener('click', () => {
          this.handleFindRoute();
        });
      }
      
      // Clear route button
      const clearRouteBtn = document.getElementById('clearRoute');
      if (clearRouteBtn) {
        clearRouteBtn.addEventListener('click', () => {
          this.handleClearRoute();
        });
      }
      
      // Test speech button
      const testSpeechBtn = document.getElementById('testSpeech');
      if (testSpeechBtn) {
        testSpeechBtn.addEventListener('click', () => {
          if (typeof speechManager !== 'undefined') {
            speechManager.test();
          }
        });
      }
      
      // Location control buttons - using correct IDs from HTML
      const getCurrentLocationBtn = document.getElementById('getCurrentLocation');
      if (getCurrentLocationBtn) {
        getCurrentLocationBtn.addEventListener('click', () => {
          this.handleGetCurrentLocation();
        });
      }
      
      const refreshLocationBtn = document.getElementById('refreshLocation');
      if (refreshLocationBtn) {
        refreshLocationBtn.addEventListener('click', () => {
          this.handleRefreshLocation();
        });
      }
      
    } catch (error) {
      logger.error('Error setting up event listeners:', error);
    }
  }

  // Setup Firebase real-time data listener
  setupFirebaseDataListener() {
    gpsDataRef.on('value', (snapshot) => {
      const data = snapshot.val();
      if (typeof logger !== 'undefined') {
        logger.log('Firebase data received:', data);
      }
      
      if (data && data.Latitude && data.Longitude) {
        this.updateLocationDisplay(data);
        
        const location = {
          lat: parseFloat(data.Latitude),
          lng: parseFloat(data.Longitude),
          source: 'firebase'
        };
        
        if (!isNaN(location.lat) && !isNaN(location.lng)) {
          locationManager.currentLocation = location;
          mapManager.updateCurrentLocation(location);
          this.showStatus('Location updated from device', 'success');
          
          // Speak location update (only first time or significant changes)
          if (typeof speechManager !== 'undefined' && !this.hasSpokenLocationUpdate) {
            speechManager.speak('GPS location updated');
            this.hasSpokenLocationUpdate = true;
          }
        }
      } else {
        this.showStatus('Waiting for GPS data from device...', 'info');
      }
    }, (error) => {
      if (typeof logger !== 'undefined') {
        logger.error('Firebase data listener error:', error);
      } else {
        console.error('Firebase data listener error:', error);
      }
      this.showStatus('Connection error with GPS device', 'error');
    });
  }

  // Setup fallback message if no Firebase data
  setupLocationFallback() {
    setTimeout(() => {
      const locationNameElement = document.getElementById('locationName');
      if (locationNameElement && locationNameElement.textContent === 'Loading...') {
        this.showStatus('No device data found. Use "Get Current Location" to start.', 'warning');
        
        // Update UI to show manual location prompt
        locationNameElement.textContent = 'No GPS Device';
        const coordinatesElement = document.getElementById('coordinates');
        if (coordinatesElement) coordinatesElement.textContent = 'Click "Get Current Location"';
        
        const sourceElement = document.getElementById('locationSource');
        if (sourceElement) {
          sourceElement.textContent = 'MANUAL';
          sourceElement.className = 'value source manual';
        }
        
        const accuracyElement = document.getElementById('locationAccuracy');
        if (accuracyElement) {
          accuracyElement.textContent = 'Use GPS Button';
          accuracyElement.className = 'value accuracy low';
        }
      }
    }, 5000);
  }

  // Handle get current location button
  async handleGetCurrentLocation() {
    logger.info('Getting current location...');
    
    // Show loading state
    const locationNameElement = document.getElementById('locationName');
    const coordinatesElement = document.getElementById('coordinates');
    const sourceElement = document.getElementById('locationSource');
    
    if (locationNameElement) locationNameElement.textContent = 'Getting location...';
    if (coordinatesElement) coordinatesElement.textContent = 'Please wait...';
    if (sourceElement) sourceElement.textContent = 'GPS';
    
    this.showStatus('Getting your current location...', 'info');
    
    try {
      const location = await locationManager.getHighAccuracyLocation();
      if (location) {
        await this.updateLocationDisplay({
          Latitude: location.lat,
          Longitude: location.lng
        }, 'gps', location.accuracy);
        
        mapManager.updateCurrentLocation(location);
        
        // Optionally send to Firebase
        await locationManager.sendToFirebase(location);
        
        this.showStatus('Current location detected successfully', 'success');
        
        // Speak location confirmation with location name
        if (typeof speechManager !== 'undefined') {
          const locationInfo = await locationManager.reverseGeocode(location.lat, location.lng);
          speechManager.speak(`Current location detected: ${locationInfo.formatted}`);
        }
      } else {
        throw new Error('Location data not available');
      }
    } catch (error) {
      this.showStatus('Failed to get current location: ' + error.message, 'error');
      
      // Show error state
      if (locationNameElement) locationNameElement.textContent = 'Location Error';
      if (coordinatesElement) coordinatesElement.textContent = 'Permission denied or unavailable';
      
      // Speak error
      if (typeof speechManager !== 'undefined') {
        speechManager.speakAlert('Failed to get location. Please check permissions and try again.');
      }
    }
  }

  // Handle get IP location button
  async handleGetIPLocation() {
    const location = await locationManager.getLocationFromIP();
    if (location) {
      await this.updateLocationDisplay({
        Latitude: location.lat,
        Longitude: location.lng
      }, 'ip');
      
      mapManager.updateCurrentLocation(location);
      this.showStatus('Approximate location from IP address', 'warning');
      
      // Speak IP location with location name
      if (typeof speechManager !== 'undefined') {
        const locationInfo = await locationManager.reverseGeocode(location.lat, location.lng);
        speechManager.speak(`Approximate location detected: ${locationInfo.formatted}`);
      }
      
      // Optionally send to Firebase
      await locationManager.sendToFirebase(location);
    } else {
      this.showStatus('Failed to get location from IP', 'error');
    }
  }

    // Handle refresh location button
  async handleRefreshLocation() {
    this.showStatus('Refreshing location data...', 'info');
    
    try {
      // Re-initialize Firebase listener
      await this.setupFirebaseDataListener();
      this.showStatus('Location data refreshed successfully', 'success');
      
      // Speak refresh confirmation
      if (typeof speechManager !== 'undefined') {
        speechManager.speak('Location data refreshed');
      }
    } catch (error) {
      this.showStatus('Failed to refresh location data', 'error');
      
      // Speak error
      if (typeof speechManager !== 'undefined') {
        speechManager.speakAlert('Failed to refresh location data');
      }
    }
  }

  // Called when location updates (for real-time navigation)
  onLocationUpdate(location) {
    // Update the location display
    this.updateLocationDisplay({
      Latitude: location.lat,
      Longitude: location.lng
    }, 'gps', location.accuracy);
    
    // Update map
    if (typeof mapManager !== 'undefined') {
      mapManager.updateCurrentLocation(location);
    }
  }

    // Handle find route button
  async handleFindRoute() {
    logger.info('Find route requested');
    
    try {
      const destination = document.getElementById('destinationInput').value;
      
      if (!destination || !destination.trim()) {
        this.showStatus('Please enter a destination', 'warning');
        return;
      }
      
      if (typeof routingManager === 'undefined') {
        logger.error('Routing manager not available');
        this.showStatus('Navigation system not available', 'error');
        return;
      }
      
      this.showStatus('Finding route...', 'info');
      await routingManager.findRoute(destination);
      
    } catch (error) {
      logger.error('Error in handleFindRoute:', error);
      this.showStatus('Failed to find route: ' + error.message, 'error');
    }
  }

  // Handle clear route button
  handleClearRoute() {
    routingManager.clearRoute();
  }

  // Update location display in UI with address information
  async updateLocationDisplay(data, source = 'firebase', accuracy = null) {
    try {
      if (data.Latitude && data.Longitude) {
        const lat = parseFloat(data.Latitude);
        const lng = parseFloat(data.Longitude);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Get location name using reverse geocoding
          const locationInfo = await locationManager.reverseGeocode(lat, lng);
          
          // Update location name
          const locationNameElement = document.getElementById('locationName');
          if (locationNameElement) {
            locationNameElement.textContent = locationInfo.formatted;
            locationNameElement.title = locationInfo.full; // Tooltip with full address
          }
          
          // Update coordinates
          const coordinatesElement = document.getElementById('coordinates');
          if (coordinatesElement) {
            coordinatesElement.textContent = locationInfo.coordinates;
          }
          
          // Update source
          const sourceElement = document.getElementById('locationSource');
          if (sourceElement) {
            sourceElement.textContent = source.toUpperCase();
            sourceElement.className = `value source ${source}`;
          }
          
          // Update accuracy
          const accuracyElement = document.getElementById('locationAccuracy');
          if (accuracyElement) {
            let accuracyText = 'Unknown';
            let accuracyClass = 'low';
            
            if (accuracy !== null) {
              if (accuracy < 10) {
                accuracyText = `High (±${Math.round(accuracy)}m)`;
                accuracyClass = 'high';
              } else if (accuracy < 50) {
                accuracyText = `Medium (±${Math.round(accuracy)}m)`;
                accuracyClass = 'medium';
              } else {
                accuracyText = `Low (±${Math.round(accuracy)}m)`;
                accuracyClass = 'low';
              }
            } else if (source === 'firebase') {
              accuracyText = 'GPS Device';
              accuracyClass = 'high';
            } else if (source === 'ip') {
              accuracyText = 'Approximate';
              accuracyClass = 'low';
            }
            
            accuracyElement.textContent = accuracyText;
            accuracyElement.className = `value accuracy ${accuracyClass}`;
          }
          
          return locationInfo;
        }
      }
      
      // Fallback for invalid data
      this.updateLocationDisplayFallback(data);
      return null;
      
    } catch (error) {
      this.updateLocationDisplayFallback({ error: error.message });
      return null;
    }
  }

  // Fallback for invalid location data
  updateLocationDisplayFallback(data) {
    const locationNameElement = document.getElementById('locationName');
    const coordinatesElement = document.getElementById('coordinates');
    const sourceElement = document.getElementById('locationSource');
    const accuracyElement = document.getElementById('locationAccuracy');
    
    if (locationNameElement) locationNameElement.textContent = data.Latitude || 'Location Error';
    if (coordinatesElement) coordinatesElement.textContent = data.Longitude || 'No Coordinates';
    if (sourceElement) sourceElement.textContent = 'ERROR';
    if (accuracyElement) accuracyElement.textContent = 'Unknown';
  }

  // Show status message
  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
    }
  }

  // Get current application state
  getState() {
    return {
      currentLocation: locationManager.getCurrentLocation(),
      isFirebaseConnected: this.isFirebaseConnected,
      hasRoute: routingManager.currentRoute !== null
    };
  }

  // Emergency/panic mode (future feature)
  activateEmergencyMode() {
    const currentLocation = locationManager.getCurrentLocation();
    if (currentLocation) {
      // Send emergency location to Firebase with priority
      database.ref('Emergency').set({
        ...currentLocation,
        timestamp: Date.now(),
        status: 'EMERGENCY'
      });
      
      this.showStatus('Emergency mode activated! Location sent.', 'error');
    }
  }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new SmartCaneApp();
  app.initialize();
  
  // Make app globally available for debugging
  window.smartCaneApp = app;
  window.app = app; // Also assign to window.app for compatibility
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment when service worker is implemented
    // navigator.serviceWorker.register('/sw.js');
  });
}
