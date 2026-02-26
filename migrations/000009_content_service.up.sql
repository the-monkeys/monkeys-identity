-- Content service tables (generic, scalable version)
-- Supports blogs, videos, tweets, comments, and any future content type.
-- Ownership and collaboration data lives here, NOT in resource_shares.
-- Permission checks are done locally via indexed PK lookups (O(1) per check).

CREATE TABLE IF NOT EXISTS content_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_type    VARCHAR(50) NOT NULL DEFAULT 'blog',
    title           VARCHAR(500) NOT NULL,
    slug            VARCHAR(500),
    body            TEXT DEFAULT '',
    summary         TEXT DEFAULT '',
    cover_image_url TEXT DEFAULT '',
    parent_id       UUID REFERENCES content_items(id),
    owner_id        UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft', 'published', 'archived')),
    tags            JSONB DEFAULT '[]',
    metadata        JSONB DEFAULT '{}',
    published_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS content_collaborators (
    content_id  UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id),
    role        VARCHAR(20) NOT NULL DEFAULT 'co-author'
                    CHECK (role IN ('owner', 'co-author')),
    invited_by  UUID REFERENCES users(id),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (content_id, user_id)
);

-- Indexes for scalable lookups
CREATE INDEX IF NOT EXISTS idx_content_owner       ON content_items(owner_id);
CREATE INDEX IF NOT EXISTS idx_content_org          ON content_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_content_type         ON content_items(content_type);
CREATE INDEX IF NOT EXISTS idx_content_status       ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_parent       ON content_items(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_deleted      ON content_items(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_content_collabs_user ON content_collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_content_collabs_item ON content_collaborators(content_id);
