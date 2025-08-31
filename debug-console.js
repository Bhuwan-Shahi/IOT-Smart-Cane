// Debug commands for Smart Cane
// Paste these in browser console (F12) to debug location issues

// 1. Check if all elements exist
function checkElements() {
    console.log('=== ELEMENT CHECK ===');
    const elements = {
        locationName: document.getElementById('locationName'),
        coordinates: document.getElementById('coordinates'),
        locationSource: document.getElementById('locationSource'),
        locationAccuracy: document.getElementById('locationAccuracy')
    };
    
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            console.log(`✅ ${key}:`, elements[key].textContent);
        } else {
            console.log(`❌ ${key}: Element not found`);
        }
    });
}

// 2. Test reverse geocoding directly
async function testGeocoding() {
    console.log('=== TESTING REVERSE GEOCODING ===');
    // Test with Kathmandu coordinates
    const lat = 27.6874917;
    const lng = 85.3480267;
    
    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'Smart-Cane-Navigation/1.0'
                }
            }
        );
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Geocoding response:', data);
            console.log('📍 Display name:', data.display_name);
        } else {
            console.error('❌ Geocoding failed:', response.status);
        }
    } catch (error) {
        console.error('❌ Geocoding error:', error);
    }
}

// 3. Force update location display
function forceLocationUpdate() {
    console.log('=== FORCING LOCATION UPDATE ===');
    const testData = {
        Latitude: 27.6874917,
        Longitude: 85.3480267
    };
    
    if (window.app) {
        app.updateLocationDisplay(testData, 'test');
        console.log('✅ Location update forced');
    } else {
        console.error('❌ App not found');
    }
}

// 4. Check Firebase connection
function checkFirebase() {
    console.log('=== FIREBASE CHECK ===');
    
    if (typeof firebase !== 'undefined') {
        console.log('✅ Firebase loaded');
        
        if (typeof gpsDataRef !== 'undefined') {
            console.log('✅ GPS data reference exists');
            
            // Try to read data once
            gpsDataRef.once('value', (snapshot) => {
                const data = snapshot.val();
                console.log('📊 Firebase data:', data);
            }).catch(error => {
                console.error('❌ Firebase read error:', error);
            });
        } else {
            console.error('❌ GPS data reference not found');
        }
    } else {
        console.error('❌ Firebase not loaded');
    }
}

// 5. Test manual location
async function testManualLocation() {
    console.log('=== TESTING MANUAL LOCATION ===');
    
    if (window.app) {
        try {
            await app.handleGetCurrentLocation();
            console.log('✅ Manual location attempt completed');
        } catch (error) {
            console.error('❌ Manual location failed:', error);
        }
    } else {
        console.error('❌ App not found');
    }
}

// 6. Run all tests
async function runAllTests() {
    console.log('🚀 Running all Smart Cane debug tests...');
    console.log('');
    
    checkElements();
    console.log('');
    
    await testGeocoding();
    console.log('');
    
    checkFirebase();
    console.log('');
    
    forceLocationUpdate();
    console.log('');
    
    console.log('✅ All tests completed. Check results above.');
}

// Auto-run basic checks
console.log('🔧 Smart Cane Debug Tools Loaded');
console.log('Available commands:');
console.log('- checkElements()');
console.log('- testGeocoding()');
console.log('- forceLocationUpdate()');
console.log('- checkFirebase()');
console.log('- testManualLocation()');
console.log('- runAllTests()');
console.log('');
console.log('Run runAllTests() to check everything at once.');
