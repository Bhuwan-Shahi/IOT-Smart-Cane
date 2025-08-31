/**
 * Speech Manager for Smart Cane
 * Handles text-to-speech functionality for voice navigation
 */

class SpeechManager {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.isEnabled = true;
    this.voice = null;
    this.volume = 0.8;
    this.rate = 0.9; // Slightly slower for better comprehension
    this.pitch = 1.0;
    
    this.init();
  }

  // Initialize speech synthesis
  init() {
    if (!this.synthesis) {
      console.warn('Speech synthesis not supported in this browser');
      this.isEnabled = false;
      return;
    }

    console.log('🔊 Speech synthesis initialized');
    
    // Wait for voices to load
    if (this.synthesis.getVoices().length === 0) {
      console.log('⏳ Waiting for voices to load...');
      this.synthesis.addEventListener('voiceschanged', () => {
        console.log('✅ Voices loaded, setting up voice...');
        this.setupVoice();
      });
    } else {
      console.log('✅ Voices already available, setting up voice...');
      this.setupVoice();
    }
  }

  // Setup preferred voice
  setupVoice() {
    const voices = this.synthesis.getVoices();
    console.log(`📢 Found ${voices.length} available voices:`, voices.map(v => `${v.name} (${v.lang})`));
    
    // Prefer English voices
    this.voice = voices.find(voice => 
      voice.lang.startsWith('en') && voice.localService
    ) || voices.find(voice => 
      voice.lang.startsWith('en')
    ) || voices[0];

    console.log('🎯 Selected voice:', this.voice?.name || 'Default', this.voice?.lang || 'unknown');
    
    if (voices.length === 0) {
      console.warn('⚠️ No voices available! Speech may not work.');
    }
  }

  // Speak text with options
  speak(text, options = {}) {
    console.log('🗣️ Attempting to speak:', text);
    
    if (!this.synthesis) {
      console.error('❌ Speech synthesis not available');
      return;
    }
    
    if (!this.isEnabled) {
      console.log('🔇 Speech is disabled');
      return;
    }
    
    if (!text) {
      console.error('❌ No text provided to speak');
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply voice settings
    if (this.voice) {
      utterance.voice = this.voice;
      console.log('🎤 Using voice:', this.voice.name);
    } else {
      console.warn('⚠️ No voice selected, using default');
    }
    
    utterance.volume = options.volume || this.volume;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    
    console.log(`🔊 Speech settings: volume=${utterance.volume}, rate=${utterance.rate}, pitch=${utterance.pitch}`);

    // Event handlers
    utterance.onstart = () => {
      console.log('▶️ Speech started:', text);
    };

    utterance.onerror = (event) => {
      console.error('❌ Speech error:', event.error, event);
    };

    utterance.onend = () => {
      console.log('✅ Speech completed');
    };

    console.log('🚀 Starting speech synthesis...');
    this.synthesis.speak(utterance);
  }

  // Stop current speech
  stop() {
    if (this.synthesis.speaking) {
      this.synthesis.cancel();
    }
  }

  // Toggle speech on/off
  toggle() {
    this.isEnabled = !this.isEnabled;
    if (!this.isEnabled) {
      this.stop();
    }
    return this.isEnabled;
  }

  // Speak route information
  speakRoute(routeInfo) {
    const message = `Route found. ${routeInfo.instruction}. 
                    Distance: ${routeInfo.distance < 1 ? 
                      Math.round(routeInfo.distance * 1000) + ' meters' : 
                      routeInfo.distance.toFixed(1) + ' kilometers'}.
                    Direction: ${routeInfo.direction}.`;
    
    this.speak(message, { rate: 0.8 });
  }

  // Speak direction updates
  speakDirection(directionInfo) {
    const distance = directionInfo.distance;
    const distanceText = distance < 0.1 ? 
      'You have arrived at your destination' :
      distance < 1 ? 
        `${Math.round(distance * 1000)} meters ahead` :
        `${distance.toFixed(1)} kilometers ahead`;

    const message = `${directionInfo.instruction}. ${distanceText}.`;
    this.speak(message, { rate: 0.9 });
  }

  // Speak warnings or alerts
  speakAlert(message, priority = 'normal') {
    const options = priority === 'urgent' ? 
      { rate: 1.1, pitch: 1.2, volume: 1.0 } : 
      { rate: 0.9 };
    
    this.speak(message, options);
  }

  // Speak location information
  speakLocation(location) {
    if (location.address) {
      this.speak(`Current location: ${location.address}`);
    } else {
      this.speak(`Current coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`);
    }
  }

  // Speak connection status
  speakConnectionStatus(isConnected) {
    const message = isConnected ? 
      'GPS tracking connected' : 
      'Warning: GPS tracking disconnected';
    
    this.speak(message, { 
      rate: 0.8, 
      pitch: isConnected ? 1.0 : 1.3 
    });
  }

  // Get available voices for settings
  getAvailableVoices() {
    return this.synthesis.getVoices().filter(voice => 
      voice.lang.startsWith('en')
    );
  }

  // Set voice by name
  setVoice(voiceName) {
    const voices = this.synthesis.getVoices();
    this.voice = voices.find(voice => voice.name === voiceName) || this.voice;
  }

  // Adjust speech settings
  setSettings(settings) {
    if (settings.volume !== undefined) this.volume = Math.max(0, Math.min(1, settings.volume));
    if (settings.rate !== undefined) this.rate = Math.max(0.1, Math.min(10, settings.rate));
    if (settings.pitch !== undefined) this.pitch = Math.max(0, Math.min(2, settings.pitch));
  }

  // Test speech
  test() {
    console.log('🧪 Testing speech synthesis...');
    
    // Force voice loading if needed
    if (this.synthesis.getVoices().length === 0) {
      console.log('🔄 Forcing voice reload...');
      this.setupVoice();
    }
    
    this.speak('Smart Cane navigation system ready. Speech is working correctly.');
  }

  // Initialize speech with user interaction
  initializeWithUserInteraction() {
    console.log('🤝 Initializing speech with user interaction...');
    
    // Try to speak a short phrase to initialize the speech system
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0.1; // Very quiet
    this.synthesis.speak(utterance);
    
    // Then set up voices
    setTimeout(() => {
      this.setupVoice();
    }, 100);
  }
}

// Create global instance
const speechManager = new SpeechManager();
