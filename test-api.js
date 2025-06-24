const axios = require('axios');

const API_URL = 'http://localhost:5002/api';
let accessToken = '';
let refreshToken = '';
let userId = '';
let listingId = '';
let bookingId = '';

const testEmail = `test${Date.now()}@example.com`;
const testPassword = 'Test1234!';

const tests = {
  // Auth Tests
  'POST /auth/register': async () => {
    const response = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: testEmail,
      password: testPassword,
      phone: '+1234567890',
      role: 'both'
    });
    userId = response.data.data.user.id;
    accessToken = response.data.data.accessToken;
    refreshToken = response.data.data.refreshToken;
    return response;
  },
  
  'POST /auth/login': async () => {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    return response;
  },
  
  'GET /auth/me': async () => {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'POST /auth/refresh': async () => {
    const response = await axios.post(`${API_URL}/auth/refresh`, {
      refreshToken
    });
    accessToken = response.data.data.accessToken;
    return response;
  },
  
  // Listings Tests
  'POST /listings': async () => {
    const response = await axios.post(`${API_URL}/listings`, {
      title: 'Test Workspace',
      description: 'A beautiful and modern test workspace perfect for productive work sessions. Features include high-speed internet, comfortable seating, and a quiet environment.',
      category: 'workspace',
      address: '123 Test Street',
      city: 'Test City',
      area: 100,
      maxGuests: 10,
      pricePerHour: 50,
      pricePerDay: 300,
      amenities: ['wifi', 'parking', 'coffee'],
      rules: 'No smoking'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    listingId = response.data.data.id;
    return response;
  },
  
  'GET /listings': async () => {
    const response = await axios.get(`${API_URL}/listings`);
    return response;
  },
  
  'GET /listings/:id': async () => {
    const response = await axios.get(`${API_URL}/listings/${listingId}`);
    return response;
  },
  
  'PUT /listings/:id': async () => {
    const response = await axios.put(`${API_URL}/listings/${listingId}`, {
      title: 'Updated Test Workspace',
      description: 'An updated beautiful and modern test workspace perfect for productive work sessions. Now with even better facilities and amenities.'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'GET /listings/user/:userId': async () => {
    const response = await axios.get(`${API_URL}/listings/user/${userId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  // Bookings Tests
  'POST /bookings': async () => {
    // First create another user to book the listing
    const guestEmail = `guest${Date.now()}@example.com`;
    const guestResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Guest User',
      email: guestEmail,
      password: testPassword,
      phone: '+9876543210',
      role: 'guest'
    });
    const guestToken = guestResponse.data.data.accessToken;
    
    // Create booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const response = await axios.post(`${API_URL}/bookings`, {
      listingId: listingId,
      date: tomorrow.toISOString().split('T')[0],
      startTime: '10:00',
      endTime: '12:00',
      guestsCount: 2,
      message: 'Looking forward to visiting!'
    }, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    bookingId = response.data.data.id;
    return response;
  },
  
  'GET /bookings': async () => {
    const response = await axios.get(`${API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'GET /bookings/:id': async () => {
    const response = await axios.get(`${API_URL}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'PATCH /bookings/:id/status': async () => {
    const response = await axios.patch(`${API_URL}/bookings/${bookingId}/status`, {
      status: 'confirmed'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  // Messages Tests
  'POST /bookings/:id/messages': async () => {
    const response = await axios.post(`${API_URL}/bookings/${bookingId}/messages`, {
      message: 'Thank you for confirming!'
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'GET /bookings/:id/messages': async () => {
    const response = await axios.get(`${API_URL}/bookings/${bookingId}/messages`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'GET /messages/conversations': async () => {
    const response = await axios.get(`${API_URL}/messages/conversations`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'GET /messages/unread/count': async () => {
    const response = await axios.get(`${API_URL}/messages/unread/count`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  // Cleanup
  'DELETE /listings/:id': async () => {
    const response = await axios.delete(`${API_URL}/listings/${listingId}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  },
  
  'POST /auth/logout': async () => {
    const response = await axios.post(`${API_URL}/auth/logout`, {
      refreshToken
    }, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response;
  }
};

async function runTests() {
  console.log('Starting API tests...\n');
  
  const results = [];
  
  for (const [name, test] of Object.entries(tests)) {
    try {
      const response = await test();
      console.log(`✅ ${name} - Status: ${response.status}`);
      results.push({
        test: name,
        status: 'PASSED',
        statusCode: response.status,
        data: response.data
      });
    } catch (error) {
      console.log(`❌ ${name} - Error: ${error.response?.status || error.message}`);
      console.log(`   Details: ${error.response?.data?.message || error.message}`);
      results.push({
        test: name,
        status: 'FAILED',
        statusCode: error.response?.status,
        error: error.response?.data?.message || error.message,
        details: error.response?.data
      });
    }
  }
  
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('API_TEST_RESULTS.md', `# API Test Results\n\nDate: ${new Date().toISOString()}\n\n## Summary\n- Total Tests: ${results.length}\n- Passed: ${passed}\n- Failed: ${failed}\n\n## Detailed Results\n\n${results.map(r => {
    if (r.status === 'PASSED') {
      return `### ✅ ${r.test}\n- Status Code: ${r.statusCode}\n- Response: \`\`\`json\n${JSON.stringify(r.data, null, 2)}\n\`\`\`\n`;
    } else {
      return `### ❌ ${r.test}\n- Status Code: ${r.statusCode || 'N/A'}\n- Error: ${r.error}\n- Details: \`\`\`json\n${JSON.stringify(r.details, null, 2)}\n\`\`\`\n`;
    }
  }).join('\n')}`);
  
  console.log('\nTest results saved to API_TEST_RESULTS.md');
}

// Run tests
runTests().catch(console.error);