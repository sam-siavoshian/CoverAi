import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useThemeContext } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Bars3Icon, XMarkIcon, SunIcon, MoonIcon } from '@heroicons/react/24/outline';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { theme, toggleTheme } = useThemeContext();
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if a nav link is active
  const isLinkActive = (path) => {
    if (path.startsWith('/#')) {
      return location.hash === path.substring(1);
    }
    return location.pathname === path;
  };

  // Handle scroll effect for glass navbar
  useEffect(() => {
    const handleScroll = () => {
      // Set scrolled state for navbar background
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      // Calculate scroll progress
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollHeight > 0 ? (window.scrollY / scrollHeight) * 100 : 0;
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  // Add a protected route redirect
  useEffect(() => {
    // If on profile page and not authenticated, redirect to login
    if (location.pathname === '/profile' && !isAuthenticated && !user) {
      navigate('/login');
    }
  }, [location, isAuthenticated, user, navigate]);

  // Function to handle anchor link navigation
  const handleAnchorClick = (e, anchor) => {
    // Only process links that start with #
    if (anchor.startsWith('#')) {
      e.preventDefault();
      
      // If not on the home page, navigate to home page first
      if (location.pathname !== '/') {
        window.location.href = '/' + anchor;
        return;
      }
      
      // Get the element on the page
      const element = document.getElementById(anchor.substring(1));
      if (element) {
        // Scroll to the element
        element.scrollIntoView({ behavior: 'smooth' });
        // Optionally update URL without page reload
        window.history.pushState(null, '', anchor);
      }
    }
  };

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'glass-nav' 
          : 'bg-transparent'
      }`}
    >
      {/* Scroll progress indicator */}
      <div 
        className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 transition-all duration-150"
        style={{ width: `${scrollProgress}%` }}
      />
      
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 sm:h-18 md:h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-1.5 group"
            aria-label="Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-md transform group-hover:scale-105 transition-all duration-200">
              <span className="text-white font-bold text-sm sm:text-base">C</span>
            </div>
            <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary-500 to-secondary-500 bg-clip-text text-transparent transform group-hover:translate-x-0.5 transition-transform duration-200">
              CoverAi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {['/#how-it-works', '/#features', '/#faq'].map((path) => {
              const label = path.substring(2).split('-').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1)
              ).join(' ');
              
              return (
                <Link 
                  key={path}
                  to={path} 
                  onClick={(e) => handleAnchorClick(e, path.substring(1))}
                  className={`relative px-3 py-2 text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-md ${
                    isLinkActive(path) ? 'font-medium text-primary-600 dark:text-primary-400' : ''
                  }`}
                >
                  {label}
                  {isLinkActive(path) && (
                    <span className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Theme toggle */}
            <button 
              onClick={toggleTheme} 
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-dark-200 transition-all duration-200 hover:shadow-sm"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-5 h-5 transition-all duration-300 transform">
                {theme === 'dark' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 h-5 w-5 text-gray-700" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                  </svg>
                )}
              </div>
            </button>

            {/* Authentication buttons */}
            {isAuthenticated ? (
              <>
                <Link 
                  to="/profile" 
                  className="glass-button text-sm px-4 py-2 text-gray-700 dark:text-gray-200 font-medium"
                >
                  Profile
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn btn-primary btn-glow text-sm px-4 py-2"
                >
                  <span className="relative z-10">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link 
                  to="/login" 
                  className="glass-button text-sm px-4 py-2 text-gray-700 dark:text-gray-200 font-medium"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary btn-glow text-sm px-4 py-2"
                >
                  <span className="relative z-10">Sign up</span>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="group p-2 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-dark-200 transition-all duration-200"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">{isMenuOpen ? 'Close menu' : 'Open menu'}</span>
              <div className="relative w-6 h-6 transform transition-all duration-200">
                <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out rounded-full ${
                  isMenuOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-1.5'
                }`}></span>
                
                <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out rounded-full ${
                  isMenuOpen ? 'opacity-0' : 'opacity-100'
                }`}></span>
                
                <span className={`absolute block h-0.5 w-6 bg-current transform transition-all duration-300 ease-in-out rounded-full ${
                  isMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1.5'
                }`}></span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div 
        className={`md:hidden glass-frosted shadow-lg overflow-hidden transition-all duration-300 ease-in-out ${
          isMenuOpen 
            ? 'max-h-[500px] opacity-100 border-t border-white/20 dark:border-dark-100/30' 
            : 'max-h-0 opacity-0 border-t-0'
        }`}
      >
        <div className="container-custom py-4 space-y-3">
          {/* Navigation links */}
          {['/#how-it-works', '/#features', '/#faq'].map((path) => {
            const label = path.substring(2).split('-').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
            
            return (
              <Link 
                key={path}
                to={path} 
                onClick={(e) => {
                  handleAnchorClick(e, path.substring(1));
                  setIsMenuOpen(false); // Close mobile menu when link is clicked
                }}
                className={`block py-2.5 px-3 rounded-lg ${
                  isLinkActive(path) 
                    ? 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 text-primary-700 dark:text-primary-300 font-medium' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-200'
                } transition-colors`}
              >
                {label}
              </Link>
            );
          })}
          
          {/* Authenticated-only links */}
          {isAuthenticated && (
            <Link 
              to="/profile" 
              className={`block py-2.5 px-3 rounded-lg ${
                isLinkActive('/profile') 
                  ? 'bg-gradient-to-r from-primary-50 to-secondary-50 dark:from-primary-900/20 dark:to-secondary-900/20 text-primary-700 dark:text-primary-300 font-medium' 
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-dark-200'
              } transition-colors`}
            >
              Profile
            </Link>
          )}
          
          <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex items-center justify-between px-3">
              <span className="text-gray-700 dark:text-gray-200">
                {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              </span>
              <button 
                onClick={toggleTheme} 
                className="relative w-12 h-6 rounded-full flex items-center transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 bg-gray-200 dark:bg-dark-100"
              >
                <span className={`inline-block w-5 h-5 transform transition-transform duration-300 ease-in-out rounded-full shadow-md ${
                  theme === 'dark' 
                    ? 'translate-x-6 bg-primary-600' 
                    : 'translate-x-1 bg-white'
                }`} />
              </button>
            </div>
            
            {/* Authentication actions */}
            {isAuthenticated ? (
              <button 
                onClick={handleLogout}
                className="block w-full mx-2 text-center btn btn-primary btn-glow"
              >
                <span className="relative z-10">Logout</span>
              </button>
            ) : (
              <div className="flex flex-col space-y-2.5 px-2">
                <Link 
                  to="/login" 
                  className="glass-button py-2.5 text-center text-gray-700 dark:text-gray-200 font-medium"
                >
                  Log in
                </Link>
                <Link 
                  to="/register" 
                  className="btn btn-primary btn-glow"
                >
                  <span className="relative z-10">Sign up</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 