const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabase() {
  console.log('🗄️  Database Connection Test\n');
  console.log('=' .repeat(60) + '\n');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('✅ Connected to MySQL Database');
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_NAME}\n`);

    // Check tables
    console.log('📊 Database Tables:\n');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`  - ${tableName}`);
    });

    // Check data counts
    console.log('\n📈 Data Statistics:\n');
    
    const [users] = await connection.execute('SELECT COUNT(*) as count FROM users');
    console.log(`Users: ${users[0].count}`);
    
    const [listings] = await connection.execute('SELECT COUNT(*) as count FROM listings WHERE status != "deleted"');
    console.log(`Active Listings: ${listings[0].count}`);
    
    const [bookings] = await connection.execute('SELECT COUNT(*) as count FROM bookings');
    console.log(`Bookings: ${bookings[0].count}`);
    
    const [messages] = await connection.execute('SELECT COUNT(*) as count FROM messages');
    console.log(`Messages: ${messages[0].count}`);

    // Sample data
    console.log('\n📝 Sample Data:\n');
    
    // Recent users
    const [recentUsers] = await connection.execute(
      'SELECT id, name, email, role, created_at FROM users ORDER BY id DESC LIMIT 3'
    );
    console.log('Recent Users:');
    recentUsers.forEach(user => {
      console.log(`  - ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role}`);
    });

    // Recent listings
    console.log('\nRecent Listings:');
    const [recentListings] = await connection.execute(
      'SELECT id, title, city, category, status, amenities FROM listings ORDER BY id DESC LIMIT 3'
    );
    recentListings.forEach(listing => {
      console.log(`  - ID: ${listing.id}, Title: ${listing.title}, City: ${listing.city}, Status: ${listing.status}`);
      console.log(`    Amenities: ${listing.amenities}`);
    });

    // Active bookings
    console.log('\nActive Bookings:');
    const [activeBookings] = await connection.execute(
      `SELECT b.id, b.date, b.status, l.title as listing_title, 
              ug.name as guest_name, uh.name as host_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users ug ON b.guest_id = ug.id
       JOIN users uh ON b.host_id = uh.id
       WHERE b.status IN ('pending', 'confirmed')
       ORDER BY b.id DESC LIMIT 3`
    );
    activeBookings.forEach(booking => {
      console.log(`  - ID: ${booking.id}, Date: ${booking.date}, Status: ${booking.status}`);
      console.log(`    Listing: ${booking.listing_title}, Guest: ${booking.guest_name}, Host: ${booking.host_name}`);
    });

    // Check amenities format issue
    console.log('\n⚠️  Checking Amenities Format Issue:\n');
    const [amenitiesCheck] = await connection.execute(
      'SELECT id, title, amenities FROM listings WHERE amenities IS NOT NULL LIMIT 3'
    );
    amenitiesCheck.forEach(listing => {
      console.log(`Listing ${listing.id}: ${listing.title}`);
      console.log(`  Raw amenities: ${listing.amenities}`);
      console.log(`  Type: ${typeof listing.amenities}`);
      try {
        const parsed = JSON.parse(listing.amenities);
        console.log(`  ✅ Valid JSON: ${JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`  ❌ Invalid JSON - appears to be comma-separated string`);
      }
    });

    await connection.end();
    console.log('\n✅ Database check completed successfully');
    
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  }
}

checkDatabase();