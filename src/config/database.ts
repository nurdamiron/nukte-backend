import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

let pool: mysql.Pool;

export const connectDB = async () => {
  try {
    // First, connect without specifying a database to create it if needed
    const tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
    });

    // Create database if it doesn't exist
    const dbName = process.env.DB_NAME || 'nukte_db';
    await tempConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`Database '${dbName}' ensured`);
    
    // Close temporary connection
    await tempConnection.end();

    // Now create the pool with the database
    pool = mysql.createPool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306'),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD,
      database: dbName,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    // Test connection
    const connection = await pool.getConnection();
    console.log('Connected to MySQL database');
    connection.release();

    // Create tables if they don't exist
    await createTables();
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
};

export const getDB = () => {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
};

const createTables = async () => {
  const queries = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      phone VARCHAR(20),
      password VARCHAR(255) NOT NULL,
      avatar VARCHAR(500),
      role ENUM('guest', 'host', 'both', 'admin') DEFAULT 'guest',
      bio TEXT,
      location VARCHAR(255),
      verified BOOLEAN DEFAULT FALSE,
      verification_status ENUM('none', 'pending', 'verified') DEFAULT 'none',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Listings table
    `CREATE TABLE IF NOT EXISTS listings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(50) NOT NULL,
      address VARCHAR(500) NOT NULL,
      city VARCHAR(100) NOT NULL,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      area INT NOT NULL,
      max_guests INT NOT NULL,
      price_per_hour DECIMAL(10, 2) NOT NULL,
      price_per_day DECIMAL(10, 2),
      amenities JSON,
      rules TEXT,
      status ENUM('active', 'paused', 'deleted') DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_city (city),
      INDEX idx_category (category),
      INDEX idx_status (status)
    )`,

    // Listing Images table
    `CREATE TABLE IF NOT EXISTS listing_images (
      id INT PRIMARY KEY AUTO_INCREMENT,
      listing_id INT NOT NULL,
      url VARCHAR(500) NOT NULL,
      is_primary BOOLEAN DEFAULT FALSE,
      order_index INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE
    )`,

    // Bookings table
    `CREATE TABLE IF NOT EXISTS bookings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      listing_id INT NOT NULL,
      guest_id INT NOT NULL,
      host_id INT NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      guests_count INT NOT NULL,
      total_price DECIMAL(10, 2) NOT NULL,
      service_fee DECIMAL(10, 2) NOT NULL,
      status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
      cancelled_by INT,
      cancellation_reason TEXT,
      guest_message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_date (date),
      INDEX idx_status (status)
    )`,

    // Reviews table
    `CREATE TABLE IF NOT EXISTS reviews (
      id INT PRIMARY KEY AUTO_INCREMENT,
      listing_id INT NOT NULL,
      booking_id INT NOT NULL,
      reviewer_id INT NOT NULL,
      reviewed_id INT NOT NULL,
      rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      reviewer_type ENUM('guest', 'host') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_review (booking_id, reviewer_id)
    )`,

    // Messages table
    `CREATE TABLE IF NOT EXISTS messages (
      id INT PRIMARY KEY AUTO_INCREMENT,
      booking_id INT NOT NULL,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      message TEXT NOT NULL,
      file_url VARCHAR(500),
      file_name VARCHAR(255),
      file_size VARCHAR(20),
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_booking (booking_id),
      INDEX idx_created (created_at)
    )`,

    // Availability table
    `CREATE TABLE IF NOT EXISTS availability (
      id INT PRIMARY KEY AUTO_INCREMENT,
      listing_id INT NOT NULL,
      date DATE NOT NULL,
      is_available BOOLEAN DEFAULT TRUE,
      reason VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
      UNIQUE KEY unique_availability (listing_id, date)
    )`,

    // Password reset tokens table
    `CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      token VARCHAR(255) NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_token (token),
      INDEX idx_expires (expires_at)
    )`,

    // Email verification codes table
    `CREATE TABLE IF NOT EXISTS email_verification_codes (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT NOT NULL,
      code VARCHAR(6) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      attempts INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_code (user_id, code),
      INDEX idx_expires (expires_at)
    )`
  ];

  for (const query of queries) {
    try {
      await pool.execute(query);
    } catch (error) {
      console.error('Error creating table:', error);
      throw error;
    }
  }

  console.log('All tables created successfully');
};