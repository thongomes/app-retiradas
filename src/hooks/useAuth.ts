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

const ALLOWED_EMAILS = [
  'enito@newlife.com.br',
  'admin@newlife.com.br',
  'enito.vgs@gmail.com'
];

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
    if (!user) return false;
    const email = user.email || '';
    return ALLOWED_EMAILS.includes(email) || email.endsWith('@newlife.com.br');
  }, [user]);

  const loginWithGoogle = async () => {
    try {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      if (isMobile) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      console.error('Erro no login com Google:', error);
      throw error;
    }
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
