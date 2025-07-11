import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import axios from 'axios';

interface Collection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  createdAt: string;
  _count: {
    collectionRecipes: number;
  };
}

export default function Collections() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: '',
    description: '',
    isPublic: false
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
      fetchCollections();
    }
  }, [user]);

  const fetchCollections = async () => {
    setLoadingCollections(true);
    try {
      const response = await axios.get('/api/collections');
      if (response.data.success) {
        setCollections(response.data.collections || []);
      }
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    } finally {
      setLoadingCollections(false);
    }
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollection.name.trim()) return;

    setCreating(true);
    try {
      const response = await axios.post('/api/collections', {
        name: newCollection.name.trim(),
        description: newCollection.description.trim() || undefined,
        isPublic: newCollection.isPublic
      });

      if (response.data.success) {
        setCollections(prev => [response.data.collection, ...prev]);
        setNewCollection({ name: '', description: '', isPublic: false });
        setShowCreateForm(false);
      }
    } catch (error: any) {
      console.error('Failed to create collection:', error);
      alert(error.response?.data?.message || 'Failed to create collection');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCollection = async (collectionId: string, collectionName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering card click event
    
    if (!confirm(`Are you sure you want to delete collection "${collectionName}"? This will also delete all recipes in the collection and cannot be undone.`)) {
      return;
    }

    setDeletingId(collectionId);
    try {
      const response = await axios.delete(`/api/collections?id=${collectionId}`);
      
      if (response.data.success) {
        setCollections(prev => prev.filter(collection => collection.id !== collectionId));
      } else {
        alert(response.data.message || 'Failed to delete collection');
      }
    } catch (error: any) {
      console.error('Failed to delete collection:', error);
      alert(error.response?.data?.message || 'Failed to delete collection');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
        <title>My Collections - Smart Recipe Generator</title>
        <meta name="description" content="Manage your recipe collections" />
      </Head>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Collections</h1>
              <p className="text-gray-600 mt-2">Organize and manage your favorite recipes</p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="btn-primary"
            >
              ➕ New Collection
            </button>
          </div>

          {/* Create Collection Form */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-semibold mb-4">Create New Collection</h2>
                <form onSubmit={handleCreateCollection}>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collection Name *
                    </label>
                    <input
                      type="text"
                      value={newCollection.name}
                      onChange={(e) => setNewCollection(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Breakfast Recipes"
                      required
                    />
                  </div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newCollection.description}
                      onChange={(e) => setNewCollection(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      rows={3}
                      placeholder="Describe the purpose of this collection..."
                    />
                  </div>
                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newCollection.isPublic}
                        onChange={(e) => setNewCollection(prev => ({ ...prev, isPublic: e.target.checked }))}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Public Collection</span>
                    </label>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(false)}
                      className="btn-outline flex-1"
                      disabled={creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex-1"
                      disabled={creating || !newCollection.name.trim()}
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Collections Grid */}
          {loadingCollections ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner"></div>
              <span className="ml-3 text-gray-600">Loading collections...</span>
            </div>
          ) : collections.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No collections yet</h3>
              <p className="text-gray-500 mb-6">Create your first collection to organize recipes</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="btn-primary"
              >
                Create Collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {collections.map((collection) => (
                <div
                  key={collection.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer relative"
                  onClick={() => router.push(`/collections/${collection.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate pr-8">
                      {collection.name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      {collection.isPublic && (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Public
                        </span>
                      )}
                      <button
                        onClick={(e) => handleDeleteCollection(collection.id, collection.name, e)}
                        disabled={deletingId === collection.id}
                        className="text-red-500 hover:text-red-700 p-1 rounded transition-colors disabled:opacity-50"
                        title="Delete Collection"
                      >
                        {deletingId === collection.id ? '⏳' : '🗑️'}
                      </button>
                    </div>
                  </div>
                  
                  {collection.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {collection.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>
                      {collection._count.collectionRecipes} recipes
                    </span>
                    <span>
                      {formatDate(collection.createdAt)}
                    </span>
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
