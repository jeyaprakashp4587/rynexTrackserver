import admin from "firebase-admin";
import "dotenv/config";

const requiredFirebaseEnv = [
  "FIREBASE_PROJECT_ID",
  "FIREBASE_PRIVATE_KEY",
  "FIREBASE_CLIENT_EMAIL",
];

const getFirebaseConfig = () => {
  const missing = requiredFirebaseEnv.filter((key) => !process.env[key]);

  if (missing.length) {
    throw new Error(
      `Missing Firebase Admin env vars: ${missing.join(", ")}. ` +
        "Set these values in backend/.env",
    );
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
};

const initializeFirebaseAdmin = () => {
  if (!admin.apps.length) {
    const serviceAccount = getFirebaseConfig();
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized");
  }
  return admin;
};

export { initializeFirebaseAdmin };
