-- ==============================================================================
-- QueryPilot Realistic E-Commerce Synthetic Seed Data
-- ==============================================================================

-- 1. Seed Categories
INSERT INTO categories (id, name, description, created_at) VALUES
(1, 'Electronics', 'Smartphones, laptops, audio gear, and consumer smart home devices', '2024-01-01 00:00:00+00'),
(2, 'Apparel & Fashion', 'Men and women designer clothing, footwear, and luxury accessories', '2024-01-01 00:00:00+00'),
(3, 'Home & Kitchen', 'Kitchenware, modern furniture, cookware, and smart home appliances', '2024-01-01 00:00:00+00'),
(4, 'Health & Wellness', 'Vitamins, organic supplements, fitness equipment, and body care', '2024-01-01 00:00:00+00'),
(5, 'Books & Media', 'Technical literature, bestselling business guides, and educational media', '2024-01-01 00:00:00+00'),
(6, 'Sports & Outdoors', 'Athletic gear, camping equipment, and performance sporting goods', '2024-01-01 00:00:00+00');

SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));

-- 2. Seed Customers
INSERT INTO customers (id, name, email, phone, address, city, state, country, created_at) VALUES
(1, 'Sarah Chen', 'sarah.chen@techhub.io', '+1-415-555-0101', '742 Montgomery St', 'San Francisco', 'CA', 'USA', '2024-01-10 10:00:00+00'),
(2, 'Marcus Vance', 'marcus.vance@vancemedia.com', '+1-212-555-0142', '120 Broadway Suite 400', 'New York', 'NY', 'USA', '2024-01-12 11:30:00+00'),
(3, 'Elena Rodriguez', 'elena.r@austindesign.co', '+1-512-555-0199', '405 Congress Ave', 'Austin', 'TX', 'USA', '2024-01-15 09:15:00+00'),
(4, 'David Kim', 'david.kim@seattlebio.org', '+1-206-555-0178', '1100 Fairview Ave N', 'Seattle', 'WA', 'USA', '2024-01-18 14:20:00+00'),
(5, 'Jessica Miller', 'jessica.m@chicagoconsult.com', '+1-312-555-0165', '233 S Wacker Dr', 'Chicago', 'IL', 'USA', '2024-01-20 16:45:00+00'),
(6, 'Alexander Hayes', 'alex.hayes@bostondynamics.org', '+1-617-555-0112', '50 Milk St', 'Boston', 'MA', 'USA', '2024-02-01 08:30:00+00'),
(7, 'Priya Patel', 'priya.patel@denvergrowth.com', '+1-303-555-0144', '1600 17th St', 'Denver', 'CO', 'USA', '2024-02-05 12:00:00+00'),
(8, 'Liam O''Connor', 'liam.oc@miamilabs.io', '+1-305-555-0187', '1111 Brickell Ave', 'Miami', 'FL', 'USA', '2024-02-10 15:10:00+00'),
(9, 'Rachel Green', 'rachel.green@fashionpulse.net', '+1-404-555-0133', '3344 Peachtree Rd NE', 'Atlanta', 'GA', 'USA', '2024-02-14 10:45:00+00'),
(10, 'Thomas Wright', 'twright@portlandcraft.com', '+1-503-555-0190', '1120 NW Couch St', 'Portland', 'OR', 'USA', '2024-02-20 17:00:00+00'),
(11, 'Amanda Flores', 'amanda.flores@sandiegotech.com', '+1-619-555-0211', '401 B St', 'San Diego', 'CA', 'USA', '2024-03-01 11:15:00+00'),
(12, 'James Wilson', 'jwilson@dallascapital.com', '+1-214-555-0245', '2200 Ross Ave', 'Dallas', 'TX', 'USA', '2024-03-05 13:30:00+00'),
(13, 'Sophia Taylor', 'sophia.taylor@minnesotaflow.org', '+1-612-555-0288', '80 S 8th St', 'Minneapolis', 'MN', 'USA', '2024-03-10 09:50:00+00'),
(14, 'Ethan Brooks', 'ethan.brooks@phoenixsolar.net', '+1-602-555-0312', '100 W Washington St', 'Phoenix', 'AZ', 'USA', '2024-03-15 14:00:00+00'),
(15, 'Olivia Martinez', 'olivia.m@charlottefinance.com', '+1-704-555-0344', '200 S Tryon St', 'Charlotte', 'NC', 'USA', '2024-03-20 16:20:00+00');

