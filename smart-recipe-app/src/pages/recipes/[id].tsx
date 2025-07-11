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
  isLikedByCurrentUser: boolean;
  createdAt: string;
  sharedAt?: string;
  user: {
    id: string;
    name: string;
  };
  additionalInformation?: any;
  tags?: string[];
}

interface Collection {
  id: string;
  name: string;
  description?: string;
  _count: {
    collectionRecipes: number;
  };
}

export default function RecipeDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [likingRecipe, setLikingRecipe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [savingToCollection, setSavingToCollection] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchRecipe();
    }
  }, [id]);

  const fetchRecipe = async () => {
    if (!id || typeof id !== 'string') return;

    setLoadingRecipe(true);
    setError(null);
    try {
      // Try to fetch from shared recipes first
      const response = await axios.get(`/api/recipes/shared?id=${id}`);
      if (response.data.success && response.data.recipe) {
        setRecipe(response.data.recipe);
      } else {
        setError('食譜未找到或無法訪問');
      }
    } catch (error: any) {
      console.error('Failed to fetch recipe:', error);
      if (error.response?.status === 404) {
        setError('食譜未找到');
      } else {
        setError('載入食譜時發生錯誤');
      }
    } finally {
      setLoadingRecipe(false);
    }
  };

  const handleLikeRecipe = async () => {
    if (!recipe || likingRecipe) return;

    setLikingRecipe(true);
    try {
      const response = await axios.post('/api/recipes/like', {
        recipeId: recipe.id,
        action: recipe.isLikedByCurrentUser ? 'unlike' : 'like',
      });

      if (response.data.success) {
        setRecipe(prev => prev ? {
          ...prev,
          isLikedByCurrentUser: !prev.isLikedByCurrentUser,
          likesCount: response.data.likesCount
        } : null);
      }
    } catch (error: any) {
      console.error('Like recipe error:', error);
      alert('操作失敗，請稍後再試');
    } finally {
      setLikingRecipe(false);
    }
  };

  const generateShoppingList = async () => {
    if (!recipe) return;

    try {
      const response = await axios.post(`/api/recipes/${recipe.id}/generate-shopping-list`, {
        shoppingListName: `${recipe.name} - 購物清單`
      });

      if (response.data.success) {
        alert('購物清單已成功生成！');
        router.push(`/shopping-lists/${response.data.shoppingList.id}`);
      }
    } catch (error: any) {
      console.error('Failed to generate shopping list:', error);
      alert(error.response?.data?.message || '生成購物清單失敗');
    }
  };

  const fetchCollections = async () => {
    try {
      const response = await axios.get('/api/collections');
      if (response.data.success) {
        setCollections(response.data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  const handleSaveToCollection = () => {
    fetchCollections();
    setShowSaveModal(true);
  };

  const saveRecipeToCollection = async (collectionId: string) => {
    if (!recipe || savingToCollection) return;

    setSavingToCollection(true);
    try {
      const response = await axios.post(`/api/collections/${collectionId}/recipes`, {
        recipeId: recipe.id
      });

      if (response.data.success) {
        alert('食譜已成功保存到收藏夾！');
        setShowSaveModal(false);
      } else {
        alert(response.data.message || '保存失敗');
      }
    } catch (error: any) {
      console.error('Failed to save recipe to collection:', error);
      alert(error.response?.data?.message || '保存食譜失敗');
    } finally {
      setSavingToCollection(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading || loadingRecipe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{error}</h1>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              返回首頁
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!recipe) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">食譜未找到</h1>
            <button
              onClick={() => router.push('/')}
              className="btn-primary"
            >
              返回首頁
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const isOwnRecipe = recipe.user.id === user.id;

  return (
    <Layout>
      <Head>
        <title>{recipe.name} - 食譜詳情</title>
        <meta name="description" content={`查看「${recipe.name}」的詳細食譜`} />
      </Head>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.back()}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                ← 返回
              </button>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{recipe.name}</h1>
                  <p className="text-gray-600 mb-2">作者: {recipe.user.name}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>📅 創建於 {formatDate(recipe.createdAt)}</span>
                    {recipe.sharedAt && (
                      <span>🌐 分享於 {formatDate(recipe.sharedAt)}</span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-3">
                  {!isOwnRecipe && (
                    <button
                      onClick={handleLikeRecipe}
                      disabled={likingRecipe}
                      className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        recipe.isLikedByCurrentUser
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      <span>{recipe.isLikedByCurrentUser ? '❤️' : '🤍'}</span>
                      <span>{likingRecipe ? '處理中...' : `${recipe.likesCount} 個讚`}</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleSaveToCollection}
                    className="btn-outline"
                  >
                    📚 保存到收藏夾
                  </button>
                  
                  <button
                    onClick={generateShoppingList}
                    className="btn-outline"
                  >
                    🛒 生成購物清單
                  </button>
                </div>
              </div>

              {/* Dietary Preferences */}
              {recipe.dietaryPreference && recipe.dietaryPreference.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">飲食偏好:</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.dietaryPreference.map((pref, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                      >
                        {pref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">標籤:</h3>
                  <div className="flex flex-wrap gap-2">
                    {recipe.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recipe Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Ingredients */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">🥘 食材清單</h2>
              <ul className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <li key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                    <span className="text-gray-800">{ingredient.name}</span>
                    <span className="text-gray-600 font-medium">{ingredient.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Instructions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">👨‍🍳 製作步驟</h2>
              <ol className="space-y-4">
                {recipe.instructions.map((instruction, index) => (
                  <li key={index} className="flex">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary-100 text-primary-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                      {index + 1}
                    </span>
                    <p className="text-gray-700 leading-relaxed">{instruction}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Additional Information */}
          {recipe.additionalInformation && Object.keys(recipe.additionalInformation).length > 0 && (
            <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">📝 額外資訊</h2>
              <div className="prose max-w-none">
                {Object.entries(recipe.additionalInformation).map(([key, value]) => (
                  <div key={key} className="mb-3">
                    <strong className="text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                    <span className="ml-2 text-gray-600">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-8 flex justify-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="btn-outline"
            >
              返回首頁
            </button>
            {!isOwnRecipe && (
              <button
                onClick={handleLikeRecipe}
                disabled={likingRecipe}
                className={`btn-primary ${recipe.isLikedByCurrentUser ? 'bg-red-600 hover:bg-red-700' : ''}`}
              >
                {recipe.isLikedByCurrentUser ? '❤️ 已按讚' : '🤍 按讚'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save to Collection Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-semibold mb-4">保存到收藏夾</h2>
            
            {collections.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">您還沒有任何收藏夾</p>
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    router.push('/collections');
                  }}
                  className="btn-primary"
                >
                  創建收藏夾
                </button>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() => saveRecipeToCollection(collection.id)}
                  >
                    <div>
                      <h3 className="font-medium text-gray-900">{collection.name}</h3>
                      {collection.description && (
                        <p className="text-sm text-gray-500 truncate">{collection.description}</p>
                      )}
                      <p className="text-xs text-gray-400">{collection._count.collectionRecipes} 個食譜</p>
                    </div>
                    <button
                      disabled={savingToCollection}
                      className="text-primary-600 hover:text-primary-700 disabled:opacity-50"
                    >
                      {savingToCollection ? '⏳' : '➕'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowSaveModal(false)}
                className="btn-outline flex-1"
                disabled={savingToCollection}
              >
                取消
              </button>
              <button
                onClick={() => {
                  setShowSaveModal(false);
                  router.push('/collections');
                }}
                className="btn-primary flex-1"
                disabled={savingToCollection}
              >
                管理收藏夾
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
