document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    // Store markers and device info
    let markers = {};
    let deviceInfo = {};
    
    // Debug function to log data
    function debugLog(message, data) {
        console.log(`[DEBUG] ${message}:`, data);
    }
    
    // Fetch device data
    async function fetchDevices() {
        try {
            debugLog('Fetching devices...');
            const response = await fetch('/.netlify/functions/latest');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            debugLog('Received data', data);
            
            updateMapAndList(data);
        } catch (error) {
            console.error('Error fetching device data:', error);
            debugLog('Fetch error', error);
            setTimeout(fetchDevices, 5000);
        }
    }
    
    // Update map and device list
    function updateMapAndList(devices) {
        debugLog('Updating with devices', devices);
        
        // Clear old markers
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        
        // Update device list container
        const deviceList = document.getElementById('deviceList');
        if (!deviceList) {
            console.error('Device list container not found!');
            return;
        }
        
        // Clear existing device cards
        deviceList.innerHTML = '';
        
        if (!Array.isArray(devices) || devices.length === 0) {
            deviceList.innerHTML = '<p>No devices found</p>';
            debugLog('No devices to display');
            return;
        }
        
        // Update markers and device list
        devices.forEach(device => {
            debugLog('Processing device', device);
            
            // Ensure device has required fields
            if (!device.id || !device.lat || !device.lon) {
                console.warn('Device missing required fields:', device);
                return;
            }
            
            // Create marker
            const marker = L.marker([device.lat, device.lon]).addTo(map);
            marker.bindPopup(`
                <strong>${device.id}</strong><br>
                SOC: ${device.soc || 'N/A'}%<br>
                Voltage: ${device.v || 'N/A'} V<br>
                Temp: ${device.t || 'N/A'} °C
            `);
            markers[device.id] = marker;
            
            // Update device info
            deviceInfo[device.id] = device;
            
            // Create device card
            const deviceCard = document.createElement('div');
            deviceCard.id = `device-${device.id}`;
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <h3>${device.id}</h3>
                <p><strong>SOC:</strong> ${device.soc || 'N/A'}%</p>
                <p><strong>Voltage:</strong> ${device.v || 'N/A'} V</p>
                <p><strong>Temp:</strong> ${device.t || 'N/A'} °C</p>
                <p><strong>Location:</strong> ${device.lat}, ${device.lon}</p>
                <p><em>Last Updated: ${new Date(device.ts || Date.now()).toLocaleString()}</em></p>
            `;
            
            // Add click handler
            deviceCard.onclick = () => {
                map.setView([device.lat, device.lon], 13);
                marker.openPopup();
                
                // Highlight selected card
                document.querySelectorAll('.device-card').forEach(card => {
                    card.style.backgroundColor = '';
                });
                deviceCard.style.backgroundColor = '#e8f5e8';
            };
            
            // Add to device list
            deviceList.appendChild(deviceCard);
        });
        
        debugLog('Updated map and list with', devices.length, 'devices');
        setTimeout(fetchDevices, 15000); // Refresh every 15 seconds
    }
    
    // Test function to verify database connection
    async function testDatabase() {
        try {
            const testData = {
                id: "test-device-123",
                v: 3.7,
                t: 29.8,
                soc: 78,
                lat: 19.07,
                lon: 72.88,
                ts: Date.now()
            };
            
            debugLog('Testing database with test data', testData);
            
            const response = await fetch('/.netlify/functions/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Device-Token': 'batt_1234567890abcdef1234567890abcdef'
                },
                body: JSON.stringify(testData)
            });
            
            const result = await response.text();
            debugLog('Test ingest result', result);
            
            // Wait a moment then fetch latest data
            setTimeout(() => {
                fetchDevices();
            }, 2000);
            
        } catch (error) {
            console.error('Test failed:', error);
        }
    }
    
    // Start fetching data
    fetchDevices();
    
    // Uncomment to test database connection
    // testDatabase();
});
