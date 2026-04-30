// ──────────────────────────────────────────────
// Firebase Admin – Server-side Auth Verification
// ──────────────────────────────────────────────

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getAuth, type DecodedIdToken } from "firebase-admin/auth";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey && serviceAccountKey !== "{}") {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      adminApp = initializeApp({
        credential: cert(serviceAccount),
      });
    } catch {
      // Fall back to default credentials
      adminApp = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    adminApp = initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
  }

  return adminApp;
}

/**
 * Verify a Firebase ID token from the Authorization header.
 * Returns the decoded token if valid, null otherwise.
 */
export async function verifyFirebaseToken(
  authHeader: string | null
): Promise<DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const decoded = await auth.verifyIdToken(token);
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Extract the farmer phone from the decoded token.
 * Firebase phone auth stores the phone in token.phone_number.
 */
export function getPhoneFromToken(decoded: DecodedIdToken): string | null {
  return decoded.phone_number || null;
}
