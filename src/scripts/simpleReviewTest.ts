import { getDB, connectDB } from '../config/database';

async function simpleReviewTest() {
  try {
    await connectDB();
    const db = getDB();
    console.log('Database connected successfully');
    
    // Test the exact query from the controller
    const listingId = 1;
    const limit = 10;
    const offset = 0;
    
    console.log('Testing query with params:', { listingId, limit, offset });
    
    const [reviews] = await db.execute(
      `SELECT 
        r.id,
        r.rating,
        r.comment,
        r.created_at,
        u.name as reviewer_name,
        u.avatar as reviewer_avatar,
        r.reviewer_type
      FROM reviews r
      JOIN users u ON r.reviewer_id = u.id
      WHERE r.listing_id = ?
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?`,
      [listingId, limit, offset]
    );
    
    console.log('Query successful, results:', reviews);
    
    // Test the stats query
    const [stats] = await db.execute(
      `SELECT 
        COUNT(*) as total,
        COALESCE(AVG(rating), 0) as average_rating
      FROM reviews
      WHERE listing_id = ?`,
      [listingId]
    );
    
    console.log('Stats query successful:', stats);
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

simpleReviewTest();