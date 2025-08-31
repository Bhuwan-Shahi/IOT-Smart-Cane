// Location Management Module
class LocationManager {
  constructor() {
    this.currentLocation = null;
    this.watchId = null;
  }

  // Get high-accuracy location with multiple attempts
  async getHighAccuracyLocation() {
    const statusElement = document.getElementById('status');
    
    if (!navigator.geolocation) {
      this.showStatus('Geolocation is not supported by this browser.', 'error');
      return null;
    }

    this.showStatus('Getting high-accuracy location...', 'info');
    
    let bestPosition = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    return new Promise((resolve, reject) => {
      const tryGetLocation = () => {
        attempts++;
        this.showStatus(`Getting location... (attempt ${attempts}/${maxAttempts})`, 'info');
        
        const options = {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        };
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const accuracy = position.coords.accuracy;
            this.showStatus(`Location found (accuracy: ${Math.round(accuracy)}m)`, 'success');
            
            if (!bestPosition || accuracy < bestPosition.coords.accuracy) {
              bestPosition = position;
            }
            
            if (accuracy < 20 || attempts >= maxAttempts) {
              const location = {
                lat: bestPosition.coords.latitude,
                lng: bestPosition.coords.longitude,
                accuracy: bestPosition.coords.accuracy
              };
              
              this.currentLocation = location;
              this.showStatus(`Location updated! (accuracy: ${Math.round(accuracy)}m)`, 'success');
              resolve(location);
            } else {
              setTimeout(tryGetLocation, 1000);
            }
          },
          (error) => {
            if (attempts < maxAttempts) {
              setTimeout(tryGetLocation, 2000);
            } else {
              const errorMessage = this.getErrorMessage(error);
              this.showStatus(errorMessage, 'error');
              reject(error);
            }
          },
          options
        );
      };
      
      tryGetLocation();
    });
  }

  // Get approximate location from IP
  async getLocationFromIP() {
    try {
      this.showStatus('Getting approximate location from IP...', 'info');
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      if (data.latitude && data.longitude) {
        const location = {
          lat: parseFloat(data.latitude),
          lng: parseFloat(data.longitude),
          city: data.city,
          country: data.country
        };
        
        this.currentLocation = location;
        this.showStatus(`Approximate location: ${data.city}, ${data.country}`, 'success');
        return location;
      }
      throw new Error('IP location data not available');
    } catch (error) {
      console.error('IP location failed:', error);
      this.showStatus('IP location failed', 'error');
      return null;
    }
  }

  // Send location to Firebase
  async sendToFirebase(location) {
    try {
      await database.ref('GPS_Data').set({
        Latitude: location.lat,
        Longitude: location.lng,
        timestamp: Date.now()
      });
      console.log('Location sent to Firebase successfully');
      return true;
    } catch (error) {
      console.error('Error sending location to Firebase:', error);
      this.showStatus('Error sending to Firebase', 'error');
      return false;
    }
  }

  // Start watching position
  startWatching() {
    if (!navigator.geolocation) {
      this.showStatus('Geolocation not supported', 'error');
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    };

    this.watchId = navigator.geolocation.watchPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        
        this.currentLocation = location;
        this.sendToFirebase(location);
      },
      (error) => {
        console.error('Watch position error:', error);
      },
      options
    );
  }

  // Stop watching position
  stopWatching() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Utility methods
  getErrorMessage(error) {
    switch(error.code) {
      case error.PERMISSION_DENIED:
        return 'Location permission denied. Please allow location access.';
      case error.POSITION_UNAVAILABLE:
        return 'Location unavailable. Try going outside or near a window.';
      case error.TIMEOUT:
        return 'Location timeout. Please try again.';
      default:
        return 'Location error. Please try again.';
    }
  }

  showStatus(message, type = 'info') {
    const statusElement = document.getElementById('status');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `status-message ${type}`;
    }
  }

  getCurrentLocation() {
    return this.currentLocation;
  }
}

// Create global instance
const locationManager = new LocationManager();
