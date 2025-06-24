import { getDB, connectDB } from '../config/database';

async function debugReviews() {
  try {
    await connectDB();
    const db = getDB();
    
    console.log('Testing reviews query...\n');
    
    // Test 1: Basic query
    try {
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
        [1, 10, 0]
      );
      console.log('✅ Reviews query successful:', reviews);
    } catch (error: any) {
      console.log('❌ Reviews query failed:', error.message);
      console.log('SQL Error:', error.sqlMessage);
    }
    
    // Test 2: Check if reviews table exists
    try {
      const [tables] = await db.execute(
        "SHOW TABLES LIKE 'reviews'"
      );
      console.log('\nReviews table exists:', tables);
    } catch (error: any) {
      console.log('❌ Table check failed:', error.message);
    }
    
    // Test 3: Check reviews table structure
    try {
      const [columns] = await db.execute(
        "DESCRIBE reviews"
      );
      console.log('\nReviews table structure:');
      console.log(columns);
    } catch (error: any) {
      console.log('❌ Table structure check failed:', error.message);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Debug failed:', error);
    process.exit(1);
  }
}

debugReviews();