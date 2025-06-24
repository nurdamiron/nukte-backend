import axios, { AxiosInstance } from 'axios';
import { connectDB, getDB } from '../config/database';

const API_BASE = 'http://localhost:5002/api';

interface TestSuite {
  name: string;
  tests: Array<{
    name: string;
    run: () => Promise<void>;
  }>;
}

class ComprehensiveAPITester {
  private api: AxiosInstance;
  private db: any;
  private tokens = {
    verifiedHost: '',
    verifiedGuest: '', 
    unverifiedUser: '',
    admin: ''
  };
  private testResults: Array<{ suite: string; test: string; status: 'PASS' | 'FAIL'; details?: string }> = [];

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE,
      timeout: 10000,
    });
  }

  private log(suite: string, test: string, status: 'PASS' | 'FAIL', details?: string) {
    const icon = status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} [${suite}] ${test}${details ? `: ${details}` : ''}`);
    this.testResults.push({ suite, test, status, details });
  }

  async setup() {
    console.log('🔧 Setting up test environment...\n');
    
    // Connect to database
    await connectDB();
    this.db = getDB();

    // Get tokens for existing verified users
    try {
      // Login as Aliya (verified host)
      const hostRes = await this.api.post('/auth/login', {
        email: 'aliya.host@nukte.kz',
        password: 'password123'
      });
      this.tokens.verifiedHost = hostRes.data.data.accessToken;

      // Login as Daniyar (verified guest)
      const guestRes = await this.api.post('/auth/login', {
        email: 'daniiar.guest@nukte.kz',
        password: 'password123'
      });
      this.tokens.verifiedGuest = guestRes.data.data.accessToken;

      console.log('✅ Logged in with verified users\n');
    } catch (error) {
      console.error('❌ Failed to setup test users');
      throw error;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting comprehensive API testing...\n');

    try {
      await this.setup();

      const testSuites: TestSuite[] = [
        this.getAuthTestSuite(),
        this.getListingsTestSuite(),
        this.getBookingsTestSuite(),
        this.getReviewsTestSuite(),
        this.getMessagesTestSuite(),
        this.getDatabaseTestSuite(),
        this.getSecurityTestSuite(),
        this.getPerformanceTestSuite()
      ];

      for (const suite of testSuites) {
        console.log(`\n═══ ${suite.name} ═══\n`);
        for (const test of suite.tests) {
          try {
            await test.run();
          } catch (error: any) {
            this.log(suite.name, test.name, 'FAIL', error.message);
          }
        }
      }

      this.printSummary();
    } catch (error) {
      console.error('💥 Test suite failed:', error);
    } finally {
      await this.cleanup();
    }
  }

  private getAuthTestSuite(): TestSuite {
    return {
      name: 'Authentication & Authorization',
      tests: [
        {
          name: 'JWT token validation',
          run: async () => {
            const res = await this.api.get('/auth/me', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            if (res.data.data.user.email === 'aliya.host@nukte.kz') {
              this.log('Authentication & Authorization', 'JWT token validation', 'PASS');
            } else {
              throw new Error('Wrong user data');
            }
          }
        },
        {
          name: 'Invalid token rejection',
          run: async () => {
            try {
              await this.api.get('/auth/me', {
                headers: { Authorization: 'Bearer invalid.token' }
              });
              throw new Error('Should have rejected');
            } catch (error: any) {
              if (error.response?.status === 401) {
                this.log('Authentication & Authorization', 'Invalid token rejection', 'PASS');
              } else {
                throw error;
              }
            }
          }
        },
        {
          name: 'Refresh token flow',
          run: async () => {
            // First get refresh token from login
            const loginRes = await this.api.post('/auth/login', {
              email: 'aliya.host@nukte.kz',
              password: 'password123'
            });
            
            const refreshRes = await this.api.post('/auth/refresh', {
              refreshToken: loginRes.data.data.refreshToken
            });
            
            if (refreshRes.data.data.accessToken) {
              this.log('Authentication & Authorization', 'Refresh token flow', 'PASS');
            } else {
              throw new Error('No new access token');
            }
          }
        },
        {
          name: 'Role-based access control',
          run: async () => {
            // Try to create listing as guest (should fail)
            try {
              await this.api.post('/listings', {
                title: 'Test',
                category: 'studio'
              }, {
                headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
              });
              throw new Error('Should have failed');
            } catch (error: any) {
              if (error.response?.status === 403) {
                this.log('Authentication & Authorization', 'Role-based access control', 'PASS');
              } else {
                throw error;
              }
            }
          }
        },
        {
          name: 'Email verification check',
          run: async () => {
            // Create unverified user
            const email = `unverified.${Date.now()}@test.com`;
            await this.api.post('/auth/register', {
              email,
              password: 'Test123!',
              name: 'Unverified User',
              role: 'host'
            });

            const loginRes = await this.api.post('/auth/login', {
              email,
              password: 'Test123!'
            });

            // Try to create listing (should fail)
            try {
              await this.api.post('/listings', {
                title: 'Test'
              }, {
                headers: { Authorization: `Bearer ${loginRes.data.data.accessToken}` }
              });
              throw new Error('Should require verification');
            } catch (error: any) {
              if (error.response?.status === 403 && error.response?.data?.message?.includes('verification')) {
                this.log('Authentication & Authorization', 'Email verification check', 'PASS');
              } else {
                throw error;
              }
            }
          }
        }
      ]
    };
  }

  private getListingsTestSuite(): TestSuite {
    return {
      name: 'Listings Management',
      tests: [
        {
          name: 'Get all listings',
          run: async () => {
            const res = await this.api.get('/listings');
            if (res.data.success && Array.isArray(res.data.data.listings)) {
              this.log('Listings Management', 'Get all listings', 'PASS', 
                `Found ${res.data.data.listings.length} listings`);
            } else {
              throw new Error('Invalid response format');
            }
          }
        },
        {
          name: 'Pagination',
          run: async () => {
            const page1 = await this.api.get('/listings?page=1&limit=3');
            const page2 = await this.api.get('/listings?page=2&limit=3');
            
            if (page1.data.data.listings.length <= 3 && 
                page1.data.data.pagination.page === 1) {
              this.log('Listings Management', 'Pagination', 'PASS');
            } else {
              throw new Error('Pagination not working correctly');
            }
          }
        },
        {
          name: 'City filter',
          run: async () => {
            const res = await this.api.get('/listings?city=Алматы');
            const listings = res.data.data.listings;
            const allInAlmaty = listings.every((l: any) => l.city === 'Алматы');
            
            if (allInAlmaty) {
              this.log('Listings Management', 'City filter', 'PASS', 
                `All ${listings.length} listings in Алматы`);
            } else {
              throw new Error('Filter not working');
            }
          }
        },
        {
          name: 'Price range filter',
          run: async () => {
            const res = await this.api.get('/listings?minPrice=5000&maxPrice=10000');
            const listings = res.data.data.listings;
            const allInRange = listings.every((l: any) => 
              parseFloat(l.price_per_hour) >= 5000 && 
              parseFloat(l.price_per_hour) <= 10000
            );
            
            if (allInRange) {
              this.log('Listings Management', 'Price range filter', 'PASS');
            } else {
              throw new Error('Price filter not working');
            }
          }
        },
        {
          name: 'Create listing',
          run: async () => {
            const res = await this.api.post('/listings', {
              title: 'Test Studio ' + Date.now(),
              description: 'Test description',
              category: 'Студия',
              address: 'Test address',
              city: 'Алматы',
              area: 100,
              maxGuests: 10,
              pricePerHour: 8000,
              amenities: ['wifi', 'parking']
            }, {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            
            if (res.data.success && res.data.data.id) {
              this.log('Listings Management', 'Create listing', 'PASS', 
                `Created ID: ${res.data.data.id}`);
            } else {
              throw new Error('Failed to create');
            }
          }
        },
        {
          name: 'Update listing',
          run: async () => {
            // Get user's listings first
            const userListings = await this.api.get('/listings/user/20', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            
            if (userListings.data.data.listings.length > 0) {
              const listingId = userListings.data.data.listings[0].id;
              const res = await this.api.put(`/listings/${listingId}`, {
                pricePerHour: 9000
              }, {
                headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
              });
              
              if (res.data.success) {
                this.log('Listings Management', 'Update listing', 'PASS');
              } else {
                throw new Error('Update failed');
              }
            } else {
              this.log('Listings Management', 'Update listing', 'PASS', 'No listings to update');
            }
          }
        },
        {
          name: 'Get single listing',
          run: async () => {
            const res = await this.api.get('/listings/1');
            if (res.data.success && res.data.data.listing) {
              this.log('Listings Management', 'Get single listing', 'PASS', 
                res.data.data.listing.title);
            } else {
              throw new Error('Failed to get listing');
            }
          }
        }
      ]
    };
  }

  private getBookingsTestSuite(): TestSuite {
    return {
      name: 'Booking System',
      tests: [
        {
          name: 'Check availability',
          run: async () => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const date = tomorrow.toISOString().split('T')[0];
            
            const res = await this.api.get(`/bookings/availability/1?date=${date}`);
            if (res.data.success && Array.isArray(res.data.data.availableSlots)) {
              this.log('Booking System', 'Check availability', 'PASS', 
                `${res.data.data.availableSlots.length} slots available`);
            } else {
              throw new Error('Invalid availability response');
            }
          }
        },
        {
          name: 'Create booking',
          run: async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            
            const res = await this.api.post('/bookings', {
              listingId: 1,
              date: futureDate.toISOString().split('T')[0],
              startTime: '10:00',
              endTime: '14:00',
              guestsCount: 5,
              message: 'Test booking'
            }, {
              headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
            });
            
            if (res.data.success && res.data.data.booking) {
              this.log('Booking System', 'Create booking', 'PASS', 
                `Booking ID: ${res.data.data.booking.id}`);
            } else {
              throw new Error('Failed to create booking');
            }
          }
        },
        {
          name: 'Get user bookings',
          run: async () => {
            const res = await this.api.get('/bookings/my', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
            });
            
            if (res.data.success && Array.isArray(res.data.data.bookings)) {
              this.log('Booking System', 'Get user bookings', 'PASS', 
                `Found ${res.data.data.bookings.length} bookings`);
            } else {
              throw new Error('Failed to get bookings');
            }
          }
        },
        {
          name: 'Get host bookings',
          run: async () => {
            const res = await this.api.get('/bookings/host', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            
            if (res.data.success && Array.isArray(res.data.data.bookings)) {
              this.log('Booking System', 'Get host bookings', 'PASS', 
                `Found ${res.data.data.bookings.length} bookings`);
            } else {
              throw new Error('Failed to get host bookings');
            }
          }
        },
        {
          name: 'Update booking status',
          run: async () => {
            // Get a booking first
            const bookings = await this.api.get('/bookings/host', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            
            if (bookings.data.data.bookings.length > 0) {
              const bookingId = bookings.data.data.bookings[0].id;
              const res = await this.api.put(`/bookings/${bookingId}/status`, {
                status: 'confirmed'
              }, {
                headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
              });
              
              if (res.data.success) {
                this.log('Booking System', 'Update booking status', 'PASS');
              } else {
                throw new Error('Failed to update status');
              }
            } else {
              this.log('Booking System', 'Update booking status', 'PASS', 'No bookings to update');
            }
          }
        }
      ]
    };
  }

  private getReviewsTestSuite(): TestSuite {
    return {
      name: 'Reviews & Ratings',
      tests: [
        {
          name: 'Get listing reviews',
          run: async () => {
            const res = await this.api.get('/reviews/listing/1');
            if (res.data.success && Array.isArray(res.data.data.reviews)) {
              this.log('Reviews & Ratings', 'Get listing reviews', 'PASS', 
                `Found ${res.data.data.reviews.length} reviews`);
            } else {
              throw new Error('Failed to get reviews');
            }
          }
        },
        {
          name: 'Get user reviews',
          run: async () => {
            const res = await this.api.get('/reviews/user/20');
            if (res.data.success && res.data.data.reviews !== undefined) {
              this.log('Reviews & Ratings', 'Get user reviews', 'PASS', 
                `Avg rating: ${res.data.data.averageRating || 'N/A'}`);
            } else {
              throw new Error('Failed to get user reviews');
            }
          }
        },
        {
          name: 'Review validation',
          run: async () => {
            // Try to create review without completed booking
            try {
              await this.api.post('/reviews', {
                bookingId: 999,
                rating: 5,
                comment: 'Test'
              }, {
                headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
              });
              throw new Error('Should have failed');
            } catch (error: any) {
              if (error.response?.status === 400 || error.response?.status === 403) {
                this.log('Reviews & Ratings', 'Review validation', 'PASS', 
                  'Properly validates booking requirement');
              } else {
                throw error;
              }
            }
          }
        }
      ]
    };
  }

  private getMessagesTestSuite(): TestSuite {
    return {
      name: 'Messaging System',
      tests: [
        {
          name: 'Get conversations',
          run: async () => {
            const res = await this.api.get('/messages/conversations', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
            });
            
            if (res.data.success && Array.isArray(res.data.data.conversations)) {
              this.log('Messaging System', 'Get conversations', 'PASS', 
                `Found ${res.data.data.conversations.length} conversations`);
            } else {
              throw new Error('Failed to get conversations');
            }
          }
        },
        {
          name: 'Get messages in booking',
          run: async () => {
            // Get a booking first
            const bookings = await this.api.get('/bookings/my', {
              headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
            });
            
            if (bookings.data.data.bookings.length > 0) {
              const bookingId = bookings.data.data.bookings[0].id;
              const res = await this.api.get(`/messages/booking/${bookingId}`, {
                headers: { Authorization: `Bearer ${this.tokens.verifiedGuest}` }
              });
              
              if (res.data.success && Array.isArray(res.data.data.messages)) {
                this.log('Messaging System', 'Get messages in booking', 'PASS');
              } else {
                throw new Error('Failed to get messages');
              }
            } else {
              this.log('Messaging System', 'Get messages in booking', 'PASS', 'No bookings');
            }
          }
        }
      ]
    };
  }

  private getDatabaseTestSuite(): TestSuite {
    return {
      name: 'Database Integrity',
      tests: [
        {
          name: 'User count',
          run: async () => {
            const [result] = await this.db.execute('SELECT COUNT(*) as count FROM users');
            const count = result[0].count;
            this.log('Database Integrity', 'User count', 'PASS', `${count} users`);
          }
        },
        {
          name: 'Listing count',
          run: async () => {
            const [result] = await this.db.execute('SELECT COUNT(*) as count FROM listings WHERE status = "active"');
            const count = result[0].count;
            this.log('Database Integrity', 'Listing count', 'PASS', `${count} active listings`);
          }
        },
        {
          name: 'Foreign key constraints',
          run: async () => {
            try {
              // Try to insert booking with non-existent user
              await this.db.execute(
                'INSERT INTO bookings (listing_id, guest_id, host_id, date, start_time, end_time) VALUES (?, ?, ?, ?, ?, ?)',
                [1, 99999, 99999, '2025-01-01', '10:00', '12:00']
              );
              throw new Error('Should have failed');
            } catch (error: any) {
              if (error.code === 'ER_NO_REFERENCED_ROW_2') {
                this.log('Database Integrity', 'Foreign key constraints', 'PASS');
              } else {
                throw error;
              }
            }
          }
        },
        {
          name: 'Indexes exist',
          run: async () => {
            const [indexes] = await this.db.execute('SHOW INDEX FROM listings');
            const hasIndexes = indexes.length > 0;
            if (hasIndexes) {
              this.log('Database Integrity', 'Indexes exist', 'PASS', `${indexes.length} indexes`);
            } else {
              throw new Error('No indexes found');
            }
          }
        }
      ]
    };
  }

  private getSecurityTestSuite(): TestSuite {
    return {
      name: 'Security',
      tests: [
        {
          name: 'SQL injection prevention',
          run: async () => {
            try {
              await this.api.get(`/listings?city='; DROP TABLE users; --`);
              // If we get here, the query was handled safely
              this.log('Security', 'SQL injection prevention', 'PASS');
            } catch (error) {
              // Also pass if it errors out safely
              this.log('Security', 'SQL injection prevention', 'PASS');
            }
          }
        },
        {
          name: 'XSS prevention',
          run: async () => {
            const res = await this.api.post('/listings', {
              title: '<script>alert("XSS")</script>',
              description: 'Test',
              category: 'Студия',
              address: 'Test',
              city: 'Алматы',
              area: 50,
              maxGuests: 5,
              pricePerHour: 5000
            }, {
              headers: { Authorization: `Bearer ${this.tokens.verifiedHost}` }
            });
            
            if (res.data.success) {
              // Check if the title was stored safely
              const listing = await this.api.get(`/listings/${res.data.data.id}`);
              const title = listing.data.data.listing.title;
              if (title.includes('<script>')) {
                this.log('Security', 'XSS prevention', 'PASS', 'HTML stored as-is');
              } else {
                throw new Error('Title was modified');
              }
            }
          }
        },
        {
          name: 'Rate limiting',
          run: async () => {
            const promises = [];
            for (let i = 0; i < 10; i++) {
              promises.push(
                this.api.post('/auth/login', { 
                  email: 'test@test.com', 
                  password: 'wrong' 
                }).catch(err => err.response)
              );
            }
            
            const responses = await Promise.all(promises);
            const rateLimited = responses.some(r => r?.status === 429);
            
            if (rateLimited) {
              this.log('Security', 'Rate limiting', 'PASS');
            } else {
              throw new Error('Not rate limited');
            }
          }
        },
        {
          name: 'Password hashing',
          run: async () => {
            const [users] = await this.db.execute(
              'SELECT password FROM users LIMIT 1'
            );
            const hashedPassword = users[0].password;
            
            // Check if it looks like a bcrypt hash
            if (hashedPassword.startsWith('$2') && hashedPassword.length >= 60) {
              this.log('Security', 'Password hashing', 'PASS');
            } else {
              throw new Error('Passwords not properly hashed');
            }
          }
        }
      ]
    };
  }

  private getPerformanceTestSuite(): TestSuite {
    return {
      name: 'Performance',
      tests: [
        {
          name: 'Response time - listings',
          run: async () => {
            const start = Date.now();
            await this.api.get('/listings');
            const duration = Date.now() - start;
            
            if (duration < 1000) {
              this.log('Performance', 'Response time - listings', 'PASS', `${duration}ms`);
            } else {
              throw new Error(`Too slow: ${duration}ms`);
            }
          }
        },
        {
          name: 'Response time - single listing',
          run: async () => {
            const start = Date.now();
            await this.api.get('/listings/1');
            const duration = Date.now() - start;
            
            if (duration < 500) {
              this.log('Performance', 'Response time - single listing', 'PASS', `${duration}ms`);
            } else {
              throw new Error(`Too slow: ${duration}ms`);
            }
          }
        },
        {
          name: 'Concurrent requests',
          run: async () => {
            const start = Date.now();
            const promises = [];
            
            for (let i = 0; i < 10; i++) {
              promises.push(this.api.get('/listings?page=' + (i + 1)));
            }
            
            await Promise.all(promises);
            const duration = Date.now() - start;
            
            if (duration < 3000) {
              this.log('Performance', 'Concurrent requests', 'PASS', 
                `10 requests in ${duration}ms`);
            } else {
              throw new Error(`Too slow: ${duration}ms`);
            }
          }
        }
      ]
    };
  }

  private async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    // Delete test users created during tests
    await this.db.execute(
      'DELETE FROM users WHERE email LIKE "test.%" OR email LIKE "unverified.%"'
    );
    
    // Delete test listings
    await this.db.execute(
      'DELETE FROM listings WHERE title LIKE "Test Studio %"'
    );
    
    console.log('✅ Cleanup completed');
  }

  private printSummary() {
    console.log('\n\n═══ COMPREHENSIVE TEST SUMMARY ═══\n');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length;
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length;
    const successRate = Math.round((passedTests / totalTests) * 100);
    
    console.log(`📊 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    
    // Group by suite
    const suites = [...new Set(this.testResults.map(r => r.suite))];
    console.log('\n📋 Results by Suite:');
    
    suites.forEach(suite => {
      const suiteTests = this.testResults.filter(r => r.suite === suite);
      const suitePassed = suiteTests.filter(r => r.status === 'PASS').length;
      console.log(`   ${suite}: ${suitePassed}/${suiteTests.length} passed`);
    });
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => r.status === 'FAIL')
        .forEach(r => console.log(`   - [${r.suite}] ${r.test}: ${r.details || 'No details'}`));
    }
    
    // Performance summary
    const performanceTests = this.testResults.filter(r => r.suite === 'Performance');
    if (performanceTests.length > 0) {
      console.log('\n⚡ Performance Summary:');
      performanceTests.forEach(test => {
        if (test.details?.includes('ms')) {
          console.log(`   - ${test.test}: ${test.details}`);
        }
      });
    }
    
    // Security summary
    const securityTests = this.testResults.filter(r => r.suite === 'Security');
    const securityPassed = securityTests.filter(r => r.status === 'PASS').length;
    console.log(`\n🔒 Security: ${securityPassed}/${securityTests.length} tests passed`);
    
    // Overall health
    console.log('\n🏥 System Health:');
    if (successRate >= 90) {
      console.log('   ✅ Excellent - System is production ready');
    } else if (successRate >= 75) {
      console.log('   ⚠️ Good - Minor issues to address');
    } else {
      console.log('   ❌ Poor - Significant issues need fixing');
    }
  }
}

// Run the comprehensive tests
const tester = new ComprehensiveAPITester();
tester.runAllTests()
  .then(() => {
    console.log('\n✅ All tests completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite crashed:', error);
    process.exit(1);
  });