import { useEffect, useState, useMemo } from 'react';
import { 
  User, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Listen to active auth session changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    // 2. Fetch redirect result if user just returned from mobile redirect
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setUser(result.user);
        }
      })
      .catch((error) => {
        console.error('Erro no retorno do redirecionamento do Firebase:', error);
      });

    return () => unsubscribe();
  }, []);

  const hasAccess = useMemo(() => {
    return !!user;
  }, [user]);

  const loginWithGoogle = () => {
    // Call signInWithPopup synchronously to prevent mobile popup blocking.
    // If it is blocked by browser rules, fallback to redirect.
    signInWithPopup(auth, googleProvider)
      .catch((error: any) => {
        if (error?.code === 'auth/popup-blocked') {
          signInWithRedirect(auth, googleProvider);
        } else {
          console.error('Erro no login com Google:', error);
        }
      });
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Erro ao sair:', error);
      throw error;
    }
  };

  return {
    user,
    loading,
    hasAccess,
    loginWithGoogle,
    logout
  };
}
