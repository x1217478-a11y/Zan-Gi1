-- ==============================================================================
-- Zan-Gi AI Social Universe — Supabase / PostgreSQL Schema Definition
-- Phase 1 Migration Preparation
-- Target: PostgreSQL 15+ / Supabase Database
-- Compatible with existing Zan-Gi JSON data models (users_db, social_db, sessions_db, audit_logs, media_index)
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. ENUMS & DOMAIN CONSTRAINTS
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'creator', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE language_preference AS ENUM ('bn', 'en');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE privacy_scope AS ENUM ('everyone', 'followers', 'none');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE post_content_type AS ENUM ('text', 'image', 'short_video', 'sponsored_native_ad');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE report_resolution_status AS ENUM ('pending', 'resolved', 'dismissed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE media_asset_type AS ENUM ('image', 'video', 'avatar', 'banner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. USERS TABLE
-- Maps from /data/users_db.json
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY, -- Preserves existing user IDs (e.g. user_owner, user_fahim, user_17916...)
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT NOT NULL DEFAULT '',
    banner_url TEXT,
    bio TEXT NOT NULL DEFAULT '',
    
    -- Cryptographic authentication (PBKDF2 sha512 + salt as used in authService.ts)
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    
    -- Verification & Status
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    email_verification_token TEXT,
    password_reset_token TEXT,
    password_reset_expires BIGINT,
    is_deactivated BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Permissions & Gamification
    role user_role NOT NULL DEFAULT 'user',
    followers_count INTEGER NOT NULL DEFAULT 0 CHECK (followers_count >= 0),
    following_count INTEGER NOT NULL DEFAULT 0 CHECK (following_count >= 0),
    creator_coins INTEGER NOT NULL DEFAULT 0 CHECK (creator_coins >= 0),
    language_preference language_preference NOT NULL DEFAULT 'bn',
    
    -- Privacy Controls
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    who_can_comment privacy_scope NOT NULL DEFAULT 'everyone',
    who_can_message privacy_scope NOT NULL DEFAULT 'everyone',
    
    -- Two-Factor Authentication (RFC 6238 TOTP)
    two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    two_factor_secret TEXT,
    two_factor_recovery_codes TEXT[] DEFAULT '{}',
    
    -- Preferences (JSONB for extensibility, matching exact user preferences)
    notification_preferences JSONB NOT NULL DEFAULT '{
        "likes": true,
        "comments": true,
        "follows": true,
        "messages": true,
        "systemUpdates": true,
        "creatorEarn": true
    }'::jsonb,
    media_preferences JSONB NOT NULL DEFAULT '{
        "dataSaver": false,
        "autoplay": true,
        "mediaQuality": "standard"
    }'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 3. USER RELATIONSHIPS: BLOCKS & FOLLOWS
-- Normalized from blockedUserIds and follows map
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_blocks (
    blocker_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    blocked_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_no_self_block CHECK (blocker_id <> blocked_id)
);

CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id),
    CONSTRAINT chk_no_self_follow CHECK (follower_id <> following_id)
);

-- ==============================================================================
-- 4. ACTIVE SESSIONS TABLE
-- Maps from /data/sessions_db.json
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    token TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    ip TEXT NOT NULL DEFAULT '127.0.0.1',
    user_agent TEXT NOT NULL DEFAULT 'browser'
);

-- ==============================================================================
-- 5. POSTS TABLE
-- Maps from /data/social_db.json ("posts")
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL DEFAULT '',
    post_type post_content_type NOT NULL DEFAULT 'text',
    media_urls TEXT[] NOT NULL DEFAULT '{}',
    thumbnail_url TEXT,
    shares_count INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    is_ai_assisted BOOLEAN NOT NULL DEFAULT FALSE,
    recommendation_reason TEXT,
    is_demo_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 6. POST INTERACTIONS: LIKES & BOOKMARKS
