-- Database setup for IoT Battery Tracker
-- Run this in your PostgreSQL database to create the required table

CREATE TABLE IF NOT EXISTS devices (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(255) UNIQUE NOT NULL,
    lat DECIMAL(10, 8) NOT NULL,
    lon DECIMAL(11, 8) NOT NULL,
    soc INTEGER, -- State of charge percentage
    v DECIMAL(5, 2), -- Voltage in volts
    t DECIMAL(5, 2), -- Temperature in Celsius
    ts BIGINT NOT NULL, -- Unix timestamp in seconds
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups by device_id
CREATE INDEX IF NOT EXISTS idx_devices_device_id ON devices(device_id);

-- Create index for faster lookups by timestamp
CREATE INDEX IF NOT EXISTS idx_devices_ts ON devices(ts);

-- Create index for faster lookups by location
CREATE INDEX IF NOT EXISTS idx_devices_location ON devices(lat, lon);

-- Insert some sample data for testing
INSERT INTO devices (device_id, lat, lon, soc, v, t, ts) VALUES
    ('test-device-001', 19.0760, 72.8777, 85, 3.8, 25.5, EXTRACT(EPOCH FROM NOW())),
    ('test-device-002', 28.7041, 77.1025, 72, 3.6, 28.2, EXTRACT(EPOCH FROM NOW())),
    ('test-device-003', 12.9716, 77.5946, 93, 4.1, 24.8, EXTRACT(EPOCH FROM NOW()))
ON CONFLICT (device_id) DO NOTHING;
