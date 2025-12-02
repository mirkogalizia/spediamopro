// lib/firebaseAdminServer.js
import * as admin from "firebase-admin";

if (!admin.apps.length) {
  if (
    !process.env.FIREBASE_PRIVATE_KEY ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !process.env.FIREBASE_PROJECT_ID
  ) {
    throw new Error("❌ Variabili Firebase Admin mancanti in firebaseAdminServer.js");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process
        .env
        .FIREBASE_PRIVATE_KEY
        .replace(/\\n/g, "\n"), // fix per Vercel
    }),
  });
}

export const adminDB = admin.firestore();