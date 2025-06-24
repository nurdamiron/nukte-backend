import bcrypt from 'bcryptjs';
import { getDB, connectDB } from '../config/database';

const seedData = async () => {
  try {
    await connectDB();
    const db = getDB();

    console.log('🌱 Starting database seeding...');

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await db.execute('DELETE FROM listing_images');
    // await db.execute('DELETE FROM reviews');
    // await db.execute('DELETE FROM messages');
    // await db.execute('DELETE FROM bookings');
    // await db.execute('DELETE FROM listings');
    // await db.execute('DELETE FROM email_verification_codes');
    // await db.execute('DELETE FROM password_reset_tokens');
    // await db.execute('DELETE FROM users');

    // Seed Users
    console.log('👥 Adding test users...');
    
    const users = [
      {
        name: 'Алия Назарбаева',
        email: 'aliya.host@nukte.kz',
        password: await bcrypt.hash('password123', 10),
        phone: '+7 (707) 123-4567',
        role: 'host',
        bio: 'Профессиональный фотограф с 5-летним опытом. Владею несколькими уникальными локациями в Алматы.',
        location: 'Алматы, Казахстан',
        verified: true,
        verification_status: 'verified'
      },
      {
        name: 'Данияр Жанузаков',
        email: 'daniiar.guest@nukte.kz',
        password: await bcrypt.hash('password123', 10),
        phone: '+7 (701) 234-5678',
        role: 'guest',
        bio: 'Свадебный фотограф, ищу красивые локации для съемок.',
        location: 'Нур-Султан, Казахстан',
        verified: true,
        verification_status: 'verified'
      },
      {
        name: 'Мадина Сулейменова',
        email: 'madina.both@nukte.kz',
        password: await bcrypt.hash('password123', 10),
        phone: '+7 (775) 345-6789',
        role: 'both',
        bio: 'Видеограф и владелец студии. Снимаю и сдаю локации.',
        location: 'Шымкент, Казахстан',
        verified: true,
        verification_status: 'verified'
      },
      {
        name: 'Арман Токтагулов',
        email: 'arman.photographer@nukte.kz',
        password: await bcrypt.hash('password123', 10),
        phone: '+7 (702) 456-7890',
        role: 'guest',
        bio: 'Fashion фотограф, специализируюсь на портретной съемке.',
        location: 'Караганда, Казахстан',
        verified: false,
        verification_status: 'none'
      },
      {
        name: 'Гульнара Абаева',
        email: 'gulnara.studio@nukte.kz',
        password: await bcrypt.hash('password123', 10),
        phone: '+7 (708) 567-8901',
        role: 'host',
        bio: 'Владелец фотостудии "Golden Hour". Современное оборудование и интерьеры.',
        location: 'Алматы, Казахстан',
        verified: true,
        verification_status: 'verified'
      }
    ];

    const userIds: number[] = [];
    for (const user of users) {
      const [result] = await db.execute(
        `INSERT INTO users (name, email, password, phone, role, bio, location, verified, verification_status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user.name, user.email, user.password, user.phone, user.role, user.bio, user.location, user.verified, user.verification_status]
      );
      userIds.push((result as any).insertId);
    }

    console.log(`✅ Added ${users.length} users`);

    // Seed Listings
    console.log('🏢 Adding test listings...');
    
    const listings = [
      {
        user_id: userIds[0], // Алия (host)
        title: 'Современная лофт-студия в центре Алматы',
        description: 'Просторная студия площадью 120 кв.м с высокими потолками, большими окнами и современным дизайном. Идеально подходит для fashion, портретной и коммерческой съемки. Включает профессиональное освещение, фоны и реквизит. Расположена в самом центре Алматы рядом с метро.',
        category: 'Студия',
        address: 'ул. Абая, 150/230, Алматы',
        city: 'Алматы',
        latitude: 43.2220,
        longitude: 76.8512,
        area: 120,
        max_guests: 15,
        price_per_hour: 8000,
        price_per_day: 50000,
        amenities: JSON.stringify(['wifi', 'parking', 'lighting', 'props', 'backdrop', 'changing_room']),
        rules: 'Бережное отношение к оборудованию\nУборка после съемки\nЗапрещено курение\nМаксимум 15 человек',
        status: 'active'
      },
      {
        user_id: userIds[2], // Мадина (both)
        title: 'Уютная кофейня с винтажным интерьером',
        description: 'Атмосферная кофейня с винтажной мебелью, кирпичными стенами и уютным освещением. Отлично подходит для lifestyle съемки, интервью, рекламы кафе. Возможна аренда в нерабочие часы или полная приватизация.',
        category: 'Кафе/Ресторан',
        address: 'ул. Байтурсынова, 85, Шымкент',
        city: 'Шымкент',
        latitude: 42.3417,
        longitude: 69.5900,
        area: 80,
        max_guests: 10,
        price_per_hour: 5000,
        price_per_day: 35000,
        amenities: JSON.stringify(['wifi', 'furniture', 'props', 'kitchen']),
        rules: 'Согласование времени съемки\nОсторожность с мебелью\nВозможность использования кухни',
        status: 'active'
      },
      {
        user_id: userIds[4], // Гульнара (host)
        title: 'Фотостудия "Golden Hour" с циклорамой',
        description: 'Профессиональная фотостудия с белой циклорамой 6x4м, системой Broncolor, множеством модификаторов света. Гримерная, костюмерная, зона отдыха. Идеально для предметной, портретной съемки и видео.',
        category: 'Студия',
        address: 'ул. Толе би, 273, Алматы',
        city: 'Алматы',
        latitude: 43.2567,
        longitude: 76.9286,
        area: 100,
        max_guests: 12,
        price_per_hour: 12000,
        price_per_day: 80000,
        amenities: JSON.stringify(['professional_lighting', 'cyclorama', 'props', 'changing_room', 'makeup_room', 'wifi', 'parking']),
        rules: 'Профессиональное использование оборудования\nОбязательна предварительная консультация\nДополнительная плата за расходники',
        status: 'active'
      },
      {
        user_id: userIds[0], // Алия (host)
        title: 'Панорамная терраса с видом на горы',
        description: 'Открытая терраса на 15 этаже с потрясающим видом на горы Заилийского Алатау. Идеально для съемки на рассвете/закате, романтических фотосессий, свадеб. Современная мебель, стеклянные перила.',
        category: 'Терраса/Крыша',
        address: 'ул. Ал-Фараби, 77/8, Алматы',
        city: 'Алматы',
        latitude: 43.2075,
        longitude: 76.8816,
        area: 60,
        max_guests: 8,
        price_per_hour: 6000,
        price_per_day: 40000,
        amenities: JSON.stringify(['scenic_view', 'furniture', 'natural_light']),
        rules: 'Съемка только при хорошей погоде\nОсторожность на высоте\nШумоизоляция обязательна после 22:00',
        status: 'active'
      },
      {
        user_id: userIds[2], // Мадина (both)
        title: 'Минималистичная галерея современного искусства',
        description: 'Белые стены, полированный бетонный пол, высокие потолки 4м. Естественное освещение через большие окна. Подходит для концептуальных съемок, выставок, презентаций.',
        category: 'Галерея',
        address: 'ул. Кунаева, 12, Шымкент',
        city: 'Шымкент',
        latitude: 42.3478,
        longitude: 69.5869,
        area: 150,
        max_guests: 20,
        price_per_hour: 4000,
        price_per_day: 25000,
        amenities: JSON.stringify(['natural_light', 'minimal_design', 'high_ceilings', 'wifi']),
        rules: 'Бережное отношение к произведениям искусства\nЗапрещены напитки и еда\nИспользование только мягкого света',
        status: 'active'
      }
    ];

    const listingIds: number[] = [];
    for (const listing of listings) {
      const [result] = await db.execute(
        `INSERT INTO listings (user_id, title, description, category, address, city, latitude, longitude, area, max_guests, price_per_hour, price_per_day, amenities, rules, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [listing.user_id, listing.title, listing.description, listing.category, listing.address, listing.city, listing.latitude, listing.longitude, listing.area, listing.max_guests, listing.price_per_hour, listing.price_per_day, listing.amenities, listing.rules, listing.status]
      );
      listingIds.push((result as any).insertId);
    }

    console.log(`✅ Added ${listings.length} listings`);

    // Seed Listing Images
    console.log('🖼️ Adding listing images...');
    
    const images = [
      // Лофт-студия
      { listing_id: listingIds[0], url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', is_primary: true, order_index: 0 },
      { listing_id: listingIds[0], url: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800', is_primary: false, order_index: 1 },
      { listing_id: listingIds[0], url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800', is_primary: false, order_index: 2 },
      
      // Кофейня
      { listing_id: listingIds[1], url: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800', is_primary: true, order_index: 0 },
      { listing_id: listingIds[1], url: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=800', is_primary: false, order_index: 1 },
      
      // Студия Golden Hour
      { listing_id: listingIds[2], url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800', is_primary: true, order_index: 0 },
      { listing_id: listingIds[2], url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800', is_primary: false, order_index: 1 },
      
      // Терраса
      { listing_id: listingIds[3], url: 'https://images.unsplash.com/photo-1520637836862-4d197d17c26a?w=800', is_primary: true, order_index: 0 },
      { listing_id: listingIds[3], url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800', is_primary: false, order_index: 1 },
      
      // Галерея
      { listing_id: listingIds[4], url: 'https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=800', is_primary: true, order_index: 0 },
      { listing_id: listingIds[4], url: 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800', is_primary: false, order_index: 1 }
    ];

    for (const image of images) {
      await db.execute(
        'INSERT INTO listing_images (listing_id, url, is_primary, order_index) VALUES (?, ?, ?, ?)',
        [image.listing_id, image.url, image.is_primary, image.order_index]
      );
    }

    console.log(`✅ Added ${images.length} listing images`);

    // Seed Bookings
    console.log('📅 Adding test bookings...');
    
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const bookings = [
      {
        listing_id: listingIds[0], // Лофт-студия
        guest_id: userIds[1], // Данияр (guest)
        host_id: userIds[0], // Алия (host)
        date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '14:00',
        guests_count: 5,
        total_price: 32000,
        service_fee: 3200,
        status: 'confirmed',
        guest_message: 'Планируем свадебную фотосессию. Нужно ли дополнительное освещение?'
      },
      {
        listing_id: listingIds[2], // Студия Golden Hour
        guest_id: userIds[3], // Арман (guest)
        host_id: userIds[4], // Гульнара (host)
        date: nextWeek.toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '13:00',
        guests_count: 3,
        total_price: 48000,
        service_fee: 4800,
        status: 'pending',
        guest_message: 'Fashion съемка для журнала. Требуется профессиональное освещение.'
      }
    ];

    const bookingIds: number[] = [];
    for (const booking of bookings) {
      const [result] = await db.execute(
        `INSERT INTO bookings (listing_id, guest_id, host_id, date, start_time, end_time, guests_count, total_price, service_fee, status, guest_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [booking.listing_id, booking.guest_id, booking.host_id, booking.date, booking.start_time, booking.end_time, booking.guests_count, booking.total_price, booking.service_fee, booking.status, booking.guest_message]
      );
      bookingIds.push((result as any).insertId);
    }

    console.log(`✅ Added ${bookings.length} bookings`);

    // Seed Reviews
    console.log('⭐ Adding reviews...');
    
    const reviews = [
      {
        listing_id: listingIds[0],
        booking_id: bookingIds[0],
        reviewer_id: userIds[1], // Данияр
        reviewed_id: userIds[0], // Алия
        rating: 5,
        comment: 'Отличная студия! Просторная, чистая, хорошее освещение. Алия очень отзывчивая и помогла с настройкой света. Обязательно вернемся!',
        reviewer_type: 'guest'
      },
      {
        listing_id: listingIds[2],
        booking_id: bookingIds[1],
        reviewer_id: userIds[4], // Гульнара
        reviewed_id: userIds[3], // Арман
        rating: 4,
        comment: 'Профессиональный подход к работе. Арман бережно относился к оборудованию. Небольшая задержка по времени, но результат отличный.',
        reviewer_type: 'host'
      }
    ];

    for (const review of reviews) {
      await db.execute(
        `INSERT INTO reviews (listing_id, booking_id, reviewer_id, reviewed_id, rating, comment, reviewer_type) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [review.listing_id, review.booking_id, review.reviewer_id, review.reviewed_id, review.rating, review.comment, review.reviewer_type]
      );
    }

    console.log(`✅ Added ${reviews.length} reviews`);

    // Seed Messages
    console.log('💬 Adding messages...');
    
    const messages = [
      {
        booking_id: bookingIds[0],
        sender_id: userIds[1], // Данияр
        receiver_id: userIds[0], // Алия
        message: 'Привет! Подскажите, есть ли возможность приехать за полчаса до начала для подготовки?',
        is_read: true
      },
      {
        booking_id: bookingIds[0],
        sender_id: userIds[0], // Алия
        receiver_id: userIds[1], // Данияр
        message: 'Конечно! Студия будет готова к 9:30. Также подготовлю дополнительные фоны.',
        is_read: true
      },
      {
        booking_id: bookingIds[1],
        sender_id: userIds[3], // Арман
        receiver_id: userIds[4], // Гульнара
        message: 'Добрый день! Какой именно модификатор света у вас есть для портретной съемки?',
        is_read: false
      }
    ];

    for (const message of messages) {
      await db.execute(
        `INSERT INTO messages (booking_id, sender_id, receiver_id, message, is_read) 
         VALUES (?, ?, ?, ?, ?)`,
        [message.booking_id, message.sender_id, message.receiver_id, message.message, message.is_read]
      );
    }

    console.log(`✅ Added ${messages.length} messages`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`👥 Users: ${users.length}`);
    console.log(`🏢 Listings: ${listings.length}`);
    console.log(`🖼️ Images: ${images.length}`);
    console.log(`📅 Bookings: ${bookings.length}`);
    console.log(`⭐ Reviews: ${reviews.length}`);
    console.log(`💬 Messages: ${messages.length}`);
    
    console.log('\n🔑 Test user credentials:');
    console.log('Host: aliya.host@nukte.kz / password123');
    console.log('Guest: daniiar.guest@nukte.kz / password123');
    console.log('Both: madina.both@nukte.kz / password123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedData();