import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { env } from "../env";

const firebaseConfig = {
  apiKey: env.firebaseApiKey,
  authDomain: env.firebaseAuthDomain,
  projectId: env.firebaseProjectId,
};

for (const key in firebaseConfig) {
  if (!firebaseConfig[key as keyof typeof firebaseConfig]) {
    throw new Error(`Missing Firebase config value for ${key}`);
  }
}

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db };
