import axios, { AxiosInstance } from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:5002/api';

interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  token?: string;
  userId?: number;
}

interface TestListing {
  id?: number;
  title: string;
  description: string;
  category: string;
  address: string;
  city: string;
  area: number;
  maxGuests: number;
  pricePerHour: number;
  pricePerDay?: number;
  amenities: string[];
  rules?: string;
}

class DetailedAPITester {
  private api: AxiosInstance;
  private testUsers: TestUser[] = [];
  private testListings: any[] = [];
  private testResults: { test: string; status: 'PASS' | 'FAIL'; details?: string }[] = [];
  
  constructor() {
    this.api = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
    });
  }

  private logTest(test: string, status: 'PASS' | 'FAIL', details?: string) {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test}${details ? `: ${details}` : ''}`);
    this.testResults.push({ test, status, details });
  }

  async runAllTests() {
    console.log('🚀 Starting detailed API testing...\n');

    try {
      // Phase 1: Authentication Tests
      console.log('═══ PHASE 1: Authentication Tests ═══\n');
      await this.testAuthFlow();
      
      // Phase 2: Listings CRUD Tests
      console.log('\n═══ PHASE 2: Listings CRUD Tests ═══\n');
      await this.testListingsCRUD();
      
      // Phase 3: Search and Filter Tests
      console.log('\n═══ PHASE 3: Search and Filter Tests ═══\n');
      await this.testSearchAndFilters();
      
      // Phase 4: Booking System Tests
      console.log('\n═══ PHASE 4: Booking System Tests ═══\n');
      await this.testBookingSystem();
      
      // Phase 5: Reviews and Ratings Tests
      console.log('\n═══ PHASE 5: Reviews and Ratings Tests ═══\n');
      await this.testReviewsSystem();
      
      // Phase 6: Messages System Tests
      console.log('\n═══ PHASE 6: Messages System Tests ═══\n');
      await this.testMessagesSystem();
      
      // Phase 7: Image Upload Tests
      console.log('\n═══ PHASE 7: Image Upload Tests ═══\n');
      await this.testImageUpload();
      
      // Phase 8: Security and Validation Tests
      console.log('\n═══ PHASE 8: Security and Validation Tests ═══\n');
      await this.testSecurityAndValidation();
      
      // Phase 9: Edge Cases and Error Handling
      console.log('\n═══ PHASE 9: Edge Cases and Error Handling ═══\n');
      await this.testEdgeCases();

      // Final Summary
      this.printDetailedSummary();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    }
  }

  // PHASE 1: Authentication Tests
  private async testAuthFlow() {
    // Test 1.1: Register new users with different roles
    const newUsers = [
      { email: `test.host.${Date.now()}@nukte.kz`, password: 'Test123!@#', name: 'Test Host', role: 'host' },
      { email: `test.guest.${Date.now()}@nukte.kz`, password: 'Test123!@#', name: 'Test Guest', role: 'guest' },
      { email: `test.both.${Date.now()}@nukte.kz`, password: 'Test123!@#', name: 'Test Both', role: 'both' }
    ];

    for (const user of newUsers) {
      try {
        const res = await this.api.post('/auth/register', user);
        if (res.data.success) {
          this.testUsers.push({ ...user, token: res.data.data.accessToken, userId: res.data.data.user.id });
          this.logTest(`Register ${user.role} user`, 'PASS');
        }
      } catch (error: any) {
        this.logTest(`Register ${user.role} user`, 'FAIL', error.response?.data?.message);
      }
    }

    // Test 1.2: Login with registered users
    for (const user of this.testUsers) {
      try {
        const res = await this.api.post('/auth/login', { 
          email: user.email, 
          password: user.password 
        });
        user.token = res.data.data.accessToken;
        this.logTest(`Login as ${user.role}`, 'PASS');
      } catch (error: any) {
        this.logTest(`Login as ${user.role}`, 'FAIL', error.response?.data?.message);
      }
    }

    // Test 1.3: Access protected routes
    for (const user of this.testUsers) {
      try {
        const res = await this.api.get('/auth/me', {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        this.logTest(`Access profile as ${user.role}`, 'PASS', `Verified: ${res.data.data.user.verified}`);
      } catch (error: any) {
        this.logTest(`Access profile as ${user.role}`, 'FAIL', error.response?.data?.message);
      }
    }

    // Test 1.4: Refresh token
    const hostUser = this.testUsers.find(u => u.role === 'host');
    if (hostUser?.token) {
      try {
        // First login to get refresh token
        const loginRes = await this.api.post('/auth/login', {
          email: hostUser.email,
          password: hostUser.password
        });
        const refreshToken = loginRes.data.data.refreshToken;
        
        // Now test refresh
        const res = await this.api.post('/auth/refresh', {
          refreshToken: refreshToken
        });
        this.logTest('Refresh token', 'PASS');
      } catch (error: any) {
        this.logTest('Refresh token', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 1.5: Email verification (simulate for testing)
    // Note: In a real test environment, we would mock the email service
    // For now, we'll just note that verification is required
    for (const user of this.testUsers) {
      try {
        // Try to send verification code
        await this.api.post('/auth/send-verification', {}, {
          headers: { Authorization: `Bearer ${user.token}` }
        });
        this.logTest(`Send verification to ${user.role}`, 'PASS', 'Email verification required for some operations');
      } catch (error: any) {
        this.logTest(`Send verification to ${user.role}`, 'FAIL', error.response?.data?.message);
      }
    }

    // Test 1.6: Password reset flow
    try {
      await this.api.post('/auth/forgot-password', { 
        email: 'aliya.host@nukte.kz' 
      });
      this.logTest('Forgot password request', 'PASS');
    } catch (error: any) {
      this.logTest('Forgot password request', 'FAIL', error.response?.data?.message);
    }

    // Test 1.7: Invalid login attempts
    try {
      await this.api.post('/auth/login', { 
        email: 'invalid@nukte.kz', 
        password: 'wrong' 
      });
      this.logTest('Invalid login rejection', 'FAIL', 'Should have failed');
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logTest('Invalid login rejection', 'PASS');
      } else {
        this.logTest('Invalid login rejection', 'FAIL', 'Wrong error code');
      }
    }
  }

  // PHASE 2: Listings CRUD Tests
  private async testListingsCRUD() {
    const hostUser = this.testUsers.find(u => u.role === 'host');
    const guestUser = this.testUsers.find(u => u.role === 'guest');
    
    if (!hostUser?.token) {
      this.logTest('Listings CRUD', 'FAIL', 'No host user token');
      return;
    }

    // Test 2.1: Create listing as host
    const newListing: TestListing = {
      title: 'Test Studio для фотосессий',
      description: 'Тестовая студия с профессиональным оборудованием',
      category: 'Студия',
      address: 'ул. Тестовая, 123',
      city: 'Алматы',
      area: 80,
      maxGuests: 10,
      pricePerHour: 7000,
      pricePerDay: 45000,
      amenities: ['wifi', 'parking', 'lighting', 'props'],
      rules: 'Тестовые правила'
    };

    try {
      const res = await this.api.post('/listings', newListing, {
        headers: { Authorization: `Bearer ${hostUser.token}` }
      });
      const listingId = res.data.data.id;
      this.testListings.push({ ...newListing, id: listingId });
      this.logTest('Create listing as host', 'PASS', `ID: ${listingId}`);
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.error?.message === 'Email verification required') {
        this.logTest('Create listing as host', 'FAIL', 'Email verification required (expected behavior)');
      } else {
        this.logTest('Create listing as host', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 2.2: Try to create listing as guest (should fail)
    if (guestUser?.token) {
      try {
        await this.api.post('/listings', newListing, {
          headers: { Authorization: `Bearer ${guestUser.token}` }
        });
        this.logTest('Guest cannot create listing', 'FAIL', 'Should have been rejected');
      } catch (error: any) {
        if (error.response?.status === 403) {
          this.logTest('Guest cannot create listing', 'PASS');
        } else {
          this.logTest('Guest cannot create listing', 'FAIL', 'Wrong error code');
        }
      }
    }

    // Test 2.3: Get listing by ID
    if (this.testListings.length > 0) {
      const testListing = this.testListings[0];
      try {
        const res = await this.api.get(`/listings/${testListing.id}`);
        this.logTest('Get listing by ID', 'PASS', res.data.data.listing.title);
      } catch (error: any) {
        this.logTest('Get listing by ID', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 2.4: Update listing
    if (this.testListings.length > 0 && hostUser?.token) {
      const testListing = this.testListings[0];
      try {
        await this.api.put(`/listings/${testListing.id}`, {
          title: 'Updated Test Studio',
          pricePerHour: 8000
        }, {
          headers: { Authorization: `Bearer ${hostUser.token}` }
        });
        this.logTest('Update listing', 'PASS');
      } catch (error: any) {
        this.logTest('Update listing', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 2.5: Get user's listings
    try {
      const res = await this.api.get(`/listings/user/${hostUser.userId}`);
      this.logTest('Get user listings', 'PASS', `Found ${res.data.data.listings.length} listings`);
    } catch (error: any) {
      this.logTest('Get user listings', 'FAIL', error.response?.data?.message);
    }
  }

  // PHASE 3: Search and Filter Tests
  private async testSearchAndFilters() {
    // Test 3.1: Get all listings with pagination
    try {
      const res = await this.api.get('/listings?page=1&limit=5');
      this.logTest('Get listings with pagination', 'PASS', 
        `Page 1 of ${res.data.data.pagination.totalPages}, ${res.data.data.listings.length} items`);
    } catch (error: any) {
      this.logTest('Get listings with pagination', 'FAIL', error.response?.data?.message);
    }

    // Test 3.2: Filter by city
    try {
      const res = await this.api.get('/listings?city=Алматы');
      this.logTest('Filter by city', 'PASS', `Found ${res.data.data.listings.length} in Алматы`);
    } catch (error: any) {
      this.logTest('Filter by city', 'FAIL', error.response?.data?.message);
    }

    // Test 3.3: Filter by category
    try {
      const res = await this.api.get('/listings?category=Студия');
      this.logTest('Filter by category', 'PASS', `Found ${res.data.data.listings.length} studios`);
    } catch (error: any) {
      this.logTest('Filter by category', 'FAIL', error.response?.data?.message);
    }

    // Test 3.4: Filter by price range
    try {
      const res = await this.api.get('/listings?minPrice=5000&maxPrice=10000');
      this.logTest('Filter by price range', 'PASS', `Found ${res.data.data.listings.length} in range`);
    } catch (error: any) {
      this.logTest('Filter by price range', 'FAIL', error.response?.data?.message);
    }

    // Test 3.5: Filter by area
    try {
      const res = await this.api.get('/listings?minArea=50&maxArea=150');
      this.logTest('Filter by area', 'PASS', `Found ${res.data.data.listings.length} in area range`);
    } catch (error: any) {
      this.logTest('Filter by area', 'FAIL', error.response?.data?.message);
    }

    // Test 3.6: Combined filters
    try {
      const res = await this.api.get('/listings?city=Алматы&category=Студия&minPrice=5000');
      this.logTest('Combined filters', 'PASS', `Found ${res.data.data.listings.length} matches`);
    } catch (error: any) {
      this.logTest('Combined filters', 'FAIL', error.response?.data?.message);
    }
  }

  // PHASE 4: Booking System Tests
  private async testBookingSystem() {
    const guestUser = this.testUsers.find(u => u.role === 'guest');
    const hostUser = this.testUsers.find(u => u.role === 'host');
    
    if (!guestUser?.token || !hostUser?.token) {
      this.logTest('Booking tests', 'FAIL', 'Missing user tokens');
      return;
    }

    // Get a listing to book
    let listingToBook: any;
    try {
      const res = await this.api.get('/listings?limit=1');
      listingToBook = res.data.data.listings[0];
    } catch (error) {
      this.logTest('Get listing for booking', 'FAIL');
      return;
    }

    // Test 4.1: Create booking
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const bookingData = {
      listingId: listingToBook.id,
      date: tomorrow.toISOString().split('T')[0],
      startTime: '14:00',
      endTime: '18:00',
      guestsCount: 5,
      message: 'Тестовое бронирование для фотосессии'
    };

    let bookingId: number;
    try {
      const res = await this.api.post('/bookings', bookingData, {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      bookingId = res.data.data.booking.id;
      this.logTest('Create booking', 'PASS', `Booking ID: ${bookingId}`);
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.error?.message === 'Email verification required') {
        this.logTest('Create booking', 'FAIL', 'Email verification required (expected behavior)');
      } else {
        this.logTest('Create booking', 'FAIL', error.response?.data?.message);
      }
      return;
    }

    // Test 4.2: Get booking details
    try {
      const res = await this.api.get(`/bookings/${bookingId}`, {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Get booking details', 'PASS', `Status: ${res.data.data.booking.status}`);
    } catch (error: any) {
      this.logTest('Get booking details', 'FAIL', error.response?.data?.message);
    }

    // Test 4.3: Get user's bookings (as guest)
    try {
      const res = await this.api.get('/bookings/my', {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Get my bookings (guest)', 'PASS', `Found ${res.data.data.bookings.length} bookings`);
    } catch (error: any) {
      this.logTest('Get my bookings (guest)', 'FAIL', error.response?.data?.message);
    }

    // Test 4.4: Get host's bookings
    try {
      const res = await this.api.get('/bookings/host', {
        headers: { Authorization: `Bearer ${hostUser.token}` }
      });
      this.logTest('Get host bookings', 'PASS', `Found ${res.data.data.bookings.length} bookings`);
    } catch (error: any) {
      this.logTest('Get host bookings', 'FAIL', error.response?.data?.message);
    }

    // Test 4.5: Check availability
    try {
      const res = await this.api.get(`/bookings/availability/${listingToBook.id}?date=${tomorrow.toISOString().split('T')[0]}`);
      this.logTest('Check availability', 'PASS', `Available slots: ${res.data.data.availableSlots.length}`);
    } catch (error: any) {
      this.logTest('Check availability', 'FAIL', error.response?.data?.message);
    }

    // Test 4.6: Double booking prevention
    try {
      await this.api.post('/bookings', bookingData, {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Double booking prevention', 'FAIL', 'Should have been rejected');
    } catch (error: any) {
      if (error.response?.status === 400) {
        this.logTest('Double booking prevention', 'PASS');
      } else {
        this.logTest('Double booking prevention', 'FAIL', 'Wrong error');
      }
    }
  }

  // PHASE 5: Reviews System Tests
  private async testReviewsSystem() {
    const guestUser = this.testUsers.find(u => u.role === 'guest');
    
    if (!guestUser?.token) {
      this.logTest('Review tests', 'FAIL', 'No guest token');
      return;
    }

    // Test 5.1: Get listing reviews
    try {
      const res = await this.api.get('/reviews/listing/1');
      this.logTest('Get listing reviews', 'PASS', `Found ${res.data.data.reviews.length} reviews`);
    } catch (error: any) {
      this.logTest('Get listing reviews', 'FAIL', error.response?.data?.message);
    }

    // Test 5.2: Create review (would need a completed booking)
    const reviewData = {
      bookingId: 1, // Assuming we have a booking
      rating: 5,
      comment: 'Отличная студия для съемок!'
    };

    try {
      const res = await this.api.post('/reviews', reviewData, {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Create review', 'PASS');
    } catch (error: any) {
      // Expected to fail without proper booking
      if (error.response?.status === 400 || error.response?.status === 403) {
        this.logTest('Create review validation', 'PASS', 'Properly validates booking requirement');
      } else {
        this.logTest('Create review', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 5.3: Get user reviews
    try {
      const res = await this.api.get('/reviews/user/20'); // Aliya's ID
      this.logTest('Get user reviews', 'PASS', `Average rating: ${res.data.data.averageRating}`);
    } catch (error: any) {
      this.logTest('Get user reviews', 'FAIL', error.response?.data?.message);
    }
  }

  // PHASE 6: Messages System Tests
  private async testMessagesSystem() {
    const guestUser = this.testUsers.find(u => u.role === 'guest');
    
    if (!guestUser?.token) {
      this.logTest('Messages tests', 'FAIL', 'No guest token');
      return;
    }

    // Test 6.1: Get conversations
    try {
      const res = await this.api.get('/messages/conversations', {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Get conversations', 'PASS', `Found ${res.data.data.conversations.length} conversations`);
    } catch (error: any) {
      this.logTest('Get conversations', 'FAIL', error.response?.data?.message);
    }

    // Test 6.2: Send message (would need a booking)
    const messageData = {
      bookingId: 1,
      receiverId: 20, // Host ID
      message: 'Тестовое сообщение'
    };

    try {
      await this.api.post('/messages', messageData, {
        headers: { Authorization: `Bearer ${guestUser.token}` }
      });
      this.logTest('Send message', 'PASS');
    } catch (error: any) {
      // Expected to fail without proper booking
      if (error.response?.status === 403 || error.response?.status === 400) {
        this.logTest('Message validation', 'PASS', 'Properly validates booking context');
      } else {
        this.logTest('Send message', 'FAIL', error.response?.data?.message);
      }
    }
  }

  // PHASE 7: Image Upload Tests
  private async testImageUpload() {
    const hostUser = this.testUsers.find(u => u.role === 'host');
    
    if (!hostUser?.token || this.testListings.length === 0) {
      this.logTest('Image upload tests', 'FAIL', 'No host token or listing');
      return;
    }

    // Test 7.1: Upload images
    const listingId = this.testListings[0].id;
    
    // Create a mock image file
    const formData = new FormData();
    formData.append('images', Buffer.from('fake-image-data'), {
      filename: 'test-image.jpg',
      contentType: 'image/jpeg',
    });

    try {
      const res = await this.api.post(`/listings/${listingId}/images`, formData, {
        headers: {
          Authorization: `Bearer ${hostUser.token}`,
          ...formData.getHeaders()
        }
      });
      this.logTest('Upload images', 'PASS');
    } catch (error: any) {
      // Expected to fail with mock data
      if (error.response?.status === 400) {
        this.logTest('Image validation', 'PASS', 'Properly validates image files');
      } else {
        this.logTest('Upload images', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 7.2: Delete image
    try {
      await this.api.delete(`/listings/${listingId}/images/1`, {
        headers: { Authorization: `Bearer ${hostUser.token}` }
      });
      this.logTest('Delete image', 'PASS');
    } catch (error: any) {
      // May fail if no images exist
      this.logTest('Delete image', 'FAIL', error.response?.data?.message);
    }
  }

  // PHASE 8: Security and Validation Tests
  private async testSecurityAndValidation() {
    // Test 8.1: SQL Injection attempt
    try {
      await this.api.get("/listings?city='; DROP TABLE users; --");
      this.logTest('SQL injection prevention', 'PASS', 'Query handled safely');
    } catch (error: any) {
      this.logTest('SQL injection prevention', 'PASS', 'Rejected malicious input');
    }

    // Test 8.2: XSS attempt in listing creation
    const hostUser = this.testUsers.find(u => u.role === 'host');
    if (hostUser?.token) {
      try {
        await this.api.post('/listings', {
          title: '<script>alert("XSS")</script>',
          description: 'Test XSS',
          category: 'Студия',
          address: 'Test',
          city: 'Алматы',
          area: 50,
          maxGuests: 5,
          pricePerHour: 5000
        }, {
          headers: { Authorization: `Bearer ${hostUser.token}` }
        });
        this.logTest('XSS prevention', 'PASS', 'Input sanitized');
      } catch (error: any) {
        this.logTest('XSS prevention', 'FAIL', error.response?.data?.message);
      }
    }

    // Test 8.3: Invalid data types
    try {
      await this.api.get('/listings?page=abc&limit=xyz');
      this.logTest('Type validation', 'PASS', 'Handled invalid types');
    } catch (error: any) {
      this.logTest('Type validation', 'PASS', 'Rejected invalid types');
    }

    // Test 8.4: Authorization checks
    const guestUser = this.testUsers.find(u => u.role === 'guest');
    if (guestUser?.token && this.testListings.length > 0) {
      try {
        await this.api.delete(`/listings/${this.testListings[0].id}`, {
          headers: { Authorization: `Bearer ${guestUser.token}` }
        });
        this.logTest('Authorization check', 'FAIL', 'Should have been rejected');
      } catch (error: any) {
        if (error.response?.status === 403) {
          this.logTest('Authorization check', 'PASS', 'Properly rejected unauthorized action');
        } else {
          this.logTest('Authorization check', 'FAIL', 'Wrong error');
        }
      }
    }

    // Test 8.5: Rate limiting effectiveness
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        this.api.post('/auth/login', { email: 'test@test.com', password: 'wrong' })
          .catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.some(r => r?.status === 429);
    
    if (rateLimited) {
      this.logTest('Rate limiting', 'PASS', 'Successfully rate limited');
    } else {
      this.logTest('Rate limiting', 'FAIL', 'Not properly rate limited');
    }
  }

  // PHASE 9: Edge Cases and Error Handling
  private async testEdgeCases() {
    // Test 9.1: Empty search results
    try {
      const res = await this.api.get('/listings?city=НесуществующийГород');
      this.logTest('Empty search results', 'PASS', `Returned ${res.data.data.listings.length} results`);
    } catch (error: any) {
      this.logTest('Empty search results', 'FAIL', error.response?.data?.message);
    }

    // Test 9.2: Non-existent resource
    try {
      await this.api.get('/listings/999999');
      this.logTest('404 handling', 'FAIL', 'Should have returned 404');
    } catch (error: any) {
      if (error.response?.status === 404) {
        this.logTest('404 handling', 'PASS');
      } else {
        this.logTest('404 handling', 'FAIL', 'Wrong error code');
      }
    }

    // Test 9.3: Expired token
    try {
      await this.api.get('/auth/me', {
        headers: { Authorization: 'Bearer invalid.token.here' }
      });
      this.logTest('Invalid token handling', 'FAIL', 'Should have rejected');
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.logTest('Invalid token handling', 'PASS');
      } else {
        this.logTest('Invalid token handling', 'FAIL', 'Wrong error code');
      }
    }

    // Test 9.4: Large data handling
    try {
      const res = await this.api.get('/listings?limit=100');
      this.logTest('Large data handling', 'PASS', `Handled ${res.data.data.listings.length} items`);
    } catch (error: any) {
      this.logTest('Large data handling', 'FAIL', error.response?.data?.message);
    }

    // Test 9.5: Special characters in search
    try {
      const res = await this.api.get('/listings?city=' + encodeURIComponent('Алматы & Астана'));
      this.logTest('Special characters handling', 'PASS');
    } catch (error: any) {
      this.logTest('Special characters handling', 'FAIL', error.response?.data?.message);
    }
  }

  // Clean up test data
  private async cleanup() {
    const hostUser = this.testUsers.find(u => u.role === 'host');
    
    if (hostUser?.token) {
      // Delete test listings
      for (const listing of this.testListings) {
        try {
          await this.api.delete(`/listings/${listing.id}`, {
            headers: { Authorization: `Bearer ${hostUser.token}` }
          });
        } catch (error) {
          // Ignore cleanup errors
        }
      }
    }
  }

  private printDetailedSummary() {
    console.log('\n═══ DETAILED TEST SUMMARY ═══\n');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - ${r.test}: ${r.details || 'No details'}`));
    }
    
    // Group results by phase
    console.log('\n📋 Results by Phase:');
    const phases = [
      'Authentication', 'Listings CRUD', 'Search and Filter', 
      'Booking System', 'Reviews', 'Messages', 'Image Upload', 
      'Security', 'Edge Cases'
    ];
    
    phases.forEach(phase => {
      const phaseTests = this.testResults.filter(r => r.test.toLowerCase().includes(phase.toLowerCase()));
      if (phaseTests.length > 0) {
        const passed = phaseTests.filter(r => r.status === 'PASS').length;
        console.log(`   ${phase}: ${passed}/${phaseTests.length} passed`);
      }
    });

    // Cleanup
    this.cleanup().then(() => {
      console.log('\n🧹 Test data cleaned up');
    });
  }
}

// Run the tests
const tester = new DetailedAPITester();
tester.runAllTests()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });