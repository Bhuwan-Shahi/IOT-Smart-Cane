// Simple logging utility for Smart Cane
class Logger {
  static isDebugMode() {
    // Enable debug mode in development or when URL has ?debug=true
    return window.location.hostname === 'localhost' || 
           window.location.search.includes('debug=true');
  }

  static log(message, data = null) {
    if (this.isDebugMode()) {
      if (data) {
        console.log(message, data);
      } else {
        console.log(message);
      }
    }
  }

  static error(message, error = null) {
    // Always log errors, even in production
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }

  static warn(message, data = null) {
    // Always log warnings
    if (data) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }

  static info(message, data = null) {
    // Only important info messages
    if (data) {
      console.log('ℹ️', message, data);
    } else {
      console.log('ℹ️', message);
    }
  }
}

// Create global logger instance
window.logger = Logger;
