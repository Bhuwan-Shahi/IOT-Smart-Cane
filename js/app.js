// Main Application Controller
class SmartCaneApp {
  constructor() {
    this.isFirebaseConnected = false;
    this.dataUpdateInterval = null;
  }

  // Initialize the application
  initialize() {
    this.setupEventListeners();
    this.setupFirebaseDataListener();
    this.setupLocationFallback();
    this.initializeSpeech();
    console.log('Smart Cane App initialized');
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
        console.log('🤝 First user click - initializing speech...');
        speechManager.initializeWithUserInteraction();
        speechManager.userInteractionDone = true;
      }
    }, { once: true });
    
    // Initial speech test (delayed to allow for voice loading)
    setTimeout(() => {
      if (speechManager.isEnabled) {
        console.log('🔊 Testing initial speech...');
        speechManager.test();
      }
    }, 3000);
  }

  // Setup all event listeners
  setupEventListeners() {
    // Location buttons
    document.getElementById('getCurrentLocation').addEventListener('click', 
      () => this.handleGetCurrentLocation());
    
    document.getElementById('getIPLocation').addEventListener('click', 
      () => this.handleGetIPLocation());

    // Navigation buttons
    document.getElementById('findRoute').addEventListener('click', 
      () => this.handleFindRoute());
    
    document.getElementById('clearRoute').addEventListener('click', 
      () => this.handleClearRoute());

    // Destination input - allow Enter key
    document.getElementById('destinationInput').addEventListener('keypress', 
      (e) => {
        if (e.key === 'Enter') {
          this.handleFindRoute();
        }
      });

    // Window resize handler for map
    window.addEventListener('resize', () => {
      mapManager.invalidateSize();
    });
  }

  // Setup Firebase real-time data listener
  setupFirebaseDataListener() {
    gpsDataRef.on('value', (snapshot) => {
      const data = snapshot.val();
      console.log('Firebase data received:', data);
      
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
        this.updateLocationDisplay({ Latitude: 'N/A', Longitude: 'N/A' });
      }
    }, (error) => {
      console.error("Firebase error: ", error);
      this.updateLocationDisplay({ Latitude: 'Error', Longitude: 'Error' });
      this.showStatus('Firebase connection error: ' + error.message, 'error');
    });
  }

  // Setup fallback message if no Firebase data
  setupLocationFallback() {
    setTimeout(() => {
      const latElement = document.getElementById('latitude');
      if (latElement && latElement.textContent === 'Loading...') {
        this.showStatus('No device data found. Use "Get Current Location" to start.', 'warning');
      }
    }, 5000);
  }

  // Handle get current location button
  async handleGetCurrentLocation() {
    try {
      const location = await locationManager.getHighAccuracyLocation();
      if (location) {
        this.updateLocationDisplay({
          Latitude: location.lat,
          Longitude: location.lng
        });
        
        mapManager.updateCurrentLocation(location);
        
        // Optionally send to Firebase
        await locationManager.sendToFirebase(location);
        
        // Speak location confirmation
        if (typeof speechManager !== 'undefined') {
          speechManager.speak('Current location detected successfully');
        }
      }
    } catch (error) {
      console.error('Error getting current location:', error);
      this.showStatus('Failed to get current location: ' + error.message, 'error');
      
      // Speak error
      if (typeof speechManager !== 'undefined') {
        speechManager.speakAlert('Failed to get location. Please try again.');
      }
    }
  }

  // Handle get IP location button
  async handleGetIPLocation() {
    const location = await locationManager.getLocationFromIP();
    if (location) {
      this.updateLocationDisplay({
        Latitude: location.lat,
        Longitude: location.lng
      });
      
      mapManager.updateCurrentLocation(location);
      
      // Optionally send to Firebase
      await locationManager.sendToFirebase(location);
    }
  }

  // Handle find route button
  async handleFindRoute() {
    const destination = document.getElementById('destinationInput').value;
    await routingManager.findRoute(destination);
  }

  // Handle clear route button
  handleClearRoute() {
    routingManager.clearRoute();
  }

  // Update location display in UI
  updateLocationDisplay(data) {
    const latElement = document.getElementById('latitude');
    const lngElement = document.getElementById('longitude');
    
    if (latElement) latElement.textContent = data.Latitude || 'N/A';
    if (lngElement) lngElement.textContent = data.Longitude || 'N/A';
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
});

// Service Worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Uncomment when service worker is implemented
    // navigator.serviceWorker.register('/sw.js');
  });
}
