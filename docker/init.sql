-- 1. Créer la base et le schéma
-- CREATE SCHEMA IF NOT EXISTS collector_db;
-- SET search_path TO collector_db, public;

-- Utilisateurs (acheteur ET vendeur ET admin)
CREATE TABLE IF NOT EXISTS  users (
    id SERIAL PRIMARY KEY,
    auth0_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    display_name VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Rôles (un user peut avoir plusieurs rôles)
CREATE TABLE IF NOT EXISTS  user_roles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('BUYER', 'SELLER', 'ADMIN')) NOT NULL,
    granted_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- Préférences utilisateur (centres d'intérêt, notifs)
CREATE TABLE IF NOT EXISTS  user_preferences (
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    interests JSONB DEFAULT '{}',           -- ["sneakers", "starwars"]
    notif_new_item BOOLEAN DEFAULT TRUE,
    notif_price_change BOOLEAN DEFAULT TRUE,
    notif_email BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Boutiques virtuelles des vendeurs
CREATE TABLE IF NOT EXISTS  shops (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    rating DECIMAL(3,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(owner_id, name)
);

-- Catégories (gérées par admin)
CREATE TABLE IF NOT EXISTS  categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    parent_id INT REFERENCES categories(id),
    is_active BOOLEAN DEFAULT TRUE
);

-- Articles / Annonces
CREATE TABLE IF NOT EXISTS  items (
    id SERIAL PRIMARY KEY,
    shop_id INT REFERENCES shops(id) ON DELETE CASCADE,
    category_id INT REFERENCES categories(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    shipping_cost DECIMAL(10,2) DEFAULT 0,
    stock_quantity INT DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SOLD')) DEFAULT 'DRAFT',
    attributes JSONB DEFAULT '{}',          -- { "edition": "limited", "size": "42", "condition": "mint" }
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Photos des articles
CREATE TABLE IF NOT EXISTS  item_images (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id) ON DELETE CASCADE,
    url VARCHAR(500) NOT NULL,
    position INT DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE
);

-- Commandes
CREATE TABLE IF NOT EXISTS  orders (
    id SERIAL PRIMARY KEY,
    buyer_id INT REFERENCES users(id),
    shop_id INT REFERENCES shops(id),
    total_amount DECIMAL(10,2) NOT NULL,
    commission_amount DECIMAL(10,2) DEFAULT 0,  -- 5% Collector
    status VARCHAR(20) CHECK (status IN ('PENDING_PAYMENT', 'PAID', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED')) DEFAULT 'PENDING_PAYMENT',
    payment_method VARCHAR(50) DEFAULT 'CARD',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Lignes de commande
CREATE TABLE IF NOT EXISTS  order_items (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id) ON DELETE CASCADE,
    item_id INT REFERENCES items(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL
);

-- Historique des changements de prix (pour notifs + fraude)
CREATE TABLE IF NOT EXISTS  price_history (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id) ON DELETE CASCADE,
    old_price DECIMAL(10,2),
    new_price DECIMAL(10,2) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW()
);

-- Notifications utilisateurs
CREATE TABLE IF NOT EXISTS  notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,              -- NEW_ITEM, PRICE_CHANGE, ORDER_STATUS, etc.
    title VARCHAR(255),
    payload JSONB NOT NULL,                 -- { "item_id": 123, "new_price": 150 }
    is_read BOOLEAN DEFAULT FALSE,
    channel VARCHAR(20) DEFAULT 'IN_APP',   -- IN_APP, EMAIL
    created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations
CREATE TABLE IF NOT EXISTS  conversations (
    id SERIAL PRIMARY KEY,
    buyer_id INT REFERENCES users(id),
    seller_id INT REFERENCES users(id),
    item_id INT REFERENCES items(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS  messages (
    id SERIAL PRIMARY KEY,
    conversation_id INT REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INT REFERENCES users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Alertes fraude
CREATE TABLE IF NOT EXISTS  fraud_alerts (
    id SERIAL PRIMARY KEY,
    item_id INT REFERENCES items(id),
    seller_id INT REFERENCES users(id),
    reason VARCHAR(255),                    -- "Prix anormal", "Vendeur suspect"
    risk_score DECIMAL(3,2),                -- 0.0 à 1.0
    status VARCHAR(20) DEFAULT 'PENDING',
    reviewed_by INT REFERENCES users(id),   -- Admin qui traite
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Notes / évaluations
CREATE TABLE IF NOT EXISTS  reviews (
    id SERIAL PRIMARY KEY,
    order_id INT REFERENCES orders(id),
    reviewer_id INT REFERENCES users(id),
    reviewed_id INT REFERENCES users(id),   -- Vendeur noté
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Logs d'audit (bonus sécurité)
CREATE TABLE IF NOT EXISTS  audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id),
    action VARCHAR(100),
    resource_type VARCHAR(50),
    resource_id INT,
    details JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_moderation (
  id SERIAL PRIMARY KEY,
  item_id INT UNIQUE REFERENCES items(id) ON DELETE CASCADE,

  -- résultats auto-check
  title_status VARCHAR(10) CHECK (title_status IN ('GREEN','ORANGE','RED')) DEFAULT 'ORANGE',
  description_status VARCHAR(10) CHECK (description_status IN ('GREEN','ORANGE','RED')) DEFAULT 'ORANGE',
  images_status VARCHAR(10) CHECK (images_status IN ('GREEN','ORANGE','RED')) DEFAULT 'ORANGE',
  auto_score DECIMAL(4,2) DEFAULT 0,         -- 0..1
  auto_details JSONB DEFAULT '{}'::jsonb,     -- réponse brute externe

  -- validation humaine
  human_status VARCHAR(20) CHECK (human_status IN ('PENDING','APPROVED','REJECTED')) DEFAULT 'PENDING',
  reviewed_by INT REFERENCES users(id),
  reviewed_at TIMESTAMP,
  reviewer_note TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
