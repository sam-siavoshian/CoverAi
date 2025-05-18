import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { ThemeProvider } from './context/ThemeContext'
import supabase from './lib/supabase' // Import supabase client

// Initialize Supabase and check session on app startup
(async () => {
  try {
    // Attempt to restore session from localStorage first
    const savedToken = localStorage.getItem('supabase.auth.token');
    
    if (savedToken) {
      try {
        console.log('Found saved token, attempting to restore session...');
        // Try to use the token to refresh the session
        await supabase.auth.refreshSession();
      } catch (e) {
        console.error('Failed to restore session from saved token:', e);
      }
    }
    
    // Get the current session state
    const { data } = await supabase.auth.getSession();
    console.log('App initialized with auth state:', data?.session ? 'Authenticated' : 'Not authenticated');
    
    if (data?.session) {
      // Store the session in localStorage for redundancy
      localStorage.setItem('supabase.auth.token', JSON.stringify(data.session));
      localStorage.setItem('cover_session', JSON.stringify({
        expires_at: data.session.expires_at,
        user_id: data.session.user.id
      }));
    }
  } catch (error) {
    console.error('Error initializing app:', error);
  }
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
