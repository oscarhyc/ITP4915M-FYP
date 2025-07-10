import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

interface Recipe {
  id: string;
  name: string;
  ingredients: Array<{ name: string; quantity: string }>;
  instructions: string[];
  dietaryPreference: string[];
  likesCount: number;
  createdAt: string;
  user: {
    name: string;
  };
}

interface CollectionRecipe {
  id: string;
  addedAt: string;
  notes?: string;
  recipe: Recipe;
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  collectionRecipes: CollectionRecipe[];
  _count: {
    collectionRecipes: number;
  };
}

export default function CollectionDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [collection, setCollection] = useState<Collection | null>(null);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [removingRecipe, setRemovingRecipe] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchCollection();
    }
  }, [id]);

  const fetchCollection = async () => {
    if (!id || typeof id !== 'string') return;

    setLoadingCollection(true);
    try {
      const response = await axios.get<{success: boolean; collection: Collection}>(`/api/collections/${id}/recipes`);
      if (response.data.success) {
        setCollection(response.data.collection);
      } else {
        router.push('/collections');
      }
    } catch (error: any) {
      console.error('Failed to fetch collection:', error);
      if (error.response?.status === 404) {
        router.push('/collections');
      }
    } finally {
      setLoadingCollection(false);
    }
  };

  const handleRemoveRecipe = async (recipeId: string) => {
    if (!collection || removingRecipe) return;

    setRemovingRecipe(recipeId);
    try {
      const response = await axios.delete<{success: boolean; message?: string}>(
        `/api/collections/${collection.id}/recipes?recipeId=${recipeId}`
      );

      if (response.data.success) {
        // Remove the recipe from local state
        setCollection(prev => {
          if (!prev) return null;
          return {
            ...prev,
            collectionRecipes: prev.collectionRecipes.filter(cr => cr.recipe.id !== recipeId),
            _count: {
              collectionRecipes: prev._count.collectionRecipes - 1
            }
          };
        });
      }
    } catch (error: any) {
      console.error('Failed to remove recipe:', error);
      alert(error.response?.data?.message || 'Failed to remove recipe');
    } finally {
      setRemovingRecipe(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generateShoppingList = async (recipeId: string, recipeName: string) => {
    try {
      const response = await axios.post<{success: boolean; shoppingList: {id: string}; message?: string}>(
        `/api/recipes/${recipeId}/generate-shopping-list`, 
        {
          shoppingListName: `${recipeName} - Shopping List`
        }
      );

      if (response.data.success) {
        alert('Shopping list generated successfully!');
        router.push(`/shopping-lists/${response.data.shoppingList.id}`);
      }
    } catch (error: any) {
      console.error('Failed to generate shopping list:', error);
      alert(error.response?.data?.message || 'Failed to generate shopping list');
    }
  };

  if (loading || loadingCollection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!collection) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Collection Not Found</h1>
            <button
              onClick={() => router.push('/collections')}
              className="btn-primary"
            >
              Back to Collections
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{collection.name} - Collection Details</title>
        <meta name="description" content={`View recipes in collection "${collection.name}"`} />
      </Head>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push('/collections')}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                ← Back to Collections
              </button>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.name}</h1>
                {collection.description && (
                  <p className="text-gray-600 mb-4">{collection.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📚 {collection._count.collectionRecipes} recipes</span>
                  <span>📅 Created on {formatDate(collection.createdAt)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    collection.isPublic 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {collection.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipes Grid */}
          {collection.collectionRecipes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Collection is empty</h3>
              <p className="text-gray-500 mb-6">Start adding some recipes to this collection!</p>
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                Browse Recipes
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collection.collectionRecipes.map((collectionRecipe) => {
                const recipe = collectionRecipe.recipe;
                return (
                  <div
                    key={collectionRecipe.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                        {recipe.name}
                      </h3>
                      <button
                        onClick={() => handleRemoveRecipe(recipe.id)}
                        disabled={removingRecipe === recipe.id}
                        className="text-red-500 hover:text-red-700 text-sm disabled:opacity-50"
                        title="Remove from collection"
                      >
                        {removingRecipe === recipe.id ? 'Removing...' : '✕'}
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      Author: {recipe.user.name}
                    </p>

                    {recipe.dietaryPreference && recipe.dietaryPreference.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {recipe.dietaryPreference.slice(0, 3).map((pref, index) => (
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
                        {recipe.ingredients.slice(0, 3).map(ing => `${ing.quantity} ${ing.name}`).join(', ')}
                        {recipe.ingredients.length > 3 && '...'}
                      </p>
                    </div>

                    {collectionRecipe.notes && (
                      <div className="mb-3 p-2 bg-yellow-50 rounded">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">Notes:</span> {collectionRecipe.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>❤️ {recipe.likesCount} likes</span>
                      <span>Added on {formatDate(collectionRecipe.addedAt)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => generateShoppingList(recipe.id, recipe.name)}
                        className="btn-outline text-sm flex-1"
                      >
                        🛒 Generate Shopping List
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
