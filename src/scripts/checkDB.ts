import { connectDB, getDB } from '../config/database';

const checkDatabase = async () => {
  try {
    await connectDB();
    const db = getDB();

    console.log('🔍 Checking database contents...\n');

    // Check users
    const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`👥 Users: ${(users as any)[0].count}`);

    // Check listings
    const [listings] = await db.execute('SELECT COUNT(*) as count FROM listings');
    console.log(`🏢 Listings: ${(listings as any)[0].count}`);

    // Check listing images
    const [images] = await db.execute('SELECT COUNT(*) as count FROM listing_images');
    console.log(`🖼️ Images: ${(images as any)[0].count}`);

    // Check bookings
    const [bookings] = await db.execute('SELECT COUNT(*) as count FROM bookings');
    console.log(`📅 Bookings: ${(bookings as any)[0].count}`);

    // Sample listing data
    const [sampleListings] = await db.execute(`
      SELECT l.id, l.title, l.status, l.amenities, u.name as host_name 
      FROM listings l 
      JOIN users u ON l.user_id = u.id 
      LIMIT 3
    `);
    
    console.log('\n📋 Sample listings:');
    (sampleListings as any[]).forEach((listing, index) => {
      console.log(`${index + 1}. ${listing.title} (ID: ${listing.id}) by ${listing.host_name}`);
      console.log(`   Status: ${listing.status}, Amenities: ${listing.amenities}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Database check failed:', error);
    process.exit(1);
  }
};

checkDatabase();