SELECT setval('customers_id_seq', (SELECT MAX(id) FROM customers));

-- 3. Seed Products
INSERT INTO products (id, category_id, name, description, price, stock_quantity, sku, created_at) VALUES
(1, 1, 'ProNoise Wireless Studio Headphones', 'Active noise cancelling, 40h battery, high-fidelity spatial audio', 299.99, 85, 'ELEC-HDPH-001', '2024-01-01 00:00:00+00'),
(2, 1, 'UltraView 4K Curved Monitor 34-inch', '144Hz refresh rate, USB-C 90W PD, IPS ultrawide display', 649.50, 42, 'ELEC-MON-002', '2024-01-01 00:00:00+00'),
(3, 1, 'VoltCharge 65W GaN Compact Charger', 'Triple port fast charging brick for laptops, tablets, and phones', 39.99, 310, 'ELEC-CHG-003', '2024-01-01 00:00:00+00'),
(4, 1, 'StreamDeck Smart Keypad Pro', 'Customizable LCD keys for workflow automation and broadcast control', 149.00, 65, 'ELEC-STDK-004', '2024-01-05 00:00:00+00'),
(5, 1, 'AeroPoint Ergonomic Wireless Mouse', 'Silent clicks, 4000 DPI sensor, thumb scroll wheel, Bluetooth/2.4G', 79.95, 140, 'ELEC-MOU-005', '2024-01-05 00:00:00+00'),
(6, 2, 'Merino Wool Minimalist Crewneck', '100% extrafine Australian merino wool, odor-resistant, breathable', 115.00, 75, 'APP-SWT-001', '2024-01-05 00:00:00+00'),
(7, 2, 'All-Weather Tech Commuter Jacket', 'Waterproof DWR shell, seam-sealed, lightweight thermal lining', 220.00, 50, 'APP-JKT-002', '2024-01-05 00:00:00+00'),
(8, 2, 'Organic Cotton Heavyweight Tee', '280 GSM combed cotton, relaxed boxy cut, preshrunk', 45.00, 200, 'APP-TEE-003', '2024-01-05 00:00:00+00'),
(9, 2, 'Voyager Everyday Canvas Backpack', 'Water-resistant waxed canvas, 16-inch padded laptop compartment', 135.00, 90, 'APP-BAG-004', '2024-01-05 00:00:00+00'),
(10, 3, 'Barista Precision Burr Coffee Grinder', '40 grind settings, low-RPM conical stainless steel burrs', 189.99, 40, 'HOME-GRND-001', '2024-01-05 00:00:00+00'),
(11, 3, 'Cast Iron Enameled Dutch Oven 6-Qt', 'Even heat distribution, heavy-duty self-basting lid', 129.50, 60, 'HOME-DOVN-002', '2024-01-05 00:00:00+00'),
(12, 3, 'Smart Ambient LED Floor Lamp', 'Color temperature tuning 2200K-6500K, app & voice control', 89.00, 110, 'HOME-LAMP-003', '2024-01-05 00:00:00+00'),
(13, 3, 'Stainless Steel Thermal Carafe 1.5L', 'Vacuum insulated, keeps beverages hot for 12 hours', 42.00, 180, 'HOME-CARAF-004', '2024-01-05 00:00:00+00'),
(14, 4, 'Organic Daily Multivitamin & Minerals', 'Non-GMO, vegan capsules, 60-day supply with bioavailable minerals', 34.50, 350, 'HLTH-VIT-001', '2024-01-05 00:00:00+00'),
(15, 4, 'DeepTissue Percussive Therapy Massager', 'Brushless quiet motor, 5 speed levels, 6 massage head attachments', 169.00, 55, 'HLTH-MASS-002', '2024-01-05 00:00:00+00'),
(16, 4, 'HydraTrack Smart Insulated Bottle 32oz', 'Hydration reminder glowing ring, magnetic charging, temperature sensor', 54.00, 130, 'HLTH-BTL-003', '2024-01-05 00:00:00+00'),
(17, 5, 'Designing Data-Intensive Applications', 'O''Reilly landmark system architecture guide by Martin Kleppmann', 49.99, 120, 'BOOK-TECH-001', '2024-01-05 00:00:00+00'),
(18, 5, 'Principles of Product Strategy', 'Comprehensive guide to product discovery and modern unit economics', 32.50, 95, 'BOOK-PROD-002', '2024-01-05 00:00:00+00'),
(19, 5, 'The Pragmatic Programmer (20th Anniv)', 'Classic software engineering craft guide by Thomas & Hunt', 44.00, 85, 'BOOK-PRAG-003', '2024-01-05 00:00:00+00'),
(20, 6, 'Ultralight 2-Person Backpacking Tent', 'Siliconized nylon ripstop, anodized aluminum poles, 2.4 lbs total weight', 349.00, 30, 'SPRT-TENT-001', '2024-01-05 00:00:00+00'),
(21, 6, 'Carbon Fiber Quick-Lock Trekking Poles', 'Ergonomic cork handles, shock absorbing, 440g per pair', 89.95, 75, 'SPRT-POLE-002', '2024-01-05 00:00:00+00');

SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));

-- 4. Seed Orders
INSERT INTO orders (id, customer_id, order_date, status, total_amount, created_at) VALUES
(1, 1, '2024-01-20 14:15:00+00', 'delivered', 949.49, '2024-01-20 14:15:00+00'),
(2, 2, '2024-01-25 09:30:00+00', 'delivered', 149.00, '2024-01-25 09:30:00+00'),
(3, 3, '2024-02-02 16:40:00+00', 'delivered', 335.00, '2024-02-02 16:40:00+00'),
(4, 4, '2024-02-10 11:20:00+00', 'delivered', 189.99, '2024-02-10 11:20:00+00'),
(5, 5, '2024-02-18 13:45:00+00', 'delivered', 418.99, '2024-02-18 13:45:00+00'),
(6, 1, '2024-03-01 10:05:00+00', 'delivered', 126.50, '2024-03-01 10:05:00+00'),
(7, 6, '2024-03-08 15:30:00+00', 'delivered', 729.45, '2024-03-08 15:30:00+00'),
(8, 7, '2024-03-15 08:50:00+00', 'delivered', 129.50, '2024-03-15 08:50:00+00'),
(9, 8, '2024-03-22 17:15:00+00', 'delivered', 349.00, '2024-03-22 17:15:00+00'),
(10, 9, '2024-04-02 12:00:00+00', 'delivered', 265.00, '2024-04-02 12:00:00+00'),
(11, 10, '2024-04-10 14:25:00+00', 'delivered', 169.00, '2024-04-10 14:25:00+00'),
(12, 2, '2024-04-18 16:30:00+00', 'delivered', 649.50, '2024-04-18 16:30:00+00'),
(13, 3, '2024-05-01 09:10:00+00', 'delivered', 220.00, '2024-05-01 09:10:00+00'),
(14, 11, '2024-05-12 11:40:00+00', 'delivered', 379.94, '2024-05-12 11:40:00+00'),
(15, 12, '2024-05-20 15:00:00+00', 'delivered', 149.00, '2024-05-20 15:00:00+00'),
(16, 4, '2024-06-05 10:20:00+00', 'delivered', 438.95, '2024-06-05 10:20:00+00'),
(17, 13, '2024-06-15 13:50:00+00', 'delivered', 89.00, '2024-06-15 13:50:00+00'),
(18, 14, '2024-06-25 16:15:00+00', 'delivered', 254.98, '2024-06-25 16:15:00+00'),
(19, 5, '2024-07-02 10:30:00+00', 'delivered', 299.99, '2024-07-02 10:30:00+00'),
(20, 15, '2024-07-10 14:00:00+00', 'delivered', 42.00, '2024-07-10 14:00:00+00'),
(21, 6, '2024-07-20 11:15:00+00', 'delivered', 349.00, '2024-07-20 11:15:00+00'),
(22, 1, '2024-08-01 09:45:00+00', 'delivered', 189.99, '2024-08-01 09:45:00+00'),
(23, 7, '2024-08-10 16:20:00+00', 'delivered', 135.00, '2024-08-10 16:20:00+00'),
(24, 8, '2024-08-18 13:10:00+00', 'shipped', 299.99, '2024-08-18 13:10:00+00'),
(25, 9, '2024-08-25 15:40:00+00', 'shipped', 129.50, '2024-08-25 15:40:00+00'),
(26, 10, '2024-09-02 10:00:00+00', 'shipped', 89.95, '2024-09-02 10:00:00+00'),
(27, 2, '2024-09-05 11:30:00+00', 'processing', 220.00, '2024-09-05 11:30:00+00'),
(28, 11, '2024-09-10 14:15:00+00', 'processing', 339.98, '2024-09-10 14:15:00+00'),
(29, 12, '2024-09-15 09:20:00+00', 'pending', 649.50, '2024-09-15 09:20:00+00'),
(30, 3, '2024-09-18 16:00:00+00', 'pending', 115.00, '2024-09-18 16:00:00+00');

