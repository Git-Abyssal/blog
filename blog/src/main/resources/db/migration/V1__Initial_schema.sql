CREATE TABLE blog_owner (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password VARCHAR(255) NOT NULL,
    password_changed BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_blog_owner_singleton CHECK (id = 1)
);

CREATE TABLE categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    sort_order BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_categories_name UNIQUE (name)
);

CREATE TABLE tags (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    sort_order BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_tags_name UNIQUE (name)
);

CREATE TABLE articles (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    content LONGTEXT NOT NULL,
    summary VARCHAR(500),
    cover_image VARCHAR(500),
    category_id BIGINT,
    views INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'published',
    created_at DATETIME,
    updated_at DATETIME,
    CONSTRAINT fk_articles_category
        FOREIGN KEY (category_id) REFERENCES categories(id),
    CONSTRAINT chk_articles_status
        CHECK (status IN ('draft', 'published'))
);

CREATE TABLE article_tags (
    article_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    PRIMARY KEY (article_id, tag_id),
    CONSTRAINT fk_article_tags_article
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_article_tags_tag
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE comments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    owner_comment BOOLEAN NOT NULL DEFAULT FALSE,
    guest_name VARCHAR(50),
    article_id BIGINT NOT NULL,
    parent_id BIGINT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_at DATETIME,
    created_at DATETIME,
    CONSTRAINT fk_comments_article
        FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    CONSTRAINT fk_comments_parent
        FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    CONSTRAINT chk_comments_status
        CHECK (status IN ('pending', 'approved')),
    CONSTRAINT chk_comments_identity
        CHECK (
            (owner_comment AND guest_name IS NULL)
            OR (NOT owner_comment AND guest_name IS NOT NULL)
        )
);

CREATE TABLE password_history (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    password_hash VARCHAR(100) NOT NULL,
    changed_at DATETIME NOT NULL
);

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME NOT NULL,
    action VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    username VARCHAR(100),
    ip_address VARCHAR(50),
    user_agent VARCHAR(500),
    http_method VARCHAR(10),
    request_path VARCHAR(500),
    parameters TEXT,
    result VARCHAR(1000),
    status VARCHAR(20) NOT NULL,
    error_message VARCHAR(1000),
    class_name VARCHAR(100),
    method_name VARCHAR(100),
    duration_ms BIGINT
);

CREATE INDEX idx_articles_status_created
    ON articles(status, created_at DESC);
CREATE INDEX idx_articles_category_status_created
    ON articles(category_id, status, created_at DESC);
CREATE INDEX idx_articles_views
    ON articles(views);

CREATE INDEX idx_categories_sort_order
    ON categories(sort_order);
CREATE INDEX idx_tags_sort_order
    ON tags(sort_order);

CREATE INDEX idx_comments_article_status_created
    ON comments(article_id, status, created_at DESC);
CREATE INDEX idx_comments_status_created
    ON comments(status, created_at DESC);
CREATE INDEX idx_comments_parent
    ON comments(parent_id);

CREATE INDEX idx_password_history_changed
    ON password_history(changed_at DESC);

CREATE INDEX idx_audit_logs_timestamp
    ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_action
    ON audit_logs(action);
CREATE INDEX idx_audit_logs_username
    ON audit_logs(username);
CREATE INDEX idx_audit_logs_status
    ON audit_logs(status);
