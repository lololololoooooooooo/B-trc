document.addEventListener('DOMContentLoaded', () => {
    // Initialize the map
    const map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Store markers and device info
    let markers = {};
    let deviceInfo = {};

    // Fetch device data
    async function fetchDevices() {
        try {
            const response = await fetch('/.netlify/functions/latest');
            const data = await response.json();

            updateMapAndList(data);
        } catch (error) {
            console.error('Error fetching device data:', error);
            setTimeout(fetchDevices, 5000);
        }
    }

    // Update map and device list
    function updateMapAndList(devices) {
        // Clear old markers
        Object.values(markers).forEach(marker => map.removeLayer(marker));

        // Update markers and device list
        devices.forEach(device => {
            // Create marker
            const marker = L.marker([device.lat, device.lon]).addTo(map);
            marker.bindPopup(`
                <strong>${device.id}</strong><br>
                SOC: ${device.soc}%<br>
                Voltage: ${device.v} V<br>
                Temp: ${device.t} °C
            `);

            markers[device.id] = marker;

            // Update or add device info
            deviceInfo[device.id] = device;

            // Create or update device card
            const deviceCard = document.getElementById(`device-${device.id}`) || document.createElement('div');
            deviceCard.id = `device-${device.id}`;
            deviceCard.className = 'device-card';
            deviceCard.innerHTML = `
                <h3>${device.id}</h3>
                <p>SOC: ${device.soc}%</p>
                <p>Voltage: ${device.v} V</p>
                <p>Temp: ${device.t} °C</p>
                <p>Last Updated: ${new Date(device.ts * 1000).toLocaleTimeString()}</p>
            `;
            deviceCard.onclick = () => {
                map.setView([device.lat, device.lon], 13);
                marker.openPopup();
            };

            // Add to device list if not already present
            if (!document.getElementById(`device-${device.id}`)) {
                document.getElementById('deviceList').appendChild(deviceCard);
            }
        });

        // Remove devices that are no longer in the data
        Object.keys(markers).forEach(id => {
            if (!devices.some(device => device.id === id)) {
                map.removeLayer(markers[id]);
                delete markers[id];
                const deviceCard = document.getElementById(`device-${id}`);
                if (deviceCard) deviceCard.remove();
                delete deviceInfo[id];
            }
        });

        setTimeout(fetchDevices, 15000);
    }

    // Start fetching data
    fetchDevices();
});
