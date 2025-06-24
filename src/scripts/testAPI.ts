import axios from 'axios';

const API_BASE = 'http://localhost:5002/api';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  message: string;
  data?: any;
}

class APITester {
  private results: TestResult[] = [];
  private accessToken: string = '';

  async runTests() {
    console.log('🧪 Starting API tests...\n');

    try {
      // Test 1: Health check
      await this.testHealthCheck();

      // Test 2: User registration
      await this.testUserRegistration();

      // Test 3: User login
      await this.testUserLogin();

      // Test 4: Get user profile
      await this.testGetProfile();

      // Test 5: Get listings
      await this.testGetListings();

      // Test 6: Get specific listing
      await this.testGetListing();

      // Test 7: Test rate limiting
      await this.testRateLimiting();

      // Test 8: Test email operations
      await this.testEmailOperations();

      // Summary
      this.printSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  private async testHealthCheck() {
    try {
      const response = await axios.get(`${API_BASE}/health`);
      this.addResult('/health', 'GET', response.status, true, 'Health check passed', response.data);
    } catch (error: any) {
      this.addResult('/health', 'GET', error.response?.status || 0, false, 'Health check failed');
    }
  }

  private async testUserRegistration() {
    try {
      const testUser = {
        name: 'Тестовый Пользователь',
        email: `test${Date.now()}@nukte.kz`,
        password: 'testpassword123',
        phone: '+7 (700) 123-4567',
        role: 'guest'
      };

      const response = await axios.post(`${API_BASE}/auth/register`, testUser);
      this.addResult('/auth/register', 'POST', response.status, true, 'User registration successful', {
        user: response.data.data.user.name,
        role: response.data.data.user.role
      });
    } catch (error: any) {
      this.addResult('/auth/register', 'POST', error.response?.status || 0, false, 
        `Registration failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private async testUserLogin() {
    try {
      const loginData = {
        email: 'aliya.host@nukte.kz',
        password: 'password123'
      };

      const response = await axios.post(`${API_BASE}/auth/login`, loginData);
      this.accessToken = response.data.data.accessToken;
      
      this.addResult('/auth/login', 'POST', response.status, true, 'Login successful', {
        user: response.data.data.user.name,
        tokenReceived: !!this.accessToken
      });
    } catch (error: any) {
      this.addResult('/auth/login', 'POST', error.response?.status || 0, false, 
        `Login failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private async testGetProfile() {
    if (!this.accessToken) {
      this.addResult('/auth/me', 'GET', 0, false, 'No access token available');
      return;
    }

    try {
      const response = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      
      this.addResult('/auth/me', 'GET', response.status, true, 'Profile fetch successful', {
        user: response.data.data.user.name,
        verified: response.data.data.user.verified
      });
    } catch (error: any) {
      this.addResult('/auth/me', 'GET', error.response?.status || 0, false, 
        `Profile fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private async testGetListings() {
    try {
      const response = await axios.get(`${API_BASE}/listings`);
      
      this.addResult('/listings', 'GET', response.status, true, 'Listings fetch successful', {
        totalListings: response.data.data.listings.length,
        totalPages: response.data.data.totalPages
      });
    } catch (error: any) {
      this.addResult('/listings', 'GET', error.response?.status || 0, false, 
        `Listings fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private async testGetListing() {
    try {
      const response = await axios.get(`${API_BASE}/listings/1`);
      
      this.addResult('/listings/:id', 'GET', response.status, true, 'Single listing fetch successful', {
        listingTitle: response.data.data.listing.title,
        hasImages: response.data.data.listing.images.length > 0
      });
    } catch (error: any) {
      this.addResult('/listings/:id', 'GET', error.response?.status || 0, false, 
        `Single listing fetch failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private async testRateLimiting() {
    try {
      // Make multiple rapid requests to test rate limiting
      const promises = Array(6).fill(0).map(() => 
        axios.post(`${API_BASE}/auth/login`, { email: 'test@test.com', password: 'wrong' })
          .catch(err => err.response)
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.some(r => r?.status === 429);
      
      this.addResult('/auth/login', 'POST (Rate Limit)', 429, rateLimited, 
        rateLimited ? 'Rate limiting working correctly' : 'Rate limiting may not be working');
    } catch (error: any) {
      this.addResult('/auth/login', 'POST (Rate Limit)', 0, false, 'Rate limit test failed');
    }
  }

  private async testEmailOperations() {
    if (!this.accessToken) {
      this.addResult('/auth/send-verification', 'POST', 0, false, 'No access token available');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE}/auth/send-verification`, {}, {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      
      this.addResult('/auth/send-verification', 'POST', response.status, true, 'Verification email sent');
    } catch (error: any) {
      this.addResult('/auth/send-verification', 'POST', error.response?.status || 0, false, 
        `Email operation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  private addResult(endpoint: string, method: string, status: number, success: boolean, message: string, data?: any) {
    this.results.push({ endpoint, method, status, success, message, data });
    
    const statusIcon = success ? '✅' : '❌';
    const statusCode = status ? `[${status}]` : '[ERR]';
    console.log(`${statusIcon} ${method} ${endpoint} ${statusCode} - ${message}`);
    if (data && success) {
      console.log(`   📊 Data:`, data);
    }
    console.log('');
  }

  private printSummary() {
    const passed = this.results.filter(r => r.success).length;
    const total = this.results.length;
    
    console.log('📊 TEST SUMMARY');
    console.log('================');
    console.log(`Total tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${total - passed}`);
    console.log(`Success rate: ${Math.round((passed / total) * 100)}%`);
    
    if (total - passed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.filter(r => !r.success).forEach(r => {
        console.log(`   ${r.method} ${r.endpoint} - ${r.message}`);
      });
    }
  }
}

// Run tests
const tester = new APITester();
tester.runTests().then(() => {
  console.log('\n🏁 API testing completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Testing failed:', error);
  process.exit(1);
});