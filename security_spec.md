# WORLDPULSE — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants & Relational Truth

1. **Default-Deny Catch-All**: All paths not explicitly matched (`match /{document=**}`) deny all reads and writes (`allow read, write: if false;`).
2. **Zero-Trust Admin Verification**: Administrative privileges (`isAdmin()`) are granted ONLY if `isSignedIn() && request.auth.token.email_verified == true` AND either:
   - `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`, OR
   - `request.auth.token.email == 'mehgillani5373@gmail.com'` (bootstrapped owner with verified email).
3. **PII Isolation (Split Collection Strategy)**:
   - `/users/{userId}` contains ONLY non-PII fields (`uid`, `displayName`, `interests`, `savedArticleIds`, `newsletterSubscribed`, `createdAt`, `updatedAt`). It never stores `email` or `role`.
   - `/users/{userId}/private/{docId}` isolates PII (`email`) and requires `get(/databases/$(database)/documents/users/$(userId)).data.uid == request.auth.uid` (Master Gate relational sync) and `isOwner(userId) || isAdmin()`.
4. **Article Visibility & Query Enforcement**:
   - Public `get` and `list` on `/articles/{articleId}` strictly enforce `resource.data.status == 'published' || isAdmin()`. Draft and scheduled articles are impossible to read or list by non-admins.
   - Only `isAdmin()` can create, update, or delete articles, except that a verified signed-in reader may atomically increment `views` by `+1` while keeping all other fields unchanged.
5. **Comment Relational Integrity & Anti-Spoofing**:
   - A comment in `/comments/{commentId}` can only be created if `exists(/databases/$(database)/documents/articles/$(incoming().articleId))` is true, `incoming().authorId == request.auth.uid`, and `incoming().createdAt == request.time`.

---

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Shadow Field Injection on User Profile)**: Authenticated user attempts to create `/users/{uid}` with an unauthorized `isAdmin: true` or `role: "admin"` field. -> `PERMISSION_DENIED` (`hasOnly` key guard).
2. **Payload 2 (Identity Spoofing on User Profile)**: User `user_A` attempts to create `/users/user_A` with `uid: "user_B"`. -> `PERMISSION_DENIED` (`data.uid == request.auth.uid`).
3. **Payload 3 (Unverified Admin Email Spoof)**: Attacker with `email: "mehgillani5373@gmail.com"` but `email_verified: false` attempts to create an article in `/articles/art-1`. -> `PERMISSION_DENIED` (`request.auth.token.email_verified == true` check).
4. **Payload 4 (PII Cross-User Read)**: Authenticated `user_B` attempts `get` on `/users/user_A/private/info`. -> `PERMISSION_DENIED` (`isOwner(userId)` check).
5. **Payload 5 (Orphaned Private Info Without Parent User)**: User `user_A` attempts to create `/users/user_A/private/info` when parent `/users/user_A` does not exist. -> `PERMISSION_DENIED` (Master Gate `exists(/databases/$(database)/documents/users/$(userId))`).
6. **Payload 6 (Draft Article Scraping via List Query)**: Unauthenticated or standard user runs an unfiltered `list` query on `/articles` attempting to read draft articles. -> `PERMISSION_DENIED` (`resource.data.status == 'published'` query enforcer).
7. **Payload 7 (Unauthorized Article Publication by Reader)**: Standard user attempts to update `/articles/art-1` to change `title` or `status`. -> `PERMISSION_DENIED` (Restricted to `isAdmin()`).
8. **Payload 8 (Immutable `createdAt` Tampering on Update)**: User `user_A` updates `/users/user_A` and modifies `createdAt`. -> `PERMISSION_DENIED` (`incoming().createdAt == existing().createdAt`).
9. **Payload 9 (Client Timestamp Forgery on Create)**: User `user_A` creates a comment with a forged past/future `createdAt` instead of `request.time`. -> `PERMISSION_DENIED` (`incoming().createdAt == request.time`).
10. **Payload 10 (Orphaned Comment Creation)**: User `user_A` creates a comment referencing a non-existent `articleId: "ghost-article"`. -> `PERMISSION_DENIED` (`exists(/databases/$(database)/documents/articles/$(incoming().articleId))`).
11. **Payload 11 (Resource Exhaustion / 1MB String Poisoning)**: User `user_A` attempts to update `displayName` with a 5,000-character string or `savedArticleIds` with 500 items. -> `PERMISSION_DENIED` (`displayName.size() <= 80` and `savedArticleIds.size() <= 50`).
12. **Payload 12 (ID Poisoning Attack)**: User attempts to create `/comments/invalid$id!@#` with illegal characters. -> `PERMISSION_DENIED` (`isValidId(commentId)` regex guard).
