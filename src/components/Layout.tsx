import { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return null; // Will redirect to signin
  }

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/')}
                className="flex-shrink-0 flex items-center"
              >
                <span className="text-2xl">🍳</span>
                <span className="ml-2 text-xl font-bold text-gray-900">
                  Smart Recipe Generator
                </span>
              </button>
            </div>
            
            <div className="flex items-center space-x-6">
              <button
                onClick={() => router.push('/')}
                className={`text-sm font-medium transition-colors ${
                  isActive('/') 
                    ? 'text-orange-600 border-b-2 border-orange-600 pb-1' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Home
              </button>
              
              <button
                onClick={() => router.push('/generate')}
                className={`text-sm font-medium transition-colors ${
                  isActive('/generate') 
                    ? 'text-orange-600 border-b-2 border-orange-600 pb-1' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Generate Recipe
              </button>
              
              <button
                onClick={() => router.push('/forum')}
                className={`text-sm font-medium transition-colors ${
                  router.pathname.startsWith('/forum') 
                    ? 'text-orange-600 border-b-2 border-orange-600 pb-1' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Community Forum
              </button>
              
              <button
                onClick={() => router.push('/profile')}
                className={`text-sm font-medium transition-colors ${
                  isActive('/profile') 
                    ? 'text-orange-600 border-b-2 border-orange-600 pb-1' 
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Profile
              </button>
              
              <div className="flex items-center space-x-3 border-l border-gray-200 pl-6">
                <span className="text-sm text-gray-700">
                  Welcome, {user.name}!
                </span>
                <button
                  onClick={logout}
                  className="btn-outline text-sm"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}
