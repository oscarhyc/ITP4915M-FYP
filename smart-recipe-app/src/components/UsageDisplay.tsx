import { useRouter } from 'next/router';

interface UsageDisplayProps {
  usesRemaining: number;
  showEarnMore?: boolean;
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export default function UsageDisplay({ 
  usesRemaining, 
  showEarnMore = true, 
  size = 'medium',
  className = '' 
}: UsageDisplayProps) {
  const router = useRouter();

  const sizeClasses = {
    small: 'px-3 py-1 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  const getStatusColor = () => {
    if (usesRemaining === 0) return 'bg-red-50 border-red-200 text-red-600';
    if (usesRemaining <= 2) return 'bg-yellow-50 border-yellow-200 text-yellow-600';
    return 'bg-blue-50 border-blue-200 text-blue-600';
  };

  const getWarningIcon = () => {
    if (usesRemaining === 0) return '🚫';
    if (usesRemaining <= 2) return '⚠️';
    return '📸';
  };

  return (
    <div className={`inline-flex items-center border rounded-lg font-medium ${sizeClasses[size]} ${getStatusColor()} ${className}`}>
      <span className="mr-2">{getWarningIcon()}</span>
      <span>
        {usesRemaining} AI Camera use{usesRemaining !== 1 ? 's' : ''} remaining
      </span>
      {usesRemaining <= 2 && showEarnMore && (
        <button
          onClick={() => router.push('/forum')}
          className="ml-3 text-xs underline hover:no-underline"
        >
          Earn More
        </button>
      )}
    </div>
  );
}

interface EarnMorePromptProps {
  usesRemaining: number;
  variant?: 'compact' | 'detailed';
  className?: string;
}

export function EarnMorePrompt({ 
  usesRemaining, 
  variant = 'detailed',
  className = '' 
}: EarnMorePromptProps) {
  const router = useRouter();

  if (usesRemaining > 3) return null;

  if (variant === 'compact') {
    return (
      <div className={`bg-green-50 border border-green-200 rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-green-600 mr-2">💡</span>
            <span className="text-green-800 text-sm font-medium">
              Earn more uses in Community Forum
            </span>
          </div>
          <button
            onClick={() => router.push('/forum')}
            className="text-green-600 text-sm underline hover:no-underline"
          >
            Visit Forum
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-green-50 border border-green-200 rounded-lg p-4 ${className}`}>
      <h3 className="text-green-800 font-medium mb-2 flex items-center">
        <span className="mr-2">💡</span>
        Earn More AI Camera Uses
      </h3>
      <p className="text-green-700 text-sm mb-3">
        Engage with our Community Forum to earn additional uses:
      </p>
      <div className="text-green-700 text-sm space-y-1 mb-4">
        <div className="flex items-center">
          <span className="mr-2">•</span>
          <span>+1 use for each post you create</span>
        </div>
        <div className="flex items-center">
          <span className="mr-2">•</span>
          <span>+1 use for each like you give to others&apos; posts</span>
        </div>
      </div>
      <button
        onClick={() => router.push('/forum')}
        className="btn-outline text-sm"
      >
        Visit Community Forum
      </button>
    </div>
  );
}

interface NoUsesWarningProps {
  className?: string;
}

export function NoUsesWarning({ className = '' }: NoUsesWarningProps) {
  const router = useRouter();

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 text-center ${className}`}>
      <div className="text-4xl mb-3">🚫</div>
      <h3 className="text-red-800 font-medium mb-2">
        No AI Camera Uses Remaining
      </h3>
      <p className="text-red-700 text-sm mb-4">
        You&apos;ve used all your AI Camera analyses. Engage with the Community Forum to earn more!
      </p>
      <div className="space-y-2">
        <button
          onClick={() => router.push('/forum')}
          className="btn-primary text-sm w-full"
        >
          Earn More Uses in Community Forum
        </button>
        <div className="text-red-600 text-xs">
          +1 use per post created • +1 use per like given
        </div>
      </div>
    </div>
  );
}

interface GuestUpgradePromptProps {
  feature: string;
  benefits?: string[];
  className?: string;
}

export function GuestUpgradePrompt({ 
  feature, 
  benefits = ['5 free AI Camera uses', 'Create and like forum posts', 'Save recipe history'],
  className = '' 
}: GuestUpgradePromptProps) {
  const router = useRouter();

  return (
    <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center ${className}`}>
      <div className="text-6xl mb-4">🔒</div>
      <h2 className="text-xl font-semibold text-yellow-800 mb-2">
        Sign Up Required
      </h2>
      <p className="text-yellow-700 mb-4">
        {feature} is available to registered users only.
      </p>
      <div className="bg-white rounded-lg p-4 mb-4">
        <h3 className="text-yellow-800 font-medium mb-2">What you&apos;ll get:</h3>
        <ul className="text-yellow-700 text-sm space-y-1">
          {benefits.map((benefit, index) => (
            <li key={index} className="flex items-center justify-center">
              <span className="text-green-500 mr-2">✓</span>
              {benefit}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-x-3">
        <button
          onClick={() => router.push('/auth/register')}
          className="btn-primary"
        >
          Sign Up Now
        </button>
        <button
          onClick={() => router.push('/auth/signin')}
          className="btn-outline"
        >
          Sign In
        </button>
      </div>
    </div>
  );
}

interface UsageStatsProps {
  usesRemaining: number;
  totalEarned?: number;
  className?: string;
}

export function UsageStats({ 
  usesRemaining, 
  totalEarned = 0,
  className = '' 
}: UsageStatsProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-3">AI Camera Usage</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{usesRemaining}</div>
          <div className="text-sm text-gray-600">Uses Remaining</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalEarned}</div>
          <div className="text-sm text-gray-600">Total Earned</div>
        </div>
      </div>
      <div className="mt-4 bg-gray-200 rounded-full h-2">
        <div 
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${Math.min((usesRemaining / 10) * 100, 100)}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">
        Progress towards next milestone
      </div>
    </div>
  );
}
