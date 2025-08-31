// Firebase Configuration
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

// Database references
const gpsDataRef = database.ref('GPS_Data');

// Connection monitoring
database.ref('.info/connected').on('value', function(snapshot) {
  const connectionStatus = document.getElementById('connectionStatus');
  if (snapshot.val() === true) {
    console.log('Connected to Firebase');
    connectionStatus.textContent = 'Connected';
    connectionStatus.className = 'status-indicator connected';
  } else {
    console.log('Disconnected from Firebase');
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'status-indicator disconnected';
  }
});

// Debug logging
console.log('Firebase initialized:', app);
console.log('Database reference:', gpsDataRef);