-- Normalized from likedUserIds and bookmarkedUserIds
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.post_likes (
    post_id TEXT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_bookmarks (
    post_id TEXT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

-- ==============================================================================
-- 7. COMMENTS TABLE
-- Maps from embedded comments in /data/social_db.json
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 8. REELS (VERTICAL SHORT VIDEO) TABLE
-- Maps from /data/social_db.json ("reels")
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reels (
    id TEXT PRIMARY KEY,
    author_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    caption TEXT NOT NULL DEFAULT '',
    caption_bn TEXT NOT NULL DEFAULT '',
    video_url TEXT NOT NULL,
    thumbnail_url TEXT,
    audio_title TEXT NOT NULL DEFAULT '🎵 Zan-Gi Creator Sound',
    shares_count INTEGER NOT NULL DEFAULT 0 CHECK (shares_count >= 0),
    hashtags TEXT[] NOT NULL DEFAULT '{}',
    duration_seconds INTEGER NOT NULL DEFAULT 15 CHECK (duration_seconds > 0 AND duration_seconds <= 180),
    is_demo_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reel_likes (
    reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (reel_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.reel_bookmarks (
    reel_id TEXT NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (reel_id, user_id)
);

-- ==============================================================================
-- 9. CONTENT REPORTS TABLE
-- Maps from /data/social_db.json ("reports")
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id TEXT PRIMARY KEY,
    post_id TEXT REFERENCES public.posts(id) ON DELETE SET NULL,
    post_content TEXT NOT NULL,
    post_author_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    reporter_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status report_resolution_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 10. SECURITY AUDIT LOGS TABLE
-- Maps from /data/audit_logs.json
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip TEXT NOT NULL DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 11. MEDIA ASSETS REGISTRY TABLE
-- Maps from /uploads/media_index.json
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_records (
    id TEXT PRIMARY KEY,
    uploader_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
    media_type media_asset_type NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- 12. PERFORMANCE INDEXES
-- Optimized for Zan-Gi's query patterns: feed discovery, user lookup, hashtags
-- ==============================================================================

-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- Session indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at);

-- Post query & feed indexes
CREATE INDEX IF NOT EXISTS idx_posts_author_id ON public.posts(author_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_hashtags_gin ON public.posts USING GIN (hashtags);

-- Comment indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at ASC);

-- Reel indexes
CREATE INDEX IF NOT EXISTS idx_reels_author_id ON public.reels(author_id);
CREATE INDEX IF NOT EXISTS idx_reels_created_at_desc ON public.reels(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reels_hashtags_gin ON public.reels USING GIN (hashtags);

-- Report indexes
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_post_id ON public.reports(post_id);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at_desc ON public.audit_logs(created_at DESC);

-- Media indexes
CREATE INDEX IF NOT EXISTS idx_media_records_uploader_id ON public.media_records(uploader_id);
CREATE INDEX IF NOT EXISTS idx_media_records_media_type ON public.media_records(media_type);

-- Follows and Blocks indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_id ON public.user_blocks(blocked_id);

-- ==============================================================================
-- 13. AUTOMATED UPDATED_AT TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_posts_updated_at ON public.posts;
CREATE TRIGGER set_posts_updated_at
    BEFORE UPDATE ON public.posts
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_reels_updated_at ON public.reels;
CREATE TRIGGER set_reels_updated_at
    BEFORE UPDATE ON public.reels
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_comments_updated_at ON public.comments;
CREATE TRIGGER set_comments_updated_at
    BEFORE UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

DROP TRIGGER IF EXISTS set_reports_updated_at ON public.reports;
CREATE TRIGGER set_reports_updated_at
    BEFORE UPDATE ON public.reports
    FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ==============================================================================
-- 14. ROW LEVEL SECURITY (RLS) POLICIES
-- Scoped with strict role isolation between service_role, authenticated, and anon
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reel_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_records ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Service Role / Backend Gateway (Full Administrative Access)
-- ------------------------------------------------------------------------------
CREATE POLICY "Service role full access to users" ON public.users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to user_blocks" ON public.user_blocks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to user_follows" ON public.user_follows FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to sessions" ON public.sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to posts" ON public.posts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to post_likes" ON public.post_likes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to post_bookmarks" ON public.post_bookmarks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to comments" ON public.comments FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to reels" ON public.reels FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to reel_likes" ON public.reel_likes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to reel_bookmarks" ON public.reel_bookmarks FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to reports" ON public.reports FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to audit_logs" ON public.audit_logs FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "Service role full access to media_records" ON public.media_records FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ------------------------------------------------------------------------------
-- B. Public / Authenticated Read Policies
-- ------------------------------------------------------------------------------
-- CRITICAL SECURITY ENFORCEMENT:
-- Direct access on public.users is REVOKED for untrusted client roles (anon, authenticated).
-- All authentication, account creation, password changes, and profile updates must route
-- EXCLUSIVELY through the Express backend gateway (which uses service_role / DATABASE_URL).
REVOKE ALL ON public.users FROM anon, authenticated;
REVOKE ALL ON public.sessions FROM anon, authenticated;
REVOKE ALL ON public.audit_logs FROM anon, authenticated;
REVOKE ALL ON public.reports FROM anon, authenticated;

GRANT ALL ON public.users TO service_role;
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.audit_logs TO service_role;
GRANT ALL ON public.reports TO service_role;

-- Allow authenticated users ONLY to insert content moderation abuse reports (read is forbidden)
GRANT INSERT ON public.reports TO authenticated;

-- Column-Level Security (CLS): If public.users is queried directly for public discovery,
-- only safe non-sensitive columns are permitted. Sensitive credentials (password_hash,
-- password_salt, two_factor_secret, recovery codes, reset tokens) are strictly ungranted.
GRANT SELECT (
    id,
    username,
    display_name,
    avatar_url,
    banner_url,
    bio,
    is_verified,
    role,
    followers_count,
    following_count,
    creator_coins,
    language_preference,
    created_at
) ON public.users TO authenticated, anon;

-- Secure Public Profiles View (Primary public interface for client profile discovery)
-- Uses security_invoker = true so caller privileges and row-level checks apply.
-- Excludes deactivated and banned accounts from public discovery.
CREATE OR REPLACE VIEW public.user_profiles
WITH (security_invoker = true) AS
SELECT
    id,
    username,
    display_name,
    avatar_url,
    banner_url,
    bio,
    is_verified,
    role,
    followers_count,
    following_count,
    creator_coins,
    language_preference,
    created_at
FROM public.users
WHERE is_deactivated = FALSE AND is_banned = FALSE;

ALTER VIEW public.user_profiles SET search_path = public;
GRANT SELECT ON public.user_profiles TO anon, authenticated, service_role;

-- Public posts viewable
CREATE POLICY "Public posts viewable by active users" ON public.posts
    FOR SELECT TO authenticated, anon
    USING (TRUE);

-- Public reels viewable
CREATE POLICY "Public reels viewable by all users" ON public.reels
    FOR SELECT TO authenticated, anon
    USING (TRUE);

-- Comments viewable
CREATE POLICY "Comments viewable by all users" ON public.comments
    FOR SELECT TO authenticated, anon
    USING (TRUE);

-- Likes and bookmarks viewable
CREATE POLICY "Post likes viewable by all users" ON public.post_likes
    FOR SELECT TO authenticated, anon
    USING (TRUE);

CREATE POLICY "Reel likes viewable by all users" ON public.reel_likes
    FOR SELECT TO authenticated, anon
    USING (TRUE);

-- User follows viewable
CREATE POLICY "Follows graph viewable by all users" ON public.user_follows
    FOR SELECT TO authenticated, anon
    USING (TRUE);

-- ------------------------------------------------------------------------------
-- C. Authenticated Self-Service Write Policies (Direct Supabase client access)
-- ------------------------------------------------------------------------------
-- CRITICAL SECURITY ENFORCEMENT:
-- Direct UPDATE on public.users is INTENTIONALLY REVOKED from client roles (anon, authenticated).
-- This strictly prevents untrusted clients from modifying protected attributes:
--   - role (privilege escalation to owner or admin)
--   - creator_coins (arbitrary currency manipulation)
--   - is_verified / is_email_verified (unauthorized badge or verification forging)
--   - password_hash / password_salt / two_factor_secret (credential takeover)
-- All profile updates MUST execute via the Express backend gateway (PUT /api/auth/profile),
-- which enforces server-side authentication, session validation, and a strict field allowlist:
-- (displayName, bio, avatarUrl, bannerUrl, username, languagePreference).


-- Authors manage their own posts
CREATE POLICY "Users can insert own posts" ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can update own posts" ON public.posts
    FOR UPDATE TO authenticated
    USING (auth.uid()::text = author_id)
    WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can delete own posts" ON public.posts
    FOR DELETE TO authenticated
    USING (auth.uid()::text = author_id);

-- Authors manage their own comments
CREATE POLICY "Users can insert own comments" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can delete own comments" ON public.comments
    FOR DELETE TO authenticated
    USING (auth.uid()::text = author_id);

-- Authors manage their own reels
CREATE POLICY "Users can insert own reels" ON public.reels
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = author_id);

CREATE POLICY "Users can delete own reels" ON public.reels
    FOR DELETE TO authenticated
    USING (auth.uid()::text = author_id);

-- Users manage their own likes & bookmarks
CREATE POLICY "Users manage own post likes" ON public.post_likes
    FOR ALL TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own post bookmarks" ON public.post_bookmarks
    FOR ALL TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own reel likes" ON public.reel_likes
    FOR ALL TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users manage own reel bookmarks" ON public.reel_bookmarks
    FOR ALL TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

-- Users manage their own follows and blocks
CREATE POLICY "Users manage own follows" ON public.user_follows
    FOR ALL TO authenticated
    USING (auth.uid()::text = follower_id)
    WITH CHECK (auth.uid()::text = follower_id);

CREATE POLICY "Users manage own blocks" ON public.user_blocks
    FOR ALL TO authenticated
    USING (auth.uid()::text = blocker_id)
    WITH CHECK (auth.uid()::text = blocker_id);

-- Users can file content moderation reports
CREATE POLICY "Users can submit reports" ON public.reports
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid()::text = reporter_id);

-- ==============================================================================
-- 15. MEDIA STORAGE ARCHITECTURE (Cloudflare R2 Primary Target)
-- ==============================================================================
-- Intended Target: Cloudflare R2 Object Storage (Private Bucket, S3-Compatible API)
--   • Single object upload limit: 5 GB (comfortably accommodates Zan-Gi 65 MB video uploads)
--   • Egress bandwidth fees: $0 / GB
--   • Bucket access policy: Strictly PRIVATE. Delivery handled via presigned URLs or Cloudflare CDN proxy.
--
-- Supabase Storage is maintained as an unconfirmed, deferred fallback only:
--   • Note: Supabase Free tier enforces a hard 50 MB file upload limit (incompatible with 65 MB videos)
--   • Any Supabase bucket must remain strictly PRIVATE (public = false) until architecture signoff.



