# Zan-Gi Database Migration Checklist & Disaster Recovery Runbook
**Phase 1: Preparation & Non-Destructive Groundwork**  
*Document Version: 1.0.0 | Date: 2026-10-10 | Status: Phase 1 Completed*

---

## 1. Project Overview & Migration Strategy

Zan-Gi currently operates on an atomic JSON file storage engine located in `/data`, accompanied by a local disk media repository in `/uploads`. To scale into high-concurrency feeds, real-time messaging, and multi-region replication, the platform is preparing for migration to a managed PostgreSQL / Supabase architecture.

### Scope & Constraints of Phase 1
- **Zero Production Disruption**: The active JSON file backend continues operating without alteration.
- **No External Connectivity**: No live credentials, service-role keys, or remote database connections are established in Phase 1.
- **Non-Destructive Backups**: All backup operations are strictly append-only snapshots preserving the live data untouched.
- **Dual-Model Parity**: All PostgreSQL tables in `supabase/schema.sql` are strictly modeled from the existing domain structures.

---

## 2. Identified Data Stores & Media Inventory

| Component | Path / Location | Purpose | Format / Schema |
|---|---|---|---|
| **Users Database** | `/data/users_db.json` | User accounts, profiles, PBKDF2 hashes & salts, TOTP 2FA keys, preferences | JSON Array (`DbUser[]`) |
| **Sessions Database** | `/data/sessions_db.json` | Active bearer authentication sessions, expiry timestamps, client IP & agent | JSON Array (`DbSession[]`) |
| **Social Content Database** | `/data/social_db.json` | Posts, comments, likes, bookmarks, reels, follows graph, moderation reports | JSON Object (`{ posts, reels, follows, reports }`) |
| **Security Audit Logs** | `/data/audit_logs.json` | Cryptographic & security logs, login attempts, 2FA events, account blocks | JSON Array (`AuditLog[]`) |
| **Media Registry Index** | `/uploads/media_index.json` | Metadata index for uploaded files, mime types, sizes, owner IDs, file URLs | JSON Array (`MediaRecord[]`) |
| **Post/Feed Images** | `/uploads/images/` | Uploaded user photos and images (JPEG, PNG, WebP, GIF) | Local Filesystem |
| **Reels & Video Clips** | `/uploads/videos/` | Uploaded vertical reels and short videos (MP4, WebM, MOV) | Local Filesystem |
| **Profile Banners** | `/uploads/banners/` | Custom creator profile banner assets | Local Filesystem |
| **User Avatars** | `/uploads/avatars/` | Custom user profile avatar images | Local Filesystem |
| **Static Bundled Media** | `/src/assets/images/` | Seed visual assets (creator tech avatar, cybercity feed, nature visuals) | Bundled Assets |

### Storage-Related Code Modules
- `src/server/database.ts`: Atomic disk writer (`atomicWriteJson`) with temporary file creation and atomic rename; safe JSON loader (`safeReadJson`).
- `src/server/authService.ts`: PBKDF2 hashing (100k rounds SHA-512), RFC 6238 TOTP engine, session tokens, GDPR export, cascade deletion.
- `src/server/socialStore.ts`: Posts and reels CRUD, likes/bookmarks maps, comments thread, follower relationships, post reporting.
- `src/server/mediaStore.ts`: Multer disk storage handler, mime verification, file limits, media indexing and deletion.

---

## 3. Timestamped Backup & Disaster Recovery Runbook

### A. Creating a Timestamped Backup Snapshot
Run the automated backup script at any time:
```bash
npm run backup
# Or directly via tsx:
npx tsx scripts/backup.ts
```

**What this command executes:**
1. Generates a unique timestamped folder under `backups/backup_YYYY-MM-DDTHH-mm-ss-sssZ/`.
2. Copies all JSON files from `/data/` into `backups/<id>/data/`.
3. Copies all media files and folder hierarchies from `/uploads/` into `backups/<id>/uploads/`.
4. Calculates SHA-256 cryptographic hashes for every copied file.
5. Computes record counts (users, posts, reels, comments, sessions, audit logs, media).
6. Writes `manifest.json` inside the backup directory containing all metadata and verification hashes.
7. Leaves the live production databases completely untouched.