SELECT setval('orders_id_seq', (SELECT MAX(id) FROM orders));

-- 5. Seed Order Items
INSERT INTO order_items (id, order_id, product_id, quantity, unit_price, subtotal) VALUES
(1, 1, 1, 1, 299.99, 299.99),
(2, 1, 2, 1, 649.50, 649.50),
(3, 2, 4, 1, 149.00, 149.00),
(4, 3, 7, 1, 220.00, 220.00),
(5, 3, 6, 1, 115.00, 115.00),
(6, 4, 10, 1, 189.99, 189.99),
(7, 5, 1, 1, 299.99, 299.99),
(8, 5, 6, 1, 115.00, 115.00),
(9, 5, 3, 1, 39.99, 39.99),
(10, 6, 14, 1, 34.50, 34.50),
(11, 6, 17, 1, 49.99, 49.99),
(12, 6, 13, 1, 42.00, 42.00),
(13, 7, 2, 1, 649.50, 649.50),
(14, 7, 5, 1, 79.95, 79.95),
(15, 8, 11, 1, 129.50, 129.50),
(16, 9, 20, 1, 349.00, 349.00),
(17, 10, 9, 1, 135.00, 135.00),
(18, 10, 8, 2, 45.00, 90.00),
(19, 10, 3, 1, 39.99, 39.99),
(20, 11, 15, 1, 169.00, 169.00),
(21, 12, 2, 1, 649.50, 649.50),
(22, 13, 7, 1, 220.00, 220.00),
(23, 14, 1, 1, 299.99, 299.99),
(24, 14, 5, 1, 79.95, 79.95),
(25, 15, 4, 1, 149.00, 149.00),
(26, 16, 20, 1, 349.00, 349.00),
(27, 16, 21, 1, 89.95, 89.95),
(28, 17, 12, 1, 89.00, 89.00),
(29, 18, 10, 1, 189.99, 189.99),
(30, 18, 18, 2, 32.50, 65.00),
(31, 19, 1, 1, 299.99, 299.99),
(32, 20, 13, 1, 42.00, 42.00),
(33, 21, 20, 1, 349.00, 349.00),
(34, 22, 10, 1, 189.99, 189.99),
(35, 23, 9, 1, 135.00, 135.00),
(36, 24, 1, 1, 299.99, 299.99),
(37, 25, 11, 1, 129.50, 129.50),
(38, 26, 21, 1, 89.95, 89.95),
(39, 27, 7, 1, 220.00, 220.00),
(40, 28, 1, 1, 299.99, 299.99),
(41, 28, 3, 1, 39.99, 39.99),
(42, 29, 2, 1, 649.50, 649.50),
(43, 30, 6, 1, 115.00, 115.00);

SELECT setval('order_items_id_seq', (SELECT MAX(id) FROM order_items));

