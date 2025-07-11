import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

interface Recipe {
  _id: string;
  name: string;
  ingredients: Array<{ name: string; quantity: string }>;
  instructions: string[];
  dietaryPreference: string[];
  createdAt: string;
}

export default function Profile() {
  const { user, loading, updateUser } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'recipes'>('profile');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  
  // Profile form state
  const [name, setName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    } else if (user) {
      setName(user.name);
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user && activeTab === 'recipes') {
      fetchUserRecipes();
    }
  }, [user, activeTab]);

  const fetchUserRecipes = async () => {
    setLoadingRecipes(true);
    try {
      const response = await axios.get('/api/recipes/user');
      setRecipes(response.data.recipes || []);
    } catch (error) {
      console.error('Failed to fetch recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsUpdating(true);

    try {
      const updateData: any = { name };
      
      // Only include password fields if user wants to change password
      if (currentPassword && newPassword) {
        if (newPassword !== confirmPassword) {
          setError('New passwords do not match');
          setIsUpdating(false);
          return;
        }
        
        if (newPassword.length < 8) {
          setError('New password must be at least 8 characters long');
          setIsUpdating(false);
          return;
        }
        
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
      }

      const response = await axios.put('/api/user/profile', updateData);
      
      if (response.data.success) {
        setMessage('Profile updated successfully');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Update user context if name changed
        if (updateData.name !== user?.name) {
          updateUser({ ...user!, name: updateData.name });
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to update profile');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Head>
        <title>Profile - Smart Recipe Generator</title>
        <meta name="description" content="Manage your profile and recipe history" />
      </Head>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Profile</h1>
            
            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'profile'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Profile Settings
                </button>
                <button
                  onClick={() => setActiveTab('recipes')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'recipes'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Recipe History
                </button>
              </nav>
            </div>

            {/* Profile Settings Tab */}
            {activeTab === 'profile' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Profile Settings</h2>
                
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={user.email}
                      className="input-field bg-gray-50"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                    <p className="text-sm text-gray-600 mb-4">Leave blank if you don&apos;t want to change your password</p>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Current Password
                        </label>
                        <input
                          type="password"
                          id="currentPassword"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="input-field"
                        />
                      </div>

                      <div>
                        <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          New Password
                        </label>
                        <input
                          type="password"
                          id="newPassword"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="input-field"
                          minLength={8}
                        />
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                          Confirm New Password
                        </label>
                        <input
                          type="password"
                          id="confirmPassword"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="input-field"
                          minLength={8}
                        />
                      </div>
                    </div>
                  </div>

                  {message && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm text-green-700">{message}</p>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isUpdating ? 'Updating...' : 'Update Profile'}
                  </button>
                </form>
              </div>
            )}

            {/* Recipe History Tab */}
            {activeTab === 'recipes' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Recipe History</h2>
                
                {loadingRecipes ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner"></div>
                    <span className="ml-3 text-gray-600">Loading recipes...</span>
                  </div>
                ) : recipes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No recipes generated yet.</p>
                    <button
                      onClick={() => router.push('/generate')}
                      className="btn-primary mt-4"
                    >
                      Generate Your First Recipe
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recipes.map((recipe) => (
                      <div key={recipe._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="text-lg font-medium text-gray-900">{recipe.name}</h3>
                          <span className="text-sm text-gray-500">{formatDate(recipe.createdAt)}</span>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">Ingredients:</p>
                          <p className="text-sm text-gray-800">
                            {recipe.ingredients.map(ing => `${ing.quantity} ${ing.name}`).join(', ')}
                          </p>
                        </div>
                        
                        {recipe.dietaryPreference.length > 0 && (
                          <div className="mb-3">
                            <p className="text-sm text-gray-600 mb-1">Dietary Preferences:</p>
                            <div className="flex flex-wrap gap-1">
                              {recipe.dietaryPreference.map((pref, index) => (
                                <span
                                  key={index}
                                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {pref}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-sm text-gray-700">
                          <p className="font-medium mb-1">Instructions:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            {recipe.instructions.slice(0, 3).map((instruction, index) => (
                              <li key={index}>{instruction}</li>
                            ))}
                            {recipe.instructions.length > 3 && (
                              <li className="text-gray-500">... and {recipe.instructions.length - 3} more steps</li>
                            )}
                          </ol>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
      </div>
    </Layout>
  );
}
