import { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(
    localStorage.getItem('cover_remember_me') === 'true'
  );

  // Helper function to save session info to localStorage
  const saveSessionToLocalStorage = (session) => {
    if (session) {
      localStorage.setItem('cover_session', JSON.stringify({
        expires_at: session.expires_at,
        user_id: session.user.id
      }));
      
      // Also store the full session token for better persistence
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }
  };

  useEffect(() => {
    // Check for existing session on initial load
    checkUser();

    // Set up a listener for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthContext auth state change:', event);
        if (session?.user) {
          setUser(session.user);
          saveSessionToLocalStorage(session);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Check for existing user session
  const checkUser = async () => {
    try {
      console.log('Checking for existing user session...');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Session found for user:', session.user.email);
        setUser(session.user);
        saveSessionToLocalStorage(session);
      } else {
        // Check if we have a saved session in localStorage as a backup
        const savedSession = localStorage.getItem('cover_session');
        const savedToken = localStorage.getItem('supabase.auth.token');
        
        if (savedToken || savedSession) {
          console.log('Found saved session info in localStorage, refreshing session...');
          try {
            // Force an explicit refresh attempt
            setLoading(true);
            
            // Try to refresh the session
            const { data, error: refreshError } = await supabase.auth.refreshSession();
            
            if (data?.session) {
              console.log('Session refreshed successfully');
              setUser(data.session.user);
              saveSessionToLocalStorage(data.session);
            } else if (refreshError) {
              console.error('Error refreshing session:', refreshError);
              
              // If refresh failed but we still have a saved token, try to recover
              if (savedToken) {
                try {
                  // This is a last-resort approach to handle session persistence
                  console.log('Attempting session recovery from saved token');
                  const parsedToken = JSON.parse(savedToken);
                  if (parsedToken?.user) {
                    setUser(parsedToken.user);
                    console.log('Recovered user from saved token:', parsedToken.user.email);
                  }
                } catch (e) {
                  console.error('Failed to recover from saved token:', e);
                }
              }
            }
          } catch (refreshError) {
            console.error('Error during session refresh:', refreshError);
          } finally {
            setLoading(false);
          }
        } else {
          console.log('No session found');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign up a new user
  const signUp = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;
      
      if (data?.session) {
        saveSessionToLocalStorage(data.session);
      }
      
      return data;
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign in existing user
  const signIn = async (email, password, rememberLogin = false) => {
    try {
      setLoading(true);
      
      // Store the remember me preference
      setRememberMe(rememberLogin);
      localStorage.setItem('cover_remember_me', rememberLogin.toString());
      
      // Set session expiry based on remember me preference
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
        options: {
          // If remember me is true, use a longer session (30 days), otherwise 1 day
          expiresIn: rememberLogin ? 60 * 60 * 24 * 30 : 60 * 60 * 24,
        }
      });

      if (error) throw error;
      
      if (data?.session) {
        saveSessionToLocalStorage(data.session);
      }
      
      return data;
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };
  
  // Sign in with Google
  const signInWithGoogle = async (rememberLogin = false) => {
    try {
      setLoading(true);
      
      // Store the remember me preference
      setRememberMe(rememberLogin);
      localStorage.setItem('cover_remember_me', rememberLogin.toString());
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          redirectTo: window.location.origin + '/auth/callback',
        },
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Sign out user
  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      
      // Clear session data
      localStorage.removeItem('cover_session');
      
      // Clear remember me preference on sign out
      if (!rememberMe) {
        localStorage.removeItem('cover_remember_me');
      }
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Reset password
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      return data;
    } catch (error) {
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    loading,
    error,
    rememberMe,
    signUp,
    signIn,
    signOut,
    resetPassword,
    signInWithGoogle,
    isAuthenticated: !!user,
    logout: signOut, // Alias for signOut to match the name used in Navbar
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 