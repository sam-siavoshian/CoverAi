import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client with environment variables or the existing config values
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jjaptganymmialcydcou.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpqYXB0Z2FueW1taWFsY3lkY291Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc1MTc2ODEsImV4cCI6MjA2MzA5MzY4MX0.L6wptBmaltLKZAsV7ifTlXP3F6N3G5s2cDPfUKVmyFQ';

// Configure client with settings to persist sessions
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Enable session persistence
    storageKey: 'cover_auth_token',
    autoRefreshToken: true, // Auto refresh token
    detectSessionInUrl: true, // Detect session in URL for OAuth
    storage: localStorage, // Use localStorage directly for better compatibility
    debug: true, // Enable debug logs to help troubleshoot session issues
  },
});

// Log session state on initialization for debugging
(async () => {
  const { data } = await supabase.auth.getSession();
  console.log('Initial session state:', data?.session ? 'Session found' : 'No session found');
})();

// Set up a more detailed auth state change listener
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state change event:', event);
  
  if (event === 'SIGNED_IN' && session) {
    console.log('User signed in:', session.user.email);
    localStorage.setItem('supabase.auth.token', JSON.stringify(session));
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out');
    localStorage.removeItem('supabase.auth.token');
  } else if (event === 'TOKEN_REFRESHED') {
    console.log('Token refreshed');
    if (session) {
      localStorage.setItem('supabase.auth.token', JSON.stringify(session));
    }
  } else if (event === 'USER_UPDATED') {
    console.log('User updated');
  }
});

export default supabase; 