-- 6. Seed Payments
INSERT INTO payments (id, order_id, payment_date, amount, payment_method, status) VALUES
(1, 1, '2024-01-20 14:16:00+00', 949.49, 'credit_card', 'completed'),
(2, 2, '2024-01-25 09:31:00+00', 149.00, 'apple_pay', 'completed'),
(3, 3, '2024-02-02 16:41:00+00', 335.00, 'paypal', 'completed'),
(4, 4, '2024-02-10 11:21:00+00', 189.99, 'credit_card', 'completed'),
(5, 5, '2024-02-18 13:46:00+00', 418.99, 'credit_card', 'completed'),
(6, 6, '2024-03-01 10:06:00+00', 126.50, 'apple_pay', 'completed'),
(7, 7, '2024-03-08 15:31:00+00', 729.45, 'bank_transfer', 'completed'),
(8, 8, '2024-03-15 08:51:00+00', 129.50, 'credit_card', 'completed'),
(9, 9, '2024-03-22 17:16:00+00', 349.00, 'credit_card', 'completed'),
(10, 10, '2024-04-02 12:01:00+00', 265.00, 'paypal', 'completed'),
(11, 11, '2024-04-10 14:26:00+00', 169.00, 'apple_pay', 'completed'),
(12, 12, '2024-04-18 16:31:00+00', 649.50, 'credit_card', 'completed'),
(13, 13, '2024-05-01 09:11:00+00', 220.00, 'credit_card', 'completed'),
(14, 14, '2024-05-12 11:41:00+00', 379.94, 'paypal', 'completed'),
(15, 15, '2024-05-20 15:01:00+00', 149.00, 'credit_card', 'completed'),
(16, 16, '2024-06-05 10:21:00+00', 438.95, 'apple_pay', 'completed'),
(17, 17, '2024-06-15 13:51:00+00', 89.00, 'credit_card', 'completed'),
(18, 18, '2024-06-25 16:16:00+00', 254.98, 'credit_card', 'completed'),
(19, 19, '2024-07-02 10:31:00+00', 299.99, 'paypal', 'completed'),
(20, 20, '2024-07-10 14:01:00+00', 42.00, 'apple_pay', 'completed'),
(21, 21, '2024-07-20 11:16:00+00', 349.00, 'credit_card', 'completed'),
(22, 22, '2024-08-01 09:46:00+00', 189.99, 'credit_card', 'completed'),
(23, 23, '2024-08-10 16:21:00+00', 135.00, 'apple_pay', 'completed'),
(24, 24, '2024-08-18 13:11:00+00', 299.99, 'credit_card', 'completed'),
(25, 25, '2024-08-25 15:41:00+00', 129.50, 'paypal', 'completed'),
(26, 26, '2024-09-02 10:01:00+00', 89.95, 'credit_card', 'completed'),
(27, 27, '2024-09-05 11:31:00+00', 220.00, 'apple_pay', 'completed'),
(28, 28, '2024-09-10 14:16:00+00', 339.98, 'credit_card', 'completed'),
(29, 29, '2024-09-15 09:21:00+00', 649.50, 'credit_card', 'pending'),
(30, 30, '2024-09-18 16:01:00+00', 115.00, 'credit_card', 'pending');

SELECT setval('payments_id_seq', (SELECT MAX(id) FROM payments));

