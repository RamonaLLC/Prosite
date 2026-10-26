import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut, 
  User, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

// Memory-only access token cache (NEVER persisted to localStorage per security directives)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Initialize Google Workspace Authentication Listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Sign in with Google Popup and obtain Workspace OAuth access token
export const googleSignIn = async (): Promise<{ user: User; accessToken: string | null } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    cachedAccessToken = credential?.accessToken || null;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign-In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

// Retrieve in-memory cached OAuth token
export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

// Set token explicitly (e.g. if refreshed)
export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

// Sign out and clear in-memory credentials
export const logoutUser = async (): Promise<void> => {
  await signOut(auth);
  cachedAccessToken = null;
};
