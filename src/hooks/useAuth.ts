import { useEffect, useState, useMemo } from 'react';
import { 
  User, 
  signInWithPopup, 
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
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
      await signInWithPopup(auth, googleProvider);
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
