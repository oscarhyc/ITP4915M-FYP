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
      const response = await axios.get(`/api/collections/${id}/recipes`);
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
      const response = await axios.delete(`/api/collections/${collection.id}/recipes`, {
        data: { recipeId }
      });

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
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const generateShoppingList = async (recipeId: string, recipeName: string) => {
    try {
      const response = await axios.post(`/api/recipes/${recipeId}/generate-shopping-list`, {
        shoppingListName: `${recipeName} - 購物清單`
      });

      if (response.data.success) {
        alert('購物清單已成功生成！');
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
            <h1 className="text-2xl font-bold text-gray-900 mb-4">收藏夾未找到</h1>
            <button
              onClick={() => router.push('/collections')}
              className="btn-primary"
            >
              返回收藏夾列表
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>{collection.name} - 收藏夾詳情</title>
        <meta name="description" content={`查看收藏夾「${collection.name}」中的食譜`} />
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
                ← 返回收藏夾
              </button>
            </div>
            
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{collection.name}</h1>
                {collection.description && (
                  <p className="text-gray-600 mb-4">{collection.description}</p>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>📚 {collection._count.collectionRecipes} 個食譜</span>
                  <span>📅 創建於 {formatDate(collection.createdAt)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    collection.isPublic 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {collection.isPublic ? '公開' : '私人'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recipes Grid */}
          {collection.collectionRecipes.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">收藏夾是空的</h3>
              <p className="text-gray-500 mb-6">開始添加一些食譜到這個收藏夾吧！</p>
              <button
                onClick={() => router.push('/')}
                className="btn-primary"
              >
                瀏覽食譜
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
                        title="從收藏夾移除"
                      >
                        {removingRecipe === recipe.id ? '移除中...' : '✕'}
                      </button>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      作者: {recipe.user.name}
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
                      <p className="text-sm text-gray-600 mb-1">食材:</p>
                      <p className="text-sm text-gray-800 line-clamp-2">
                        {recipe.ingredients.slice(0, 3).map(ing => `${ing.quantity} ${ing.name}`).join(', ')}
                        {recipe.ingredients.length > 3 && '...'}
                      </p>
                    </div>

                    {collectionRecipe.notes && (
                      <div className="mb-3 p-2 bg-yellow-50 rounded">
                        <p className="text-sm text-gray-700">
                          <span className="font-medium">筆記:</span> {collectionRecipe.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>❤️ {recipe.likesCount} 個讚</span>
                      <span>收藏於 {formatDate(collectionRecipe.addedAt)}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => generateShoppingList(recipe.id, recipe.name)}
                        className="btn-outline text-sm flex-1"
                      >
                        🛒 生成購物清單
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
