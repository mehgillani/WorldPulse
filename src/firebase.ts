import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { Article, ArticleComment, UserProfile } from './types/editorial';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const BOOTSTRAPPED_ADMIN_EMAIL = 'mehgillani5373@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate Connection to Firestore on Boot (Mandatory per firebase-integration-rpc skill)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

// Sanitize outgoing Article payload to strictly match firebase-blueprint.json & firestore.rules
export function buildFirestoreArticlePayload(article: Article, isNew = false) {
  const cleanId = article.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const base = {
    id: cleanId,
    title: (article.title || 'Untitled Dispatch').slice(0, 240),
    subtitle: (article.subtitle || '').slice(0, 500),
    slug: (article.slug || cleanId).slice(0, 180),
    category: (article.category || 'world').slice(0, 60),
    categoryName: (article.categoryName || 'World').slice(0, 80),
    tags: (article.tags || []).slice(0, 12).map((t) => String(t).slice(0, 40)),
    authorId: (article.authorId || 'author-elena-rostova').slice(0, 128),
    authorName: (article.authorName || 'Elena Rostova').slice(0, 100),
    authorRole: (article.authorRole || 'Correspondent').slice(0, 120),
    featuredImage: (article.featuredImage || '').slice(0, 150000),
    imageCaption: (article.imageCaption || '').slice(0, 400),
    body: (article.body || '<p></p>').slice(0, 100000),
    status: ['published', 'draft', 'scheduled'].includes(article.status)
      ? article.status
      : 'draft',
    publishedAt: (article.publishedAt || new Date().toISOString()).slice(0, 40),
    readingTime: Math.min(120, Math.max(1, Number(article.readingTime) || 5)),
    views: Math.max(0, Number(article.views) || 0),
    isLead: Boolean(article.isLead),
    isTrending: Boolean(article.isTrending),
    isDeveloping: Boolean(article.isDeveloping),
    isDemo: Boolean(article.isDemo),
    updatedAt: serverTimestamp(),
  };

  if (isNew) {
    return {
      ...base,
      createdAt: serverTimestamp(),
    };
  }
  return base;
}

// Sync Google Sign-In User with Firestore Public & Private Split Collections
export async function syncFirebaseUserWithFirestore(
  fbUser: FirebaseUser
): Promise<UserProfile> {
  const uid = fbUser.uid;
  const userDocRef = doc(db, 'users', uid);
  const privateDocRef = doc(db, 'users', uid, 'private', 'info');
  const isOwnerAdmin =
    fbUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase();

  let interests = ['world', 'technology', 'business', 'environment'];
  let savedArticleIds = ['art-1'];
  let newsletterSubscribed = true;
  let displayName = (fbUser.displayName || fbUser.email?.split('@')[0] || 'Reader').slice(0, 80);

  try {
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      interests = Array.isArray(data.interests) ? data.interests : interests;
      savedArticleIds = Array.isArray(data.savedArticleIds)
        ? data.savedArticleIds
        : savedArticleIds;
      newsletterSubscribed = Boolean(data.newsletterSubscribed);
      displayName = (data.displayName || displayName).slice(0, 80);
    } else {
      // Create public profile first (Master Gate parent document)
      await setDoc(userDocRef, {
        uid,
        displayName,
        interests: interests.slice(0, 15),
        savedArticleIds: savedArticleIds.slice(0, 50),
        newsletterSubscribed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Then store isolated PII email in /users/{uid}/private/info
      if (fbUser.email) {
        await setDoc(privateDocRef, {
          uid,
          email: fbUser.email.slice(0, 160),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }

  return {
    id: uid,
    name: displayName,
    email: fbUser.email || '',
    role: isOwnerAdmin ? 'admin' : 'reader',
    interests,
    savedArticleIds,
    newsletterSubscribed,
    createdAt: new Date().toISOString(),
  };
}

export async function updateFirestoreUserProfile(
  uid: string,
  patch: {
    displayName?: string;
    interests?: string[];
    savedArticleIds?: string[];
    newsletterSubscribed?: boolean;
  }
) {
  const path = `users/${uid}`;
  try {
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (patch.displayName !== undefined) {
      payload.displayName = patch.displayName.slice(0, 80);
    }
    if (patch.interests !== undefined) {
      payload.interests = patch.interests.slice(0, 15).map((i) => i.slice(0, 40));
    }
    if (patch.savedArticleIds !== undefined) {
      payload.savedArticleIds = patch.savedArticleIds
        .slice(0, 50)
        .map((id) => id.slice(0, 128));
    }
    if (patch.newsletterSubscribed !== undefined) {
      payload.newsletterSubscribed = Boolean(patch.newsletterSubscribed);
    }
    await updateDoc(doc(db, 'users', uid), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveArticleToFirestore(article: Article, isExisting: boolean) {
  const cleanId = article.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `articles/${cleanId}`;
  try {
    const docRef = doc(db, 'articles', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists() && isExisting) {
      const existingData = snap.data();
      await setDoc(docRef, {
        ...buildFirestoreArticlePayload(article, false),
        createdAt: existingData.createdAt || serverTimestamp(),
      });
    } else {
      await setDoc(docRef, buildFirestoreArticlePayload(article, true));
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteArticleFromFirestore(articleId: string) {
  const cleanId = articleId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `articles/${cleanId}`;
  try {
    await deleteDoc(doc(db, 'articles', cleanId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createCommentInFirestore(comment: ArticleComment, authorUid: string) {
  const cleanId = comment.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const cleanArticleId = comment.articleId.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
  const path = `comments/${cleanId}`;
  try {
    await setDoc(doc(db, 'comments', cleanId), {
      id: cleanId,
      articleId: cleanArticleId,
      articleTitle: comment.articleTitle.slice(0, 240),
      authorId: authorUid.slice(0, 128),
      authorName: comment.authorName.slice(0, 80),
      content: comment.content.slice(0, 1500),
      status: 'approved',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function seedInitialArticlesToFirestoreIfNeeded(articlesToSeed: Article[]) {
  try {
    const batch = writeBatch(db);
    for (const art of articlesToSeed) {
      const cleanId = art.id.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 128);
      const ref = doc(db, 'articles', cleanId);
      batch.set(ref, buildFirestoreArticlePayload(art, true));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'articles');
  }
}

export {
  signInWithPopup,
  firebaseSignOut,
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
};
export type { FirebaseUser };
