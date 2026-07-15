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

  const isIOS = useMemo(() => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  }, []);

  const isInAppBrowser = useMemo(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    return (
      ua.indexOf('FBAN') > -1 ||
      ua.indexOf('FBAV') > -1 ||
      ua.indexOf('Instagram') > -1 ||
      ua.indexOf('WhatsApp') > -1 ||
      ua.indexOf('GSA') > -1 || // Google Search App on iOS
      ua.indexOf('Messenger') > -1
    );
  }, []);

  const hasAccess = useMemo(() => {
    return !!user;
  }, [user]);

  const loginWithGoogle = () => {
    signInWithPopup(auth, googleProvider)
      .catch((error: any) => {
        console.error('Erro no login com Google:', error);
        if (error?.code === 'auth/popup-blocked') {
          if (isIOS) {
            alert('Atenção: O navegador bloqueou o pop-up de login do Google. Para entrar no iPhone:\n\n1. Clique em "Permitir" quando solicitado na tela.\n2. Se estiver dentro do WhatsApp, clique no ícone da bússola ou menu (três pontos) e escolha "Abrir no Safari".\n3. Ou vá em Ajustes do seu iPhone -> Safari (ou Chrome) e desative a opção "Bloquear Pop-ups".');
          } else {
            signInWithRedirect(auth, googleProvider);
          }
        } else if (error?.code === 'auth/operation-not-supported-in-this-environment') {
          signInWithRedirect(auth, googleProvider);
        } else {
          alert('Erro ao realizar o login com Google: ' + (error?.message || 'Erro desconhecido.'));
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
    logout,
    isIOS,
    isInAppBrowser
  };
}
