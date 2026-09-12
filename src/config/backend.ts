// Backend configuration for different environments
export const BACKEND_CONFIG = {
  // Update this based on your development environment:
  // - Android Emulator: http://10.0.2.2:3000
  // - iOS Simulator: http://localhost:3000
  // - Physical Device: http://YOUR_MACHINE_IP:3000 (e.g., http://192.168.0.118:3000)
  // - Production: https://your-backend-api.com
  
  // Current setup: Physical device/emulator using local IP
  API_URL: 'http://192.168.0.118:5000',
  
  // Alternative configurations (uncomment to use):
  // API_URL: 'http://10.0.2.2:3000',  // Android Emulator
  // API_URL: 'http://localhost:3000', // iOS Simulator or local testing
  // API_URL: 'https://api.meesent.com', // Production
};
