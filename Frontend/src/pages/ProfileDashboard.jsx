import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import supabase from '../lib/supabase';
import { 
  UserIcon, 
  BriefcaseIcon, 
  HomeIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  BellAlertIcon
} from '@heroicons/react/24/outline';

const roleplayOptions = [
  { id: 'pizza', name: 'Pizza Delivery', description: 'AI pretends to be taking your pizza order' },
  { id: 'tech', name: 'Tech Support', description: 'AI acts as technical support helping with your device' },
  { id: 'boss', name: 'Your Boss', description: 'AI roleplays as your supervisor calling about work' },
  { id: 'friend', name: 'Friend Checking In', description: 'AI pretends to be a friend catching up' },
  { id: 'ride', name: 'Ride Share Driver', description: 'AI acts as a driver confirming your pickup details' },
];

export default function ProfileDashboard() {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState({
    // Personal info
    fullName: '',
    homeAddress: '',
    emergencyContact: '',
    medicalInfo: '',
    
    // Roleplay preferences
    preferredRoleplay: 'pizza',
    customRoleplayName: '',
    customRoleplayDetails: '',
  });
  
  const [isSaved, setIsSaved] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [sessionCheckComplete, setSessionCheckComplete] = useState(false);
  
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  // Check for session in localStorage before redirecting
  const checkLocalSession = () => {
    const savedSession = localStorage.getItem('cover_session');
    const supabaseToken = localStorage.getItem('supabase.auth.token');
    return !!(savedSession || supabaseToken);
  };
  
  // Load profile data from Supabase when component mounts
  useEffect(() => {
    // Check if we have a session stored in localStorage
    const hasLocalSession = checkLocalSession();
    
    // Don't do anything until the auth state has been checked
    if (authLoading) {
      console.log('Auth state still loading...');
      return;
    }
    
    // Set session check as complete once auth loading is done
    setSessionCheckComplete(true);
    
    if (!isAuthenticated && !user && !hasLocalSession) {
      console.log('No authenticated user or local session found, redirecting to login');
      // Only redirect if no user AND no stored session
      navigate('/login');
      return;
    }
    
    if (user) {
      console.log('User authenticated, loading profile data:', user.email);
      loadProfileData();
    } else if (hasLocalSession) {
      // Try to restore session first before redirecting
      console.log('No user but found local session, attempting to restore...');
      
      // Give time for auth state to resolve
      const timer = setTimeout(() => {
        if (!user && !authLoading) {
          console.log('Session restore failed, redirecting to login');
          navigate('/login');
        }
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [user, isAuthenticated, authLoading, navigate]);
  
  // Function to load profile data from Supabase
  const loadProfileData = async () => {
    if (!user) {
      console.log('Cannot load profile: No authenticated user');
      return;
    }
    
    setIsLoading(true);
    try {
      // Try to get the session first to confirm authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No active session found when trying to load profile');
        navigate('/login');
        return;
      }
      
      // Query the profiles table to get the current user's profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // PGRST116 is "no rows returned" error
          console.log('No profile found, creating a new one');
          // Initialize with default profile data
          await createNewProfile();
        } else {
          throw error;
        }
      }
      
      if (data && data.profile_data) {
        // Set form data from database
        console.log('Profile data loaded successfully');
        setFormData(data.profile_data);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setSaveError('Failed to load your profile data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new profile if one doesn't exist
  const createNewProfile = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .insert({
          user_id: user.id,
          profile_data: formData,
          created_at: new Date(),
          updated_at: new Date()
        });
      
      if (error) throw error;
      console.log('New profile created successfully');
    } catch (error) {
      console.error('Error creating profile:', error);
      setSaveError('Failed to create your profile');
    }
  };
  
  // Show loading state while checking auth
  if (authLoading || (!sessionCheckComplete && !isAuthenticated)) {
    return (
      <div className="bg-gray-50 dark:bg-dark-300 min-h-screen pt-24">
        <div className="container-custom py-8">
          <div className="max-w-md mx-auto">
            <div className="flex flex-col items-center justify-center py-10">
              <div className="flex justify-center items-center w-20 h-20 rounded-full bg-primary-50 dark:bg-primary-900/20 mb-6">
                <svg className="animate-spin h-10 w-10 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Loading Profile
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Please wait while we retrieve your information...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: value 
    });
    setIsSaved(false);
    
    // Clear any errors for this field
    if (formErrors[name]) {
      setFormErrors({
        ...formErrors,
        [name]: null
      });
    }
  };
  
  const handleRoleplayChange = (id) => {
    setFormData({
      ...formData,
      preferredRoleplay: id
    });
    setIsSaved(false);
  };
  
  // Validate form based on active tab
  const validateForm = () => {
    const errors = {};
    
    if (activeTab === 'personal') {
      if (!formData.fullName) errors.fullName = 'Name is required';
      if (!formData.homeAddress) errors.homeAddress = 'Address is required';
      if (!formData.emergencyContact) errors.emergencyContact = 'Emergency contact is required';
    }
    
    if (activeTab === 'roleplay' && formData.preferredRoleplay === 'custom') {
      if (!formData.customRoleplayName) errors.customRoleplayName = 'Name is required for custom roleplay';
      if (!formData.customRoleplayDetails) errors.customRoleplayDetails = 'Details are required for custom roleplay';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Navigate to next tab if validation passes
  const handleNextTab = () => {
    if (validateForm()) {
      if (activeTab === 'personal') setActiveTab('roleplay');
    }
  };
  
  // Navigate to previous tab
  const handlePrevTab = () => {
    if (activeTab === 'roleplay') setActiveTab('personal');
  };
  
  const saveProfile = async () => {
    setSaveError(null);
    
    if (!isAuthenticated || !user) {
      setSaveError('You must be logged in to save your profile');
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      let saveError;
      
      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }
      
      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({ 
            profile_data: formData,
            updated_at: new Date()
          })
          .eq('user_id', user.id);
        
        saveError = error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            profile_data: formData,
            created_at: new Date(),
            updated_at: new Date()
          });
        
        saveError = error;
      }
      
      if (saveError) throw saveError;
      
      setIsSaved(true);
      // Reset save confirmation after 3 seconds
      setTimeout(() => {
        setIsSaved(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError('Failed to save your profile. Please try again.');
      setIsSaved(false);
    } finally {
      setIsLoading(false);
    }
  };
  
  // If user is not logged in, redirect to login
  if (!user) {
    return null; // Return null instead of rendering anything
  }
  
  return (
    <div className="bg-gray-50 dark:bg-dark-300 min-h-screen pt-16">
      <div className="container mx-auto px-4 sm:px-6 py-4">
        <div className="max-w-3xl mx-auto">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Your Profile
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Set up your emergency profile and communication preferences
            </p>
          </motion.div>
          
          {/* Progress Bar */}
          <div className="bg-white dark:bg-dark-200 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Completion</h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {activeTab === 'personal' ? 'Step 1 of 2' : 'Step 2 of 2'}
              </span>
            </div>
            
            <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="absolute left-0 top-0 h-full bg-primary-500"
                style={{ 
                  width: `${activeTab === 'personal' ? '50%' : '100%'}`,
                  transition: 'width 0.3s ease-in-out'  
                }}
              ></div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('personal')}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md text-sm font-medium flex justify-center items-center ${
                activeTab === 'personal'
                  ? 'bg-white dark:bg-dark-200 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <UserIcon className="h-4 w-4 mr-2" />
              Personal Info
            </button>
            <button
              onClick={() => setActiveTab('roleplay')}
              className={`flex-1 py-2 px-3 md:px-4 rounded-md text-sm font-medium flex justify-center items-center ${
                activeTab === 'roleplay'
                  ? 'bg-white dark:bg-dark-200 text-primary-600 dark:text-primary-400 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <BriefcaseIcon className="h-4 w-4 mr-2" />
              Emergency Call
            </button>
          </div>
          
          {/* Tab content */}
          <div className="bg-white dark:bg-dark-200 rounded-lg shadow-md p-5 md:p-6">
            {/* Display any save errors */}
            {saveError && (
              <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-md flex items-start">
                <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{saveError}</p>
              </div>
            )}
            
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Your Information
                  </h2>
                  
                  <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center bg-blue-50 dark:bg-blue-900/10 p-1.5 px-3 rounded-full">
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    Shared only during emergencies
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md flex items-center text-sm">
                  <BellAlertIcon className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                  This helps emergency services locate and assist you quickly
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name {formErrors.fullName && <span className="text-xs text-red-600 dark:text-red-400 ml-1">Required</span>}
                    </label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="Your legal name"
                      className={`block w-full rounded-md border ${formErrors.fullName ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'} 
                        bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500`}
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="homeAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Home Address {formErrors.homeAddress && <span className="text-xs text-red-600 dark:text-red-400 ml-1">Required</span>}
                    </label>
                    <textarea
                      id="homeAddress"
                      name="homeAddress"
                      value={formData.homeAddress}
                      onChange={handleInputChange}
                      placeholder="Street address, city, state, zip"
                      rows={2}
                      className={`block w-full rounded-md border ${formErrors.homeAddress ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'} 
                        bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500`}
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Emergency Contact {formErrors.emergencyContact && <span className="text-xs text-red-600 dark:text-red-400 ml-1">Required</span>}
                    </label>
                    <input
                      type="text"
                      id="emergencyContact"
                      name="emergencyContact"
                      value={formData.emergencyContact}
                      onChange={handleInputChange}
                      placeholder="Name and phone number"
                      className={`block w-full rounded-md border ${formErrors.emergencyContact ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'} 
                        bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500`}
                    />
                  </div>
                  
                  <div className="col-span-1 md:col-span-2">
                    <div className="flex justify-between mb-1">
                      <label htmlFor="medicalInfo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Medical Information <span className="text-xs text-gray-500">(Optional)</span>
                      </label>
                    </div>
                    <textarea
                      id="medicalInfo"
                      name="medicalInfo"
                      value={formData.medicalInfo}
                      onChange={handleInputChange}
                      placeholder="Allergies, medications, conditions"
                      rows={2}
                      className="block w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Roleplay Preferences Tab */}
            {activeTab === 'roleplay' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                    Emergency Call Type
                  </h2>
                  
                  <div className="text-xs text-green-600 dark:text-green-400 flex items-center bg-green-50 dark:bg-green-900/10 p-1.5 px-3 rounded-full">
                    <InformationCircleIcon className="h-4 w-4 mr-1" />
                    Disguises your emergency call
                  </div>
                </div>
                
                <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-md flex items-center text-sm text-green-700 dark:text-green-300">
                  <InformationCircleIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  Disguises your emergency call as a normal conversation
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {roleplayOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleRoleplayChange(option.id)}
                      className={`relative rounded-lg cursor-pointer transition-all duration-150 p-4 ${
                        formData.preferredRoleplay === option.id
                          ? 'bg-primary-50 border-2 border-primary-500 dark:bg-primary-900/20 dark:border-primary-400 shadow-sm'
                          : 'bg-white border border-gray-200 hover:border-primary-200 dark:bg-dark-100 dark:border-gray-700 dark:hover:border-primary-700'
                      }`}
                    >
                      <div className="flex items-center">
                        <div 
                          className={`h-5 w-5 rounded-full border flex-shrink-0 flex items-center justify-center mr-3 ${
                            formData.preferredRoleplay === option.id 
                              ? 'border-primary-500 bg-primary-500' 
                              : 'border-gray-300 bg-white dark:border-gray-500 dark:bg-dark-300'
                          }`}
                        >
                          {formData.preferredRoleplay === option.id && (
                            <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{option.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div
                  onClick={() => handleRoleplayChange('custom')}
                  className={`relative rounded-lg cursor-pointer transition-all duration-150 p-4 ${
                    formData.preferredRoleplay === 'custom'
                      ? 'bg-primary-50 border-2 border-primary-500 dark:bg-primary-900/20 dark:border-primary-400 shadow-sm'
                      : 'bg-white border border-gray-200 hover:border-primary-200 dark:bg-dark-100 dark:border-gray-700 dark:hover:border-primary-700'
                  }`}
                >
                  <div className="flex items-center">
                    <div 
                      className={`h-5 w-5 rounded-full border flex-shrink-0 flex items-center justify-center mr-3 ${
                        formData.preferredRoleplay === 'custom' 
                          ? 'border-primary-500 bg-primary-500' 
                          : 'border-gray-300 bg-white dark:border-gray-500 dark:bg-dark-300'
                      }`}
                    >
                      {formData.preferredRoleplay === 'custom' && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Custom Scenario</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create your own call type</p>
                    </div>
                  </div>
                </div>
                
                {formData.preferredRoleplay === 'custom' && (
                  <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 mt-4">
                    <div>
                      <label htmlFor="customRoleplayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Name of Service {formErrors.customRoleplayName && <span className="text-xs text-red-600 dark:text-red-400 ml-1">Required</span>}
                      </label>
                      <input
                        type="text"
                        id="customRoleplayName"
                        name="customRoleplayName"
                        value={formData.customRoleplayName}
                        onChange={handleInputChange}
                        placeholder="e.g., Flower Delivery Service"
                        className={`block w-full rounded-md border ${formErrors.customRoleplayName ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'} 
                          bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500`}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="customRoleplayDetails" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description {formErrors.customRoleplayDetails && <span className="text-xs text-red-600 dark:text-red-400 ml-1">Required</span>}
                      </label>
                      <textarea
                        id="customRoleplayDetails"
                        name="customRoleplayDetails"
                        value={formData.customRoleplayDetails}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="How the conversation should flow"
                        className={`block w-full rounded-md border ${formErrors.customRoleplayDetails ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-gray-700'} 
                          bg-white dark:bg-dark-100 px-4 py-3 text-gray-900 dark:text-gray-100 shadow-sm focus:border-primary-500 focus:ring-primary-500`}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            
            {/* Tab Navigation Buttons */}
            <div className="mt-8 flex justify-between">
              {activeTab !== 'personal' && (
                <button
                  type="button"
                  onClick={handlePrevTab}
                  className="inline-flex items-center rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-400 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  &larr; Previous
                </button>
              )}
              
              {activeTab === 'personal' ? (
                <div></div> // Empty div to maintain flex layout
              ) : null}
              
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={saveProfile}
                  disabled={isLoading}
                  className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : isSaved ? (
                    <>
                      <CheckCircleIcon className="mr-2 h-4 w-4" />
                      Saved!
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </button>
                
                {activeTab === 'personal' && (
                  <button
                    type="button"
                    onClick={handleNextTab}
                    className="inline-flex items-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                  >
                    Next &rarr;
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {/* Bottom Navigation */}
          <div className="mt-6 flex justify-between items-center">
            <Link to="/" className="text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 flex items-center">
              <HomeIcon className="h-5 w-5 mr-1" />
              Back to Home
            </Link>
            
            {/* Progress Dots */}
            <div className="flex space-x-2">
              {['personal', 'roleplay'].map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`h-2.5 w-2.5 rounded-full ${
                    activeTab === tab 
                      ? 'bg-primary-500' 
                      : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                  }`}
                  aria-label={`Go to ${tab} tab`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 