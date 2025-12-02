// lib/firebaseAdminServer.ts
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Fix chiave privata per evitare problemi con "\n"
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const firestoreAdmin = admin.firestore();
export const adminDb = admin.firestore(); // Alias per retrocompatibilità
export const adminAuth = admin.auth();
export const adminFieldValue = admin.firestore.FieldValue;