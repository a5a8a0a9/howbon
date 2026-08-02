import { environment } from '@environment';
import { FirebaseApp, FirebaseOptions, getApp, getApps, initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import {
  Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

let cachedServices: FirebaseServices | null | undefined;

export function isFirebaseConfigured(): boolean {
  const config = environment.firebase;
  return Boolean(
    config.apiKey &&
    config.projectId &&
    config.appId &&
    !Object.values(config).some((value) => value.includes('REPLACE_WITH_')),
  );
}

export function getFirebaseServices(): FirebaseServices | null {
  if (cachedServices !== undefined) {
    return cachedServices;
  }

  if (!isFirebaseConfigured()) {
    cachedServices = null;
    return cachedServices;
  }

  const app = getApps().length ? getApp() : initializeApp(environment.firebase as FirebaseOptions);
  const firestore =
    typeof indexedDB === 'undefined'
      ? initializeFirestore(app, {})
      : initializeFirestore(app, {
          localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
        });

  cachedServices = { app, auth: getAuth(app), firestore };
  return cachedServices;
}
