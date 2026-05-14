-- Script SQL để đánh dấu một số sản phẩm là sản phẩm mới
-- Chạy file này trong database để test chức năng sản phẩm mới

UPDATE product 
SET product_new = 1 
WHERE status = 1 
ORDER BY created_at DESC 
LIMIT 5;

-- Xem các sản phẩm mới
SELECT id, name, product_new, status, created_at 
FROM product 
WHERE product_new = 1 AND status = 1 
ORDER BY created_at DESC;

-- Chạy file này trong database để test chức năng sản phẩm mới

UPDATE product 
SET product_new = 1 
WHERE status = 1 
ORDER BY created_at DESC 
LIMIT 5;

-- Xem các sản phẩm mới
SELECT id, name, product_new, status, created_at 
FROM product 
WHERE product_new = 1 AND status = 1 
ORDER BY created_at DESC;

