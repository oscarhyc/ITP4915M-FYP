import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [sharedRecipes, setSharedRecipes] = useState<any[]>([]);
  const [loadingRecipes, setLoadingRecipes] = useState(false);
  const [likingRecipes, setLikingRecipes] = useState<Set<string>>(new Set());
  const [userStats, setUserStats] = useState({
    recipesGenerated: 0,
    recipesSaved: 0,
    recipesLiked: 0,
    recipesShared: 0,
  });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetchSharedRecipes();
    fetchUserStats();

    // Listen for recipe shared events to refresh the list and stats
    const handleRecipeShared = () => {
      console.log('=== MAIN PAGE EVENT DEBUG ===');
      console.log('Received recipeShared event, refreshing data...');
      fetchSharedRecipes();
      fetchUserStats();
    };

    // Listen for recipe saved events to refresh stats
    const handleRecipeSaved = () => {
      console.log('Received recipeSaved event, refreshing stats...');
      fetchUserStats();
    };

    // Listen for localStorage changes (cross-tab communication)
    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage event received:', e.key, e.newValue);
      if (e.key === 'recipeSharedTimestamp') {
        console.log('Received storage event for recipe shared, timestamp:', e.newValue);
        handleRecipeShared();
      }
    };

    window.addEventListener('recipeShared', handleRecipeShared);
    window.addEventListener('recipeSaved', handleRecipeSaved);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('recipeShared', handleRecipeShared);
      window.removeEventListener('recipeSaved', handleRecipeSaved);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const fetchSharedRecipes = async () => {
    console.log('Fetching shared recipes...');
    setLoadingRecipes(true);
    try {
      const response = await axios.get('/api/recipes/shared');
      if (response.data.success) {
        console.log('Fetched shared recipes:', response.data.recipes?.length || 0);
        setSharedRecipes(response.data.recipes || []);
      }
    } catch (error) {
      console.error('Failed to fetch shared recipes:', error);
    } finally {
      setLoadingRecipes(false);
    }
  };

  const fetchUserStats = async () => {
    setLoadingStats(true);
    try {
      const response = await axios.get('/api/user/stats');
      if (response.data.success) {
        setUserStats(response.data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleLikeRecipe = async (recipeId: string, isCurrentlyLiked: boolean) => {
    if (likingRecipes.has(recipeId)) return; // Prevent multiple requests

    setLikingRecipes(prev => new Set(prev).add(recipeId));

    try {
      const response = await axios.post('/api/recipes/like', {
        recipeId,
        action: isCurrentlyLiked ? 'unlike' : 'like',
      });

      if (response.data.success) {
        // Update the recipe in the local state
        setSharedRecipes(prev => prev.map(recipe =>
          recipe.id === recipeId
            ? {
                ...recipe,
                isLikedByCurrentUser: !isCurrentlyLiked,
                likesCount: response.data.likesCount
              }
            : recipe
        ));
        // Refresh user stats to update likes count
        fetchUserStats();
      }
    } catch (error) {
      console.error('Like recipe error:', error);
    } finally {
      setLikingRecipes(prev => {
        const newSet = new Set(prev);
        newSet.delete(recipeId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to signin
  }

  return (
    <Layout>
      <Head>
        <title>Smart Recipe Generator - Local AI</title>
        <meta name="description" content="Generate personalized recipes using local AI" />
      </Head>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Welcome to Smart Recipe Generator
              </h1>
              <p className="text-xl text-gray-600 mb-8">
                Create personalized recipes using local AI with complete privacy
              </p>
              
              {/* Status Cards - Local AI section hidden */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="card text-center">
                  <div className="text-3xl mb-2">🔒</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Complete Privacy</h3>
                  <p className="text-gray-600">
                    All data processing happens locally - nothing leaves your network
                  </p>
                </div>

                <div className="card text-center">
                  <div className="text-3xl mb-2">📱</div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Easy to Use</h3>
                  <p className="text-gray-600">
                    Simple interface for generating and managing recipes
                  </p>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
                <button
                  onClick={() => router.push('/generate')}
                  className="btn-primary w-full sm:w-auto"
                >
                  Generate Recipe
                </button>
                <button className="btn-outline w-full sm:w-auto">
                  Browse Recipes
                </button>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
              {loadingStats ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                  <span className="ml-3 text-gray-600">Loading stats...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{userStats.recipesGenerated}</div>
                    <div className="text-sm text-gray-600">Recipes Generated</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{userStats.recipesSaved}</div>
                    <div className="text-sm text-gray-600">Recipes Saved</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{userStats.recipesLiked}</div>
                    <div className="text-sm text-gray-600">Recipes Liked</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary-600">{userStats.recipesShared}</div>
                    <div className="text-sm text-gray-600">Recipes Shared</div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Shared Recipes */}
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Community Shared Recipes</h2>
                <button
                  onClick={fetchSharedRecipes}
                  disabled={loadingRecipes}
                  className="btn-outline text-sm disabled:opacity-50"
                >
                  {loadingRecipes ? 'Refreshing...' : '🔄 Refresh'}
                </button>
              </div>

              {loadingRecipes ? (
                <div className="flex items-center justify-center py-8">
                  <div className="loading-spinner"></div>
                  <span className="ml-3 text-gray-600">Loading shared recipes...</span>
                </div>
              ) : sharedRecipes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🍽️</div>
                  <p className="text-gray-500">No shared recipes yet.</p>
                  <p className="text-gray-400 text-sm">Be the first to share a recipe!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sharedRecipes.map((recipe) => (
                    <div key={recipe._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-lg font-medium text-gray-900 truncate">{recipe.name}</h3>
                        <span className="text-xs text-gray-500 ml-2">{formatDate(recipe.sharedAt)}</span>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">By: {recipe.userName}</p>

                      {recipe.dietaryPreference && recipe.dietaryPreference.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {recipe.dietaryPreference.slice(0, 3).map((pref: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {pref}
                            </span>
                          ))}
                          {recipe.dietaryPreference.length > 3 && (
                            <span className="text-xs text-gray-500">+{recipe.dietaryPreference.length - 3} more</span>
                          )}
                        </div>
                      )}

                      <div className="mb-3">
                        <p className="text-sm text-gray-600 mb-1">Ingredients:</p>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {recipe.ingredients.slice(0, 3).map((ing: any) => `${ing.quantity} ${ing.name}`).join(', ')}
                          {recipe.ingredients.length > 3 && '...'}
                        </p>
                      </div>

                      <div className="text-sm text-gray-700 mb-3">
                        <p className="font-medium mb-1">Instructions:</p>
                        <p className="line-clamp-3">
                          {recipe.instructions.slice(0, 2).join(' ')}
                          {recipe.instructions.length > 2 && '...'}
                        </p>
                      </div>

                      {/* Like Button */}
                      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                        <div className="flex items-center space-x-2">
                          {!recipe.isOwnRecipe && (
                            <button
                              onClick={() => handleLikeRecipe(recipe.id, recipe.isLikedByCurrentUser)}
                              disabled={likingRecipes.has(recipe.id)}
                              className={`flex items-center space-x-1 px-3 py-1 rounded-full text-sm transition-colors ${
                                recipe.isLikedByCurrentUser
                                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              <span>{recipe.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
                              <span>{likingRecipes.has(recipe.id) ? 'Loading...' : (recipe.isLikedByCurrentUser ? 'Liked' : 'Like')}</span>
                            </button>
                          )}
                          <span className="text-sm text-gray-500">
                            {recipe.likesCount} {recipe.likesCount === 1 ? 'like' : 'likes'}
                          </span>
                        </div>
                        {recipe.isOwnRecipe && (
                          <span className="text-xs text-gray-500 italic">Your recipe</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* System Status - Hidden for better UX */}
          </div>
      </div>
    </Layout>
  );
}
