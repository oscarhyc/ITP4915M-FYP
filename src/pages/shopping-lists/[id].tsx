import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../../contexts/AuthContext';
import Layout from '../../components/Layout';
import axios from 'axios';

interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category?: string;
  isCompleted: boolean;
  estimatedPrice?: number;
  notes?: string;
  createdAt: string;
  sourceRecipe?: {
    id: string;
    name: string;
  };
}

interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  createdAt: string;
  items: ShoppingListItem[];
  _count: {
    items: number;
  };
}

const FOOD_CATEGORIES = [
  'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Dairy', 
  'Seasonings', 'Grains', 'Snacks', 'Beverages', 'Frozen Foods', 'Others'
];

export default function ShoppingListDetail() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null);
  const [loadingList, setLoadingList] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({
    name: '',
    quantity: '',
    unit: '',
    category: 'Others',
    estimatedPrice: '',
    notes: ''
  });
  const [adding, setAdding] = useState(false);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (id && typeof id === 'string') {
      fetchShoppingList();
    }
  }, [id]);

  const fetchShoppingList = async () => {
    if (!id || typeof id !== 'string') return;

    setLoadingList(true);
    try {
      const response = await axios.get(`/api/shopping-lists/${id}/items`);
      if (response.data.success) {
        // Get shopping list info from the first item or make another API call
        const itemsResponse = response.data.items;
        
        // For now, we'll create a mock shopping list object
        // In a real implementation, you'd want to modify the API to return the shopping list info
        const mockShoppingList: ShoppingList = {
          id: id,
          name: 'Shopping List',
          description: '',
          isCompleted: false,
          createdAt: new Date().toISOString(),
          items: itemsResponse || [],
          _count: {
            items: itemsResponse?.length || 0
          }
        };
        
        setShoppingList(mockShoppingList);
      } else {
        router.push('/shopping-lists');
      }
    } catch (error: any) {
      console.error('Failed to fetch shopping list:', error);
      if (error.response?.status === 404) {
        router.push('/shopping-lists');
      }
    } finally {
      setLoadingList(false);
    }
  };

  const updateShoppingListStatus = async (listId: string, isCompleted: boolean) => {
    try {
      await axios.put(`/api/shopping-lists?id=${listId}`, {
        isCompleted
      });
    } catch (error) {
      console.error('Failed to update shopping list status:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.quantity.trim() || !shoppingList) return;

    setAdding(true);
    try {
      const response = await axios.post(`/api/shopping-lists/${shoppingList.id}/items`, {
        name: newItem.name.trim(),
        quantity: newItem.quantity.trim(),
        unit: newItem.unit.trim() || undefined,
        category: newItem.category,
        estimatedPrice: newItem.estimatedPrice ? parseFloat(newItem.estimatedPrice) : undefined,
        notes: newItem.notes.trim() || undefined
      });

      if (response.data.success) {
        setShoppingList(prev => {
          if (!prev) return null;
          return {
            ...prev,
            items: [...prev.items, response.data.item],
            _count: {
              items: prev._count.items + 1
            }
          };
        });
        setNewItem({
          name: '',
          quantity: '',
          unit: '',
          category: 'Others',
          estimatedPrice: '',
          notes: ''
        });
        setShowAddForm(false);
      }
    } catch (error: any) {
      console.error('Failed to add item:', error);
      alert(error.response?.data?.message || 'Failed to add item');
    } finally {
      setAdding(false);
    }
  };

  const handleToggleComplete = useCallback(async (itemId: string, currentStatus: boolean) => {
    if (updatingItems.has(itemId)) return;

    console.log('Toggling item:', itemId, 'from', currentStatus, 'to', !currentStatus);
    
    setUpdatingItems(prev => new Set(prev).add(itemId));
    try {
      const response = await axios.put(`/api/shopping-lists/${id}/items?itemId=${itemId}`, {
        isCompleted: !currentStatus
      });

      console.log('Toggle response:', response.data);

      if (response.data.success) {
        setShoppingList(prev => {
          if (!prev) return null;
          const updatedItems = prev.items.map(item =>
            item.id === itemId
              ? { ...item, isCompleted: !currentStatus }
              : item
          );
          
          // Check if all items are completed
          const allCompleted = updatedItems.length > 0 && updatedItems.every(item => item.isCompleted);
          
          // Update shopping list completion status in database if it changed
          if (allCompleted !== prev.isCompleted) {
            updateShoppingListStatus(prev.id, allCompleted);
          }
          
          return {
            ...prev,
            items: updatedItems,
            isCompleted: allCompleted
          };
        });
      } else {
        console.error('Toggle failed:', response.data.message);
        alert(response.data.message || 'Failed to update item');
      }
    } catch (error: any) {
      console.error('Failed to update item:', error);
      alert(error.response?.data?.message || 'Failed to update item');
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  }, [id, updatingItems]);

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const response = await axios.delete(`/api/shopping-lists/${id}/items?itemId=${itemId}`);

      if (response.data.success) {
        setShoppingList(prev => {
          if (!prev) return null;
          const updatedItems = prev.items.filter(item => item.id !== itemId);
          
          // Check if all remaining items are completed
          const allCompleted = updatedItems.length > 0 && updatedItems.every(item => item.isCompleted);
          
          // Update shopping list completion status in database if it changed
          if (allCompleted !== prev.isCompleted) {
            updateShoppingListStatus(prev.id, allCompleted);
          }
          
          return {
            ...prev,
            items: updatedItems,
            isCompleted: allCompleted,
            _count: {
              items: prev._count.items - 1
            }
          };
        });
      }
    } catch (error: any) {
      console.error('Failed to delete item:', error);
      alert(error.response?.data?.message || 'Failed to delete item');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const groupItemsByCategory = (items: ShoppingListItem[]) => {
    const grouped: { [key: string]: ShoppingListItem[] } = {};
    
    items.forEach(item => {
      const category = item.category || 'Others';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });

    return grouped;
  };

  const getCompletionStats = () => {
    if (!shoppingList) return { completed: 0, total: 0, percentage: 0 };
    
    const completed = shoppingList.items.filter(item => item.isCompleted).length;
    const total = shoppingList.items.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { completed, total, percentage };
  };

  if (loading || loadingList) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!shoppingList) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Shopping List Not Found</h1>
            <button
              onClick={() => router.push('/shopping-lists')}
              className="btn-primary"
            >
              Back to Shopping Lists
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  const stats = getCompletionStats();
  const groupedItems = groupItemsByCategory(shoppingList.items);

  return (
    <Layout>
      <Head>
        <title>{shoppingList.name} - Shopping List Details</title>
        <meta name="description" content={`View details of shopping list "${shoppingList.name}"`} />
      </Head>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center mb-4">
              <button
                onClick={() => router.push('/shopping-lists')}
                className="text-gray-500 hover:text-gray-700 mr-4"
              >
                ← Back to Shopping Lists
              </button>
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{shoppingList.name}</h1>
                {shoppingList.description && (
                  <p className="text-gray-600 mb-4">{shoppingList.description}</p>
                )}
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                ➕ Add Item
              </button>
            </div>

            {/* Progress Bar */}
            <div className="bg-white rounded-lg p-4 border border-gray-200 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Shopping Progress</span>
                <span className="text-sm text-gray-500">{stats.completed}/{stats.total} items</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${stats.percentage}%` }}
                ></div>
              </div>
              <div className="text-center mt-2">
                <span className="text-lg font-semibold text-green-600">{stats.percentage}% Complete</span>
              </div>
            </div>
          </div>

          {/* Add Item Form */}
          {showAddForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-semibold mb-4">Add Shopping Item</h2>
                <form onSubmit={handleAddItem}>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Item Name *
                      </label>
                      <input
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., Apple"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Quantity *
                      </label>
                      <input
                        type="text"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem(prev => ({ ...prev, quantity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., 2"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={newItem.unit}
                        onChange={(e) => setNewItem(prev => ({ ...prev, unit: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., pieces, kg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {FOOD_CATEGORIES.map(category => (
                          <option key={category} value={category}>{category}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Estimated Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItem.estimatedPrice}
                      onChange={(e) => setNewItem(prev => ({ ...prev, estimatedPrice: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., 25.50"
                    />
                  </div>

                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={newItem.notes}
                      onChange={(e) => setNewItem(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={2}
                      placeholder="Shopping notes..."
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="btn-outline flex-1"
                      disabled={adding}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={adding || !newItem.name.trim() || !newItem.quantity.trim()}
                    >
                      {adding ? 'Adding...' : 'Add'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Shopping List Items */}
          {shoppingList.items.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🛒</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Shopping list is empty</h3>
              <p className="text-gray-500 mb-6">Start adding some shopping items!</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn-primary"
              >
                Add First Item
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedItems).map(([category, items]) => (
                <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <span className="mr-2">
                      {category === 'Vegetables' && '🥬'}
                      {category === 'Fruits' && '🍎'}
                      {category === 'Meat' && '🥩'}
                      {category === 'Seafood' && '🐟'}
                      {category === 'Dairy' && '🥛'}
                      {category === 'Seasonings' && '🧂'}
                      {category === 'Grains' && '🌾'}
                      {category === 'Snacks' && '🍿'}
                      {category === 'Beverages' && '🥤'}
                      {category === 'Frozen Foods' && '🧊'}
                      {category === 'Others' && '📦'}
                    </span>
                    {category} ({items.length})
                  </h3>
                  
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          item.isCompleted 
                            ? 'bg-green-50 border-green-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <button
                            onClick={() => handleToggleComplete(item.id, item.isCompleted)}
                            disabled={updatingItems.has(item.id)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              item.isCompleted
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            } disabled:opacity-50`}
                          >
                            {item.isCompleted && '✓'}
                          </button>
                          
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className={`font-medium ${
                                item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}>
                                {item.name}
                              </span>
                              <span className={`text-sm ${
                                item.isCompleted ? 'text-gray-400' : 'text-gray-600'
                              }`}>
                                {item.quantity}{item.unit && ` ${item.unit}`}
                              </span>
                              {item.estimatedPrice && (
                                <span className="text-sm text-green-600 font-medium">
                                  ${item.estimatedPrice}
                                </span>
                              )}
                            </div>
                            
                            {item.notes && (
                              <p className="text-sm text-gray-500 mt-1">{item.notes}</p>
                            )}
                            
                            {item.sourceRecipe && (
                              <p className="text-xs text-blue-600 mt-1">
                                From recipe: {item.sourceRecipe.name}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-red-500 hover:text-red-700 text-sm ml-4"
                          title="Delete Item"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