### B. Validating Backup Integrity (Dry-Run Verification)
Before restoring, verify that the backup files are untampered and match their recorded checksums:
```bash
npm run restore -- --dry-run
# Or check a specific backup:
npx tsx scripts/restore.ts backup_2026-10-10T16-26-00-000Z --dry-run
```
Expected output:
```
✓ Checksum integrity verified for all N files.
[Restore] Dry-run completed successfully. All N files verified with valid SHA-256 checksums.
```

### C. Live Restoration Procedure (Automated)
To restore all databases and media files from the most recent backup:
```bash
# 1. Stop the application server (if running in production)
# 2. Run the restore command:
npm run restore

# Or target a specific backup snapshot:
npx tsx scripts/restore.ts backup_2026-10-10T16-26-00-000Z
```

### D. Manual Disaster Recovery (Without Scripts)
If Node.js or `tsx` is unavailable, manual restoration can be performed via standard shell commands:
```bash
# 1. Locate the desired backup
LATEST_BACKUP=$(ls -d backups/backup_* | tail -n 1)

# 2. Restore JSON database files
cp -f "$LATEST_BACKUP"/data/*.json ./data/

# 3. Restore uploaded media
cp -rf "$LATEST_BACKUP"/uploads/* ./uploads/

# 4. Restart server
npm run dev
```

---

## 4. Supabase Schema Mapping & Architecture

The generated file `supabase/schema.sql` establishes a production-grade relational representation of the Zan-Gi platform:

```
[ users ] ───1:N───< [ user_blocks ]
   │
   ├──1:N───< [ user_follows ]
   │
   ├──1:N───< [ sessions ]
   │
   ├──1:N───< [ posts ] ───1:N───< [ comments ]
   │             │
   │             ├──1:N───< [ post_likes ]
   │             └──1:N───< [ post_bookmarks ]
   │
   ├──1:N───< [ reels ]
   │             ├──1:N───< [ reel_likes ]
   │             └──1:N───< [ reel_bookmarks ]
   │
   ├──1:N───< [ reports ]
   ├──1:N───< [ audit_logs ]
   └──1:N───< [ media_records ]
```

### Key Relational Decisions
1. **Normalized Interaction Tables**: `likedUserIds` and `bookmarkedUserIds` arrays from JSON are converted to relational join tables (`post_likes`, `post_bookmarks`, `reel_likes`, `reel_bookmarks`) with compound primary keys `(post_id, user_id)`. This prevents unbounded row growth and race conditions during high concurrent likes.
2. **Dedicated Relationships**: `follows` and `blockedUserIds` are converted to `user_follows` and `user_blocks` tables with self-reference checks (`chk_no_self_follow`, `chk_no_self_block`).
3. **Structured Enums**: `user_role`, `language_preference`, `privacy_scope`, `post_content_type`, `report_resolution_status`, and `media_asset_type` enforce domain integrity at the database engine level.
4. **JSONB Preference Blocks**: User `notification_preferences` and `media_preferences` retain JSONB representations with default values, ensuring backward-compatibility with client payloads.

---

## 5. Schema Uncertainties & Compatibility Risks

Before proceeding to Phase 2 (Live Data Migration), the following engineering decisions must be reviewed:

