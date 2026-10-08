/**
 * Phase 0 Security TDD Test Suite for WORLDPULSE Firestore Rules
 * Verifies that all "Dirty Dozen" adversarial payloads return PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collectionPath: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_SECURITY_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Shadow Field Injection on User Profile',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: {
      uid: 'user_1',
      displayName: 'Reader',
      interests: ['world'],
      savedArticleIds: ['art-1'],
      newsletterSubscribed: true,
      role: 'admin', // Ghost field rejected by hasOnly
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Identity Spoofing on User Profile',
    collectionPath: '/users/user_1',
    operation: 'create',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: {
      uid: 'user_2', // Mismatched UID
      displayName: 'Spoofer',
      interests: ['world'],
      savedArticleIds: [],
      newsletterSubscribed: false,
    },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Unverified Admin Email Spoof',
    collectionPath: '/articles/art_99',
    operation: 'create',
    auth: { uid: 'attacker_1', email: 'mehgillani5373@gmail.com', email_verified: false },
    payload: { id: 'art_99', title: 'Fake News' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'PII Cross-User Read on Private Subcollection',
    collectionPath: '/users/user_1/private/info',
    operation: 'get',
    auth: { uid: 'user_2', email: 'other@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Orphaned Private Info Without Parent User',
    collectionPath: '/users/nonexistent_user/private/info',
    operation: 'create',
    auth: { uid: 'nonexistent_user', email: 'u@example.com', email_verified: true },
    payload: { uid: 'nonexistent_user', email: 'u@example.com' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Draft Article Scraping via List Query',
    collectionPath: '/articles',
    operation: 'list',
    auth: null,
    payload: { statusFilter: 'draft' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Unauthorized Article Modification by Standard Reader',
    collectionPath: '/articles/art_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { title: 'Hacked Title' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Immutable createdAt Tampering on Update',
    collectionPath: '/users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client Timestamp Forgery on Comment Create',
    collectionPath: '/comments/cmt_10',
    operation: 'create',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { createdAt: '2020-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Orphaned Comment Creation on Non-Existent Article',
    collectionPath: '/comments/cmt_11',
    operation: 'create',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { articleId: 'non_existent_article_id' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning Over-Length Display Name',
    collectionPath: '/users/user_1',
    operation: 'update',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { displayName: 'A'.repeat(500) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'ID Poisoning with Special Characters',
    collectionPath: '/comments/bad$id!@#',
    operation: 'create',
    auth: { uid: 'user_1', email: 'reader@example.com', email_verified: true },
    payload: { id: 'bad$id!@#' },
    expectedResult: 'PERMISSION_DENIED',
  },
];
