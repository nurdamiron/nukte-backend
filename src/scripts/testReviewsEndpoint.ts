import express from 'express';
import { getListingReviews } from '../controllers/review.controller';
import { connectDB } from '../config/database';

async function testReviewsEndpoint() {
  await connectDB();
  
  const app = express();
  
  // Direct route without middleware
  app.get('/test/reviews/listing/:listingId', getListingReviews);
  
  // Error handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Error details:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  });
  
  const server = app.listen(5003, () => {
    console.log('Test server running on port 5003');
  });
  
  // Test the endpoint
  try {
    const response = await fetch('http://localhost:5003/test/reviews/listing/1');
    const data = await response.json();
    console.log('Response:', data);
  } catch (error) {
    console.error('Test failed:', error);
  }
  
  server.close();
  process.exit(0);
}

testReviewsEndpoint();