-- 7. Seed Shipments
INSERT INTO shipments (id, order_id, tracking_number, carrier, status, shipped_date, delivered_date, created_at) VALUES
(1, 1, 'TRK-FDX-882910291', 'FedEx', 'delivered', '2024-01-21 09:00:00+00', '2024-01-23 15:30:00+00', '2024-01-21 09:00:00+00'),
(2, 2, 'TRK-UPS-192847192', 'UPS', 'delivered', '2024-01-26 10:00:00+00', '2024-01-28 11:20:00+00', '2024-01-26 10:00:00+00'),
(3, 3, 'TRK-DHL-918274619', 'DHL', 'delivered', '2024-02-03 08:30:00+00', '2024-02-05 14:10:00+00', '2024-02-03 08:30:00+00'),
(4, 4, 'TRK-USPS-940011189', 'USPS', 'delivered', '2024-02-11 11:00:00+00', '2024-02-14 16:45:00+00', '2024-02-11 11:00:00+00'),
(5, 5, 'TRK-FDX-773920194', 'FedEx', 'delivered', '2024-02-19 14:00:00+00', '2024-02-21 12:00:00+00', '2024-02-19 14:00:00+00'),
(6, 6, 'TRK-UPS-662910482', 'UPS', 'delivered', '2024-03-02 09:30:00+00', '2024-03-04 10:15:00+00', '2024-03-02 09:30:00+00'),
(7, 7, 'TRK-FDX-551029384', 'FedEx', 'delivered', '2024-03-09 13:00:00+00', '2024-03-12 17:00:00+00', '2024-03-09 13:00:00+00'),
(8, 8, 'TRK-DHL-440192837', 'DHL', 'delivered', '2024-03-16 10:15:00+00', '2024-03-19 11:30:00+00', '2024-03-16 10:15:00+00'),
(9, 9, 'TRK-UPS-339201928', 'UPS', 'delivered', '2024-03-23 08:45:00+00', '2024-03-26 15:20:00+00', '2024-03-23 08:45:00+00'),
(10, 10, 'TRK-USPS-940022291', 'USPS', 'delivered', '2024-04-03 11:30:00+00', '2024-04-06 14:00:00+00', '2024-04-03 11:30:00+00'),
(11, 11, 'TRK-FDX-220194827', 'FedEx', 'delivered', '2024-04-11 10:00:00+00', '2024-04-13 16:10:00+00', '2024-04-11 10:00:00+00'),
(12, 12, 'TRK-UPS-110294829', 'UPS', 'delivered', '2024-04-19 14:30:00+00', '2024-04-22 11:45:00+00', '2024-04-19 14:30:00+00'),
(13, 13, 'TRK-DHL-990192834', 'DHL', 'delivered', '2024-05-02 09:00:00+00', '2024-05-04 13:20:00+00', '2024-05-02 09:00:00+00'),
(14, 14, 'TRK-FDX-880293847', 'FedEx', 'delivered', '2024-05-13 15:00:00+00', '2024-05-15 16:30:00+00', '2024-05-13 15:00:00+00'),
(15, 15, 'TRK-USPS-940033302', 'USPS', 'delivered', '2024-05-21 11:00:00+00', '2024-05-24 10:50:00+00', '2024-05-21 11:00:00+00'),
(16, 16, 'TRK-UPS-770192834', 'UPS', 'delivered', '2024-06-06 10:30:00+00', '2024-06-09 14:15:00+00', '2024-06-06 10:30:00+00'),
(17, 17, 'TRK-FDX-660192834', 'FedEx', 'delivered', '2024-06-16 13:00:00+00', '2024-06-18 12:40:00+00', '2024-06-16 13:00:00+00'),
(18, 18, 'TRK-DHL-550192834', 'DHL', 'delivered', '2024-06-26 09:15:00+00', '2024-06-29 11:00:00+00', '2024-06-26 09:15:00+00'),
(19, 19, 'TRK-UPS-440192834', 'UPS', 'delivered', '2024-07-03 14:20:00+00', '2024-07-06 15:30:00+00', '2024-07-03 14:20:00+00'),
(20, 20, 'TRK-USPS-940044413', 'USPS', 'delivered', '2024-07-11 10:00:00+00', '2024-07-13 16:00:00+00', '2024-07-11 10:00:00+00'),
(21, 21, 'TRK-FDX-330192834', 'FedEx', 'delivered', '2024-07-21 11:45:00+00', '2024-07-24 13:10:00+00', '2024-07-21 11:45:00+00'),
(22, 22, 'TRK-UPS-220192834', 'UPS', 'delivered', '2024-08-02 09:30:00+00', '2024-08-05 10:25:00+00', '2024-08-02 09:30:00+00'),
(23, 23, 'TRK-DHL-110192834', 'DHL', 'delivered', '2024-08-11 14:00:00+00', '2024-08-14 12:00:00+00', '2024-08-11 14:00:00+00'),
(24, 24, 'TRK-FDX-990293841', 'FedEx', 'in_transit', '2024-08-19 10:00:00+00', NULL, '2024-08-19 10:00:00+00'),
(25, 25, 'TRK-UPS-880394852', 'UPS', 'in_transit', '2024-08-26 11:30:00+00', NULL, '2024-08-26 11:30:00+00'),
(26, 26, 'TRK-DHL-770495863', 'DHL', 'in_transit', '2024-09-03 15:00:00+00', NULL, '2024-09-03 15:00:00+00');

SELECT setval('shipments_id_seq', (SELECT MAX(id) FROM shipments));

