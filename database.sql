-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS made_in_lo;
USE made_in_lo;

-- Table structure for products
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) DEFAULT 0.00,
    image_url VARCHAR(255) DEFAULT 'img/placeholder.png',
    category VARCHAR(100) DEFAULT 'General',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertions SQL
INSERT INTO products (name, description, price, image_url, category) VALUES 
('Nom 1', 'pas encore', 0, 'img/2.png', 'T-Shirts'),
('Nom 2', 'pas encore', 0, 'img/4.png', 'Vests'),
('Nom 3', 'pas encore', 0, 'img/6.png', 'Hoodies'),
('Nom 4', 'pas encore', 0, 'img/8.png', 'Accessories'),
('Nom 5', 'pas encore', 0, 'img/13.png', 'Limited'),
('Nom 6', 'pas encore', 0, 'img/14.png', 'Summer'),
('Nom 7', 'pas encore', 0, 'img/15.png', 'Winter'),
('Nom 8', 'pas encore', 0, 'img/2.png', 'New Arrival');
