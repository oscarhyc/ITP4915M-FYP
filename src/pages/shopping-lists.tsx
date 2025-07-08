import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  createdAt: string;
  _count: {
    items: number;
  };
}

export default function ShoppingLists() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [shoppingLists, setShoppingLists] = useState<ShoppingList[]>([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newList, setNewList] = useState({
    name: '',
    description: ''
  });
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchShoppingLists();
    }
  }, [user]);

  const fetchShoppingLists = async () => {
    setLoadingLists(true);
    try {
      const response = await axios.get('/api/shopping-lists');
      if (response.data.success) {
        setShoppingLists(response.data.shoppingLists || []);
      }
    } catch (error) {
      console.error('Failed to fetch shopping lists:', error);
    } finally {
      setLoadingLists(false);
    }
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newList.name.trim()) return;

    setCreating(true);
    try {
      const response = await axios.post('/api/shopping-lists', {
        name: newList.name.trim(),
        description: newList.description.trim() || undefined
      });

      if (response.data.success) {
        setShoppingLists(prev => [response.data.shoppingList, ...prev]);
        setNewList({ name: '', description: '' });
        setShowCreateForm(false);
      }
    } catch (error: any) {
      console.error('Failed to create shopping list:', error);
      alert(error.response?.data?.message || 'Failed to create shopping list');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = async (listId: string, listName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止觸發卡片點擊事件
    
    if (!confirm(`確定要刪除購物清單「${listName}」嗎？此操作無法撤銷。`)) {
      return;
    }

    setDeletingId(listId);
    try {
      const response = await axios.delete(`/api/shopping-lists?id=${listId}`);
      
      if (response.data.success) {
        setShoppingLists(prev => prev.filter(list => list.id !== listId));
      } else {
        alert(response.data.message || 'Failed to delete shopping list');
      }
    } catch (error: any) {
      console.error('Failed to delete shopping list:', error);
      alert(error.response?.data?.message || 'Failed to delete shopping list');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getCompletionStatus = (list: ShoppingList) => {
    if (list.isCompleted) {
      return { text: '已完成', color: 'bg-green-100 text-green-800' };
    }
    return { text: '進行中', color: 'bg-blue-100 text-blue-800' };
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
        <title>智能購物清單 - Smart Recipe Generator</title>
        <meta name="description" content="管理您的智能購物清單" />
      </Head>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">智能購物清單</h1>
              <p className="text-gray-600 mt-2">從食譜自動生成購物清單，讓購物更輕鬆</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              🛒 新建購物清單
            </button>
          </div>

          {/* Create Shopping List Form */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-semibold mb-4">創建新購物清單</h2>
                <form onSubmit={handleCreateList}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      購物清單名稱 *
                    </label>
                    <input
                      type="text"
                      value={newList.name}
                      onChange={(e) => setNewList(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="例如：週末採購清單"
                      required
                    />
                  </div>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      描述
                    </label>
                    <textarea
                      value={newList.description}
                      onChange={(e) => setNewList(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      placeholder="描述這個購物清單的用途..."
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn-outline flex-1"
                      disabled={creating}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={creating || !newList.name.trim()}
                    >
                      {creating ? '創建中...' : '創建'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Shopping Lists Grid */}
          {loadingLists ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">載入購物清單中...</span>
            </div>
          ) : shoppingLists.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">還沒有購物清單</h3>
              <p className="text-gray-500 mb-6">創建您的第一個購物清單，或從食譜自動生成</p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  手動創建
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="btn-outline"
                >
                  瀏覽食譜
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shoppingLists.map((list) => {
                const status = getCompletionStatus(list);
                return (
                  <div
                    key={list.id}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer relative"
                    onClick={() => router.push(`/shopping-lists/${list.id}`)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 truncate pr-8">
                        {list.name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${status.color}`}>
                          {status.text}
                        </span>
                        <button
                          onClick={(e) => handleDeleteList(list.id, list.name, e)}
                          disabled={deletingId === list.id}
                          className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50"
                          title="刪除購物清單"
                        >
                          {deletingId === list.id ? '⏳' : '🗑️'}
                        </button>
                      </div>
                    </div>
                    
                    {list.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {list.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="flex items-center">
                        <span className="mr-1">📝</span>
                        {list._count.items} 個項目
                      </span>
                      <span>
                        {formatDate(list.createdAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tips Section */}
          {shoppingLists.length > 0 && (
            <div className="mt-12 bg-blue-50 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">💡 小貼士</h3>
              <ul className="text-blue-800 space-y-2">
                <li>• 在食譜頁面點擊「生成購物清單」可以自動創建購物清單</li>
                <li>• 購物清單會自動按食材分類整理，讓購物更有效率</li>
                <li>• 可以調整份量來生成不同人數的購物清單</li>
                <li>• 完成購買後記得勾選項目，追蹤購物進度</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
