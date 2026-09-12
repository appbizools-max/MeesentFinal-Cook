# Meesent Backend Server

Backend server for Meesent app payment integration with Razorpay.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Start the server:
```bash
npm start
```

The server will run on `http://0.0.0.0:3000` and be accessible at `http://YOUR_LOCAL_IP:3000`.

## Configuration

The server uses Razorpay Test Mode credentials configured in `server.js`:
- Key ID: `rzp_test_SsPRQGZNiawZGR`
- Key Secret: `k2G9mzv7L1Zru2CKLXSUf4q1`

## API Endpoints

### Health Check
```
GET /
```

### Create Order
```
POST /api/create-order
Body: {
  "amount": 99,
  "currency": "INR",
  "receipt": "receipt_123"
}
```

### Create Payment Link
```
POST /api/create-payment-link
Body: {
  "amount": 99,
  "description": "Payment for services"
}
```

### Verify Payment
```
POST /api/verify-payment
Body: {
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

## Frontend Configuration

Update the backend URL in `src/config/backend.ts`:
```typescript
export const BACKEND_CONFIG = {
  API_URL: 'http://192.168.0.115:3000', // Change to your local IP
};
```

### Environment URLs:
- **Android Emulator**: `http://10.0.2.2:3000`
- **iOS Simulator**: `http://localhost:3000`
- **Physical Device**: `http://YOUR_MACHINE_IP:3000`
- **Production**: `https://your-backend-api.com`

## Get Your Local IP

Windows:
```bash
ipconfig
```

Mac/Linux:
```bash
ifconfig | grep "inet "
```

## Testing

Test the API with curl:
```bash
curl -X POST http://localhost:3000/api/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{"amount": 99, "description": "Test payment"}'
```
