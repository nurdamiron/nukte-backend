import axios from 'axios';

const API_BASE = 'http://localhost:5002/api';

async function testFailingEndpoints() {
  console.log('Testing failing endpoints...\n');

  // First, register and login
  const userCreds = {
    email: `test.${Date.now()}@nukte.kz`,
    password: 'Test123!',
    name: 'Test User',
    role: 'both'
  };

  try {
    // Register
    const registerRes = await axios.post(`${API_BASE}/auth/register`, userCreds);
    console.log('✅ Registration successful');
    
    const accessToken = registerRes.data.data.accessToken;
    const refreshToken = registerRes.data.data.refreshToken;
    
    // Test 1: Refresh token with correct body
    console.log('\n1. Testing POST /auth/refresh with refreshToken in body:');
    try {
      const refreshRes = await axios.post(`${API_BASE}/auth/refresh`, {
        refreshToken: refreshToken
      });
      console.log('✅ Refresh token successful:', refreshRes.data);
    } catch (error: any) {
      console.log('❌ Refresh token failed:', error.response?.status, error.response?.data);
    }

    // Test 2: Create listing
    console.log('\n2. Testing POST /listings:');
    const listingData = {
      title: 'Test Studio',
      description: 'This is a test studio with all necessary equipment for professional photo shoots',
      category: 'Студия',
      address: 'Test Street 123',
      city: 'Алматы',
      area: 80,
      maxGuests: 10,
      pricePerHour: 7000,
      amenities: ['wifi', 'parking'],
      rules: 'Test rules'
    };
    
    try {
      const listingRes = await axios.post(`${API_BASE}/listings`, listingData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Create listing successful:', listingRes.data);
    } catch (error: any) {
      console.log('❌ Create listing failed:', error.response?.status, error.response?.data);
    }

    // Test 3: Get reviews for listing
    console.log('\n3. Testing GET /reviews/listing/1:');
    try {
      const reviewsRes = await axios.get(`${API_BASE}/reviews/listing/1`);
      console.log('✅ Get listing reviews successful:', reviewsRes.data);
    } catch (error: any) {
      console.log('❌ Get listing reviews failed:', error.response?.status, error.response?.data);
    }

    // Test 4: Create booking
    console.log('\n4. Testing POST /bookings:');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookingData = {
      listingId: 1,
      date: tomorrow.toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '18:00',
      guestsCount: 5,
      message: 'Test booking'
    };
    
    try {
      const bookingRes = await axios.post(`${API_BASE}/bookings`, bookingData, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      console.log('✅ Create booking successful:', bookingRes.data);
    } catch (error: any) {
      console.log('❌ Create booking failed:', error.response?.status, error.response?.data);
    }

  } catch (error: any) {
    console.error('Initial setup failed:', error.response?.data);
  }
}

testFailingEndpoints();