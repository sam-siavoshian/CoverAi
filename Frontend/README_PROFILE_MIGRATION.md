# Profile Migration from LocalStorage to Supabase

This document provides instructions for migrating user profile data from localStorage to Supabase.

## Migration Steps

1. **Create the profiles table in Supabase**

   Run the SQL commands in `create_profiles_table.sql` in the Supabase SQL Editor.
   
   1. Log in to your Supabase dashboard
   2. Go to SQL Editor
   3. Create a new query
   4. Paste the contents of `create_profiles_table.sql`
   5. Run the query

2. **Test the migration**

   After deploying the updated code with Supabase integration, users will need to log in to see their profiles. The app will automatically create a new profile entry in Supabase when they save their profile.

## Implementation Details

- Profile data is now stored in a `profiles` table in Supabase
- Each profile is linked to a user account via the `user_id`
- Row-level security ensures users can only access their own profile data
- The profile data is stored as JSON in the `profile_data` column
- User interface preferences (tooltips, auto-save) are still stored in localStorage

## Features

- **User Isolation**: Each user can only see and edit their own profile
- **Automatic Migration**: No manual data migration needed
- **Real-time Updates**: Profile changes are stored in real-time
- **Secure Access**: Row-level security policies protect user data

## Troubleshooting

If users experience any issues:

1. Ensure they are properly authenticated (logged in)
2. Check the browser console for any error messages
3. Verify the `profiles` table exists in Supabase
4. Confirm row-level security policies are active 