-- 8. Seed Reviews
INSERT INTO reviews (id, product_id, customer_id, rating, comment, review_date) VALUES
(1, 1, 1, 5, 'Exceptional noise cancellation and rich sound quality. Battery easily lasts all week.', '2024-01-25 18:00:00+00'),
(2, 2, 1, 5, 'Crisp colors and the 144Hz curved screen makes programming and editing effortless.', '2024-01-26 09:30:00+00'),
(3, 4, 2, 4, 'Very helpful macro keypad for streaming and switching IDE workspaces.', '2024-01-30 14:15:00+00'),
(4, 7, 3, 5, 'Completely waterproof in heavy rain, fits comfortably over work attire.', '2024-02-08 12:00:00+00'),
(5, 6, 3, 5, 'Soft merino wool that does not itch. Superb quality and fit.', '2024-02-09 15:45:00+00'),
(6, 10, 4, 4, 'Consistent coffee grind particle size, minimal static retention.', '2024-02-16 08:30:00+00'),
(7, 1, 5, 5, 'Best headphones I have owned. Seamless Bluetooth multipoint switching.', '2024-02-25 11:20:00+00'),
(8, 14, 1, 5, 'Noticed sustained energy levels throughout the afternoon within two weeks.', '2024-03-05 16:10:00+00'),
(9, 17, 1, 5, 'Required reading for any backend engineer or distributed systems architect.', '2024-03-06 17:00:00+00'),
(10, 2, 6, 4, 'Great monitor; stand takes up a bit of desk depth but panel quality is top tier.', '2024-03-15 10:45:00+00'),
(11, 5, 6, 5, 'Ergonomic shape completely cured my wrist fatigue during long coding sessions.', '2024-03-16 13:15:00+00'),
(12, 11, 7, 5, 'Heats evenly, cleans easily, looks beautiful on the stovetop.', '2024-03-21 19:30:00+00'),
(13, 20, 8, 5, 'Lightweight enough for tough mountain traverses. Pitches in under 4 minutes.', '2024-03-28 14:00:00+00'),
(14, 9, 9, 4, 'Durable canvas and padded straps. Fits my 16-inch workstation securely.', '2024-04-08 09:20:00+00'),
(15, 15, 10, 5, 'Powerful massage motor with deep stroke length. Great post-workout recovery.', '2024-04-16 18:30:00+00'),
(16, 2, 2, 5, 'Bought a second unit for my dual-display office setup. Flawless USB-C hub support.', '2024-04-24 11:00:00+00'),
(17, 7, 3, 4, 'Quality is top notch; sleeves are slightly long but cuffs cinch tightly.', '2024-05-06 16:50:00+00'),
(18, 1, 11, 5, 'Spatial audio feature on movies is astonishing.', '2024-05-18 12:40:00+00'),
(19, 4, 12, 4, 'Software setup was intuitive. Key customization is very flexible.', '2024-05-25 15:10:00+00'),
(20, 20, 4, 5, 'Survived heavy alpine winds and stayed bone dry.', '2024-06-12 17:00:00+00'),
(21, 21, 4, 5, 'Trekking poles lock firmly and cork grips absorb sweat nicely.', '2024-06-13 09:15:00+00'),
(22, 12, 13, 4, 'Sleek floor lamp, smooth app brightness dimming.', '2024-06-20 20:00:00+00'),
(23, 10, 14, 5, 'Grinds fine enough for true espresso and coarse enough for French press.', '2024-06-30 08:00:00+00'),
(24, 1, 5, 5, 'Second pair for my spouse. Highly recommended.', '2024-07-08 14:30:00+00'),
(25, 13, 15, 4, 'Keeps coffee piping hot throughout the entire workday.', '2024-07-15 11:00:00+00'),
(26, 20, 6, 5, 'Super light pack size and durable rainfly.', '2024-07-26 13:45:00+00'),
(27, 9, 7, 4, 'Comfortable commute pack with smart internal organizer pockets.', '2024-08-16 10:20:00+00'),
(28, 1, 8, 5, 'Superior active noise cancellation on flights.', '2024-08-22 16:00:00+00'),
(29, 3, 5, 2, 'Charging brick gets noticeably warm when powering laptop and phone simultaneously.', '2024-02-28 14:00:00+00'),
(30, 8, 9, 3, 'Cotton fabric is thick and well made, but shrank slightly after warm wash.', '2024-04-12 11:30:00+00');

SELECT setval('reviews_id_seq', (SELECT MAX(id) FROM reviews));
