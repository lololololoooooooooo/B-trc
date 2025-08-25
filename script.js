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
            
            // Show error in device list
            const deviceList = document.getElementById('deviceList');
            if (deviceList) {
                deviceList.innerHTML = `<p style="color: red;">Error loading devices: ${error.message}</p>`;
            }
            
            // Retry after 5 seconds
            setTimeout(fetchDevices, 5000);
        }
    }
    
    // Update map and device list
    function updateMapAndList(devices) {
        debugLog('Updating with devices', devices);
        
        // Clear old markers
        Object.values(markers).forEach(marker => map.removeLayer(marker));
        markers = {}; // Reset markers object
        
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
            
            // Handle both data structures (direct or nested in data property)
            const deviceData = device.data || device;
            
            // Ensure device has required fields - use device_id as primary identifier
            if (!deviceData.device_id || !deviceData.lat || !deviceData.lon) {
                console.warn('Device missing required fields:', deviceData);
                return;
            }
            
            // Create marker
            const marker = L.marker([deviceData.lat, deviceData.lon]).addTo(map);
            marker.bindPopup(`
                <strong>${deviceData.device_id}</strong><br>
                SOC: ${deviceData.soc || 'N/A'}%<br>
                Voltage: ${deviceData.v || 'N/A'} V<br>
                Temp: ${deviceData.t || 'N/A'} °C
            `);
            markers[deviceData.device_id] = marker;
            
            // Update device info
            deviceInfo[deviceData.device_id] = deviceData;
            
            // Create device card
            const deviceCard = document.createElement('div');
            deviceCard.id = `device-${deviceData.device_id}`;
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <h3>${deviceData.device_id}</h3>
                <p><strong>SOC:</strong> ${deviceData.soc || 'N/A'}%</p>
                <p><strong>Voltage:</strong> ${deviceData.v || 'N/A'} V</p>
                <p><strong>Temp:</strong> ${deviceData.t || 'N/A'} °C</p>
                <p><strong>Location:</strong> ${deviceData.lat}, ${deviceData.lon}</p>
                <p><em>Last Updated: ${new Date(deviceData.ts * 1000 || Date.now()).toLocaleString()}</em></p>
            `;
            
            // Add click handler
            deviceCard.onclick = () => {
                map.setView([deviceData.lat, deviceData.lon], 13);
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
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
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
    
    // Set up periodic refresh
    setInterval(fetchDevices, 15000); // Refresh every 15 seconds
    
    // Uncomment to test database connection
    // testDatabase();
});
