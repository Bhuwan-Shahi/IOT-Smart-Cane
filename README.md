# Smart Cane Location Monitor

A web-based GPS tracking and navigation system designed for smart cane users, providing real-time location monitoring, navigation assistance, and accessibility features.

## 🌟 Features

### 📍 Location Tracking
- **Real-time GPS tracking** from ESP866 device via Firebase
- **High-accuracy location detection** using browser geolocation
- **IP-based location fallback** for indoor use
- **Live location updates** with accuracy indicators

### 🗺️ Navigation System
- **Destination search** with address geocoding
- **Road-based routing** using multiple routing services
- **Walking directions** optimized for pedestrians
- **Visual route guidance** with clear path indicators

### 🎯 Accessibility Features
- **Voice Navigation**: Text-to-speech functionality for hands-free navigation
- **Large, clear interface** with high contrast
- **Voice-friendly design** for screen readers
- **Simple navigation** with keyboard support
- **Audio feedback** for location updates and route guidance
- **Emergency mode** for safety (planned feature)

### 🔧 Technical Features
- **Modular architecture** with separated concerns
- **Responsive design** for mobile and desktop
- **Real-time Firebase integration**
- **Progressive Web App ready** (PWA features planned)

## 📁 Project Structure

```
smart-cane/
├── index.html              # Main application page
├── css/
│   └── styles.css          # Application styles
├── js/
│   ├── app.js             # Main application controller
│   ├── location.js        # Location management
│   ├── routing.js         # Navigation and routing
│   └── map.js             # Map management
├── config/
│   └── firebase.js        # Firebase configuration
├── assets/
│   └── images/            # Application images
└── README.md              # Project documentation
```

## 🚀 Getting Started

### Prerequisites
- Modern web browser with geolocation support
- Internet connection for maps and routing
- Firebase project (for device integration)

### Installation
1. Clone or download the project files
2. Update Firebase configuration in `config/firebase.js`
3. Serve files via HTTP server (required for geolocation)

### Running Locally
```bash
# Using Python
python3 -m http.server 8000

# Using Node.js
npx http-server

# Then open: http://localhost:8000
```

## 🔧 Configuration

### Firebase Setup
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable Realtime Database
3. Update `config/firebase.js` with your project credentials
4. Set database rules for read/write access

### Database Structure
```json
{
  "GPS_DATA": {
    "Latitude": 27.7172,
    "Longitude": 85.3240,
    "timestamp": 1635123456789
  }
}
```

## 🎮 Usage

### Basic Operation
1. **Get Location**: Click "Get Current Location" for GPS coordinates
2. **View Map**: Location appears on interactive map
3. **Navigate**: Enter destination and click "Find Route"
4. **Follow Route**: Blue line shows walking path with compass direction

### Voice Controls
- **🔊 Voice On/Off**: Toggle text-to-speech narration
- **🎤 Test Voice**: Check if speech is working
- **Automatic announcements**: Route found, direction changes, location updates
- **Voice feedback**: Spoken confirmation for all major actions

### Keyboard Shortcuts
- **Enter**: Find route (when destination input is focused)
- **Escape**: Clear current route (planned)

## 🛠️ API Services

### Routing Services (in priority order)
1. **OSRM** - Open Source Routing Machine (free)
2. **GraphHopper** - Routing API (free tier)
3. **OpenRouteService** - Routing API (free tier)
4. **Straight Line** - Fallback calculation

### Map Services
- **OpenStreetMap** - Base map tiles (free)
- **Leaflet.js** - Interactive map library

## 🔒 Privacy & Security

- **Location data** is only stored in your Firebase database
- **No third-party tracking** beyond necessary map services
- **Local processing** for most calculations
- **Secure HTTPS** connections for all external APIs

## 🚧 Planned Features

### Short Term
- [ ] Offline map caching
- [ ] Route sharing functionality
- [ ] Waypoint support
- [ ] Live traffic updates

### Long Term
- [ ] Emergency contact system
- [ ] Multiple language support
- [ ] Custom voice settings
- [ ] Integration with smart home devices
- [ ] Emergency contact integration

### Long Term
- [ ] Progressive Web App (PWA)
- [ ] Bluetooth integration with smart cane
- [ ] AI-powered route optimization
- [ ] Community features for shared routes

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📞 Support

For support, please contact:
- Email: support@smartcane.example.com
- Issues: Create a GitHub issue
- Documentation: Check the wiki

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- OpenStreetMap community for map data
- Firebase for real-time database
- Leaflet.js for mapping functionality
- Routing service providers (OSRM, GraphHopper, OpenRouteService)

---

**Built with ❤️ for accessibility and independence**