| Uncertainty / Risk | Impact | Recommended Mitigation |
|---|---|---|
| **1. Primary Key Format** | Existing IDs use strings (`user_owner`, `user_fahim`, `post_17916...`, `reel_...`) rather than UUIDs. | `schema.sql` uses `TEXT PRIMARY KEY` to preserve 100% backward compatibility with client routes and foreign keys. New rows can either use nanoid or UUID formatted as text. |
| **2. Password Hashing Compatibility** | Zan-Gi uses Node.js `crypto.pbkdf2Sync` (100k iterations, SHA-512) with random 16-byte hex salts. Default Supabase Auth (GoTrue) expects bcrypt. | **Option A (Recommended)**: Retain custom PBKDF2 verification in the Express backend gateway using `public.users` table.<br>**Option B**: Write a GoTrue migration script or migrate users to standard bcrypt upon next successful login. |
| **3. Two-Factor Authentication Storage** | RFC 6238 TOTP secrets and recovery codes are currently stored encrypted/raw on the user record. Supabase Auth MFA uses internal schema `auth.mfa_factors`. | Store `two_factor_secret` and `two_factor_recovery_codes` in `public.users` during Phase 2. The Express server continues to validate TOTP codes identically. |
| **4. Timestamp Inconsistencies** | In JSON, some models store ISO-8601 strings (`2026-10-10T08:54:00.457Z`), some store millisecond epochs (`1791649215041` in sessions), and feed items hold human strings (`"১০ মিনিট আগে"`). | Migration script will parse all date formats into standard `TIMESTAMPTZ` for PostgreSQL, while generating relative display strings client-side or on API read. |
| **5. Media File Storage Cutover** | Currently files are saved to local filesystem `/uploads/*`. Supabase uses S3-compatible Object Storage buckets. | In Phase 2/3, media files from `/uploads/` will be uploaded to Supabase Storage bucket `zangi-media`, and `file_url` records in `media_records` updated to public CDN URLs. |
| **6. Array vs. Relational Dual Write** | Feed APIs currently return `likedUserIds` as an array of user IDs on the post object for quick client-side `.includes(currentUserId)`. | The SQL queries in the repository layer should use `array_agg(post_likes.user_id)` or subqueries to output the identical JSON response structure expected by the React client. |

---

## 6. Migration Progression Checklist

### Phase 1: Preparation (COMPLETED)
- [x] Inspect existing JSON databases, media directories, and storage modules.
- [x] Implement non-destructive timestamped backup script (`scripts/backup.ts`).
- [x] Implement backup verification & restore script (`scripts/restore.ts`).
- [x] Generate initial PostgreSQL/Supabase schema (`supabase/schema.sql`).
- [x] Configure `.env.example` with clear placeholders (no credentials committed).
- [x] Secure `.gitignore` against accidental credential or backup leaks.
- [x] Test backup and restore verification scripts.
- [x] Document migration checklist and compatibility risks.

### Phase 2: Preparation, Audit & Dry-Run (CURRENT COMPLETED STEP)
- [x] Enforce `STORAGE_BACKEND=json` safety constraint (production traffic remains on JSON).
- [x] Complete security audit of `supabase/schema.sql` (hardened RLS policies, explicit `service_role` scoping).
- [x] Verify foreign-key ordering and `TEXT PRIMARY KEY` compatibility for existing IDs.
- [x] Implement dry-run migration script (`scripts/migration-dry-run.ts` / `npm run migration:dry-run`).
- [x] Perform read-only integrity audit across all JSON files (0 FK errors, 100% schema constraint compliance).
- [x] Quarantine sensitive credentials (passwords, salts, 2FA recovery codes, session tokens excluded from transmission).
- [x] Verify environment variables without logging secrets.
- [ ] Connect live staging Supabase instance and apply `supabase/schema.sql` (Pending user-provided staging credentials).
- [ ] Execute staging data ingestion (Deferred until Phase 3).

### Phase 3: Staging Ingestion & Dual-Mode Repository Layer
- [ ] Implement database abstraction interface (`IUserRepository`, `ISocialRepository`, `IMediaRepository`).
- [ ] Implement PostgreSQL driver implementation (`pg` or `@supabase/supabase-js`).
- [ ] Support `STORAGE_BACKEND=json` vs `STORAGE_BACKEND=supabase` environment toggle.
- [ ] Run automated test suite against PostgreSQL backend in staging mode.

### Phase 4: Media Migration & Production Cutover
- [ ] Sync media assets from `/uploads/` to Supabase Storage bucket (`zangi-media`) or Cloudflare R2.
- [ ] Final delta backup from JSON store.
- [ ] Run delta ingestion script to sync any content created during Phase 3.
- [ ] Switch `STORAGE_BACKEND=supabase` in production `.env`.
- [ ] Verify live application reads and writes against PostgreSQL.
- [ ] Archive timestamped JSON backups to cold storage.
