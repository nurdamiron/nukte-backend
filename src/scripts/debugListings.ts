import axios from 'axios';

const debugAPI = async () => {
  try {
    console.log('🔍 Testing listings API endpoint...\n');

    const response = await axios.get('http://localhost:5002/api/listings');
    console.log('✅ API call successful!');
    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('❌ API call failed:', error.response?.data || error.message);
    
    // Try to get detailed error
    if (error.response?.status === 500) {
      console.log('\nTrying direct database query...');
      
      const { connectDB, getDB } = await import('../config/database');
      await connectDB();
      const db = getDB();
      
      try {
        const [listings] = await db.execute(`
          SELECT l.*, u.name as host_name
          FROM listings l
          JOIN users u ON l.user_id = u.id
          WHERE l.status = 'active'
          LIMIT 1
        `);
        
        console.log('✅ Direct DB query works');
        console.log('Sample listing:', (listings as any)[0]);
      } catch (dbError) {
        console.error('❌ Direct DB query failed:', dbError);
      }
    }
  }
  
  process.exit(0);
};

debugAPI();