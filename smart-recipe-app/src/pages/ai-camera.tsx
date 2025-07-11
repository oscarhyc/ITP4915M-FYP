import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Image from 'next/image';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import UsageDisplay, { EarnMorePrompt, NoUsesWarning, GuestUpgradePrompt } from '../components/UsageDisplay';
import axios from 'axios';

interface DetectedIngredient {
  name: string;
  confidence: number;
}

interface AnalysisResult {
  success: boolean;
  ingredients?: DetectedIngredient[];
  message?: string;
}

export default function AICamera() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // State management
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usesRemaining, setUsesRemaining] = useState<number>(5);
  const [loadingUsage, setLoadingUsage] = useState(true);
  const [hasCheckedUsage, setHasCheckedUsage] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkUsage = useCallback(async () => {
    if (hasCheckedUsage) return; // Prevent multiple calls

    try {
      setHasCheckedUsage(true);
      const response = await axios.post('/api/user/ai-camera-usage', {
        action: 'check'
      });

      if (response.data.success) {
        setUsesRemaining(response.data.usesRemaining);
      }
    } catch (error) {
      console.error('Failed to check AI Camera usage:', error);
      setError('Failed to check usage limits. Please refresh the page.');
    } finally {
      setLoadingUsage(false);
    }
  }, [hasCheckedUsage]); // Include hasCheckedUsage dependency

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    } else if (!loading && user  && !hasCheckedUsage) {
      // Check AI Camera usage for authenticated users (only once)
      checkUsage();
    } else if (!loading) {
      // Guest users have no AI Camera access
      setLoadingUsage(false);
    }
  }, [user, loading, router, hasCheckedUsage, checkUsage]); // Include checkUsage dependency

  // Ensure component is mounted before allowing camera access
  useEffect(() => {
    setIsComponentMounted(true);

  }, []);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Check camera permissions
  const checkCameraPermissions = async (): Promise<boolean> => {
    try {
      if (!navigator.permissions) {
        console.log('Permissions API not supported, assuming permission granted');
        return true;
      }

      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log('Camera permission status:', permission.state);

      return permission.state === 'granted' || permission.state === 'prompt';
    } catch (error) {
      console.log('Error checking camera permissions:', error);
      // If we can't check permissions, assume they're available
      return true;
    }
  };

  // Detect if user is on mobile device
  const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Detect if user is on Android
  const isAndroidDevice = (): boolean => {
    return /Android/i.test(navigator.userAgent);
  };

  const handleOpenCamera = async () => {
    try {
      setError(null);
      setIsCameraLoading(true);
      console.log('=== CAMERA INITIALIZATION START ===');

      // Check if component is mounted
      if (!isComponentMounted) {
        throw new Error('Component not yet mounted');
      }
      console.log('✅ Component is mounted');

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device or browser.');
      }
      console.log('✅ MediaDevices API supported');

      // Check video element with retry mechanism
      let video = videoRef.current;
      let attempts = 0;
      const maxAttempts = 10;

      while (!video && attempts < maxAttempts) {
        console.log(`Waiting for video element... attempt ${attempts + 1}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        video = videoRef.current;
        attempts++;
      }

      if (!video) {
        throw new Error('Video element not available after waiting');
      }
      console.log('✅ Video element available');

      console.log('Device info:', {
        isMobile: isMobileDevice(),
        isAndroid: isAndroidDevice(),
        userAgent: navigator.userAgent,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });

      // Prioritize rear camera (environment) first, then fallback to any camera
      let stream: MediaStream;
      let constraints: MediaStreamConstraints;

      try {
        // First attempt: Rear camera with enhanced constraints
        constraints = {
          video: {
            facingMode: 'environment', // Rear camera
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 }
          },
          audio: false
        };

        console.log('Requesting rear camera with enhanced constraints...');
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Rear camera stream obtained successfully!');
      } catch (rearCameraError) {
        console.log('Enhanced rear camera failed, trying basic rear camera...');

        try {
          // Second attempt: Basic rear camera
          constraints = {
            video: { facingMode: 'environment' },
            audio: false
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Basic rear camera stream obtained successfully!');
        } catch (basicRearError) {
          console.log('Basic rear camera failed, trying any available camera...');

          // Final fallback: Any available camera
          constraints = {
            video: true,
            audio: false
          };

          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log('✅ Fallback camera stream obtained successfully!');
        }
      }

      console.log('Setting up video element...');

      // Set up video element with proper event handlers
      video.srcObject = stream;
      streamRef.current = stream;

      console.log('Video srcObject set, waiting for metadata...');

      // Wait for video metadata to load before playing
      await new Promise<void>((resolve, reject) => {
        const onLoadedMetadata = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          console.log(`✅ Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
          resolve();
        };

        const onError = () => {
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onError);
          console.log('❌ Video error during metadata loading');
          reject(new Error('Failed to load video metadata'));
        };

        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onError);

        // Start loading
        video.load();
      });

      console.log('Starting video playback...');
      await video.play();
      console.log('✅ Video playing successfully!');

      setIsCameraActive(true);
      console.log('=== CAMERA INITIALIZATION SUCCESS ===');

    } catch (err) {
      console.error('=== CAMERA INITIALIZATION ERROR ===', err);
      const error = err as any;
      const isAndroid = isAndroidDevice();

      // Detailed error logging for debugging
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        constraint: error.constraint,
        stack: error.stack
      });

      if (error.name === 'NotAllowedError') {
        setError(`❌ Camera access denied. Please allow camera permissions and try again.${isAndroid ? ' (Android: Check Chrome site settings)' : ''}`);
      } else if (error.name === 'NotFoundError') {
        setError('❌ No camera found. Please ensure your device has a working camera.');
      } else if (error.name === 'NotSupportedError') {
        setError(`❌ Camera not supported.${isAndroid ? ' Try updating Chrome.' : ''}`);
      } else if (error.name === 'OverconstrainedError') {
        setError('❌ Camera constraints not supported. Please try again.');
      } else {
        setError(`❌ Camera error: ${error.message || 'Unknown error'}${isAndroid ? ' (Check Chrome permissions)' : ''}`);
      }
    } finally {
      setIsCameraLoading(false);
    }
  };

  const handleCapturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) {
      setError('Camera not available. Please try again.');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Critical Android fix: Check if video is ready (like working HTML version)
    if (!video.videoWidth || !video.videoHeight) {
      setError('Camera not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Unable to get canvas context');
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0);

      // Convert to image data (matching working version quality)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      if (!imageDataUrl || imageDataUrl === 'data:,') {
        throw new Error('Failed to capture image data');
      }

      setCurrentImage(imageDataUrl);
      setError(null);

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      setIsCameraActive(false);

    } catch (error) {
      console.error('Error capturing photo:', error);
      setError('Failed to capture photo. Please try again.');
    }
  };

  const handleUploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image file is too large. Please select an image smaller than 10MB.');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setCurrentImage(e.target?.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!currentImage) {
      setError('Please capture or upload an image first.');
      return;
    }

    // Check if user has remaining uses
    if (usesRemaining <= 0) {
      setError('No AI Camera uses remaining. Engage with the Community Forum to earn more uses!');
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await axios.post('/api/recipes/analyze-image', {
        image: currentImage
      });

      if (response.data.success) {
        setAnalysisResult(response.data);
        // Update local usage count (it was decremented on the server)
        setUsesRemaining(prev => Math.max(0, prev - 1));
      } else {
        setError(response.data.message || 'Failed to analyze image.');
      }
    } catch (err) {
      console.error('Error analyzing image:', err);
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to analyze image. Please try again.');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerateRecipes = () => {
    if (analysisResult?.ingredients) {
      // Navigate to generate page with detected ingredients
      const ingredientNames = analysisResult.ingredients.map(ing => ing.name);
      const queryParams = new URLSearchParams({
        ingredients: JSON.stringify(ingredientNames),
        source: 'ai-camera'
      });
      router.push(`/generate?${queryParams.toString()}`);
    }
  };

  const handleRefresh = () => {
    setCurrentImage(null);
    setAnalysisResult(null);
    setError(null);
    setIsAnalyzing(false);
    
    // Stop camera if active
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading || loadingUsage) {
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
        <title>AI Camera - Smart Recipe Generator</title>
        <meta name="description" content="Use AI to detect ingredients from photos and generate recipes" />
      </Head>

      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              📸 AI Camera
            </h1>
            <p className="text-xl text-gray-600 mb-4">
              Capture or upload photos of ingredients to generate recipes automatically
            </p>

            {/* Usage Counter */}
            <UsageDisplay
              usesRemaining={usesRemaining}
              size="large"
              className="mb-4"
            />

            {/* Earn More Uses Info */}
            <EarnMorePrompt
              usesRemaining={usesRemaining}
              className="mb-4 max-w-2xl mx-auto"
            />

            {/* No Uses Remaining Warning */}
            {usesRemaining === 0 && (
              <NoUsesWarning className="mb-4 max-w-2xl mx-auto" />
            )}

            {/* Android-specific help */}
            {isAndroidDevice() && (
              <div className="mb-4 max-w-2xl mx-auto bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <div className="text-blue-500 text-xl">📱</div>
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">
                      Android Camera Tips
                    </h4>
                    <ul className="text-xs text-blue-700 space-y-1">
                      <li>• Make sure Chrome has camera permissions enabled</li>
                      <li>• Hold your device steady when capturing photos</li>
                      <li>• Ensure good lighting for better ingredient detection</li>
                      <li>• If camera doesn&apos;t work, try refreshing the page</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-8">
            <button
              onClick={handleOpenCamera}
              disabled={isCameraActive || isCameraLoading || !isComponentMounted}
              className="btn-primary flex items-center justify-center space-x-1 sm:space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2 sm:py-3"
            >
              {isCameraLoading ? (
                <>
                  <div className="loading-spinner"></div>
                  <span className="hidden sm:inline">Starting Camera...</span>
                  <span className="sm:hidden">Starting...</span>
                </>
              ) : !isComponentMounted ? (
                <>
                  <span>⏳</span>
                  <span className="hidden sm:inline">Loading...</span>
                  <span className="sm:hidden">Loading...</span>
                </>
              ) : (
                <>
                  <span>📷</span>
                  <span className="hidden sm:inline">Open Camera</span>
                  <span className="sm:hidden">Camera</span>
                </>
              )}
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-outline flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base py-2 sm:py-3"
            >
              <span>📁</span>
              <span className="hidden sm:inline">Upload Photo</span>
              <span className="sm:hidden">Upload</span>
            </button>

            <button
              onClick={handleAnalyzeImage}
              disabled={!currentImage || isAnalyzing}
              className="btn-primary flex items-center justify-center space-x-1 sm:space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2 sm:py-3"
            >
              {isAnalyzing ? (
                <>
                  <div className="loading-spinner w-4 h-4 sm:w-5 sm:h-5"></div>
                  <span className="hidden sm:inline">Analyzing...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <span>🔍</span>
                  <span className="hidden sm:inline">Analyze Image</span>
                  <span className="sm:hidden">Analyze</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateRecipes}
              disabled={!analysisResult?.ingredients}
              className="btn-primary flex items-center justify-center space-x-1 sm:space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base py-2 sm:py-3"
            >
              <span>🍳</span>
              <span className="hidden sm:inline">Generate Recipes</span>
              <span className="sm:hidden">Recipes</span>
            </button>

            <button
              onClick={handleRefresh}
              className="btn-outline flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base py-2 sm:py-3 col-span-2 sm:col-span-1"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUploadPhoto}
            className="hidden"
          />

          {/* Camera/Image Display Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700">{error}</p>
                {error.includes('No food or ingredients detected') && (
                  <div className="mt-3 space-x-3">
                    <button onClick={handleOpenCamera} className="btn-outline text-sm">
                      Retake Photo
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="btn-outline text-sm">
                      Upload Different Image
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Always present video element - hidden when not active */}
            <div className="camera-container mb-4 mx-auto max-w-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxWidth: '100%',
                  backgroundColor: '#000',
                  borderRadius: '8px',
                  display: isCameraActive ? 'block' : 'none'
                }}
                onLoadedMetadata={() => {
                  // Video metadata loaded
                }}
                onPlay={() => {
                  // Video started playing
                }}
                onError={(e) => {
                  setError('Video playback error. Please try again.');
                }}
              />
            </div>

            {isCameraActive ? (
              <div className="text-center">
                <div className="space-y-3">
                  <button
                    onClick={handleCapturePhoto}
                    className="btn-primary text-lg py-3 px-6"
                    disabled={!videoRef.current?.videoWidth}
                  >
                    📸 Capture Photo
                  </button>
                  <div className="text-sm text-gray-500">
                    Position ingredients clearly in the camera view
                  </div>
                  {videoRef.current?.videoWidth && (
                    <div className="text-xs text-gray-400">
                      Camera: {videoRef.current.videoWidth}x{videoRef.current.videoHeight}
                    </div>
                  )}
                </div>
              </div>
            ) : currentImage ? (
              <div className="text-center">
                <div className="inline-block max-w-full relative">
                  <Image
                    src={currentImage}
                    alt="Captured or uploaded"
                    width={800}
                    height={600}
                    className="image-preview mx-auto mb-4"
                    style={{ maxWidth: '100%', height: 'auto' }}
                    priority
                  />
                </div>
                {!analysisResult && !isAnalyzing && (
                  <p className="text-gray-600 text-sm sm:text-base">
                    Click &quot;Analyze Image&quot; to detect ingredients in this photo
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 sm:py-12">
                <div className="text-4xl sm:text-6xl mb-4">📸</div>
                <p className="text-gray-500 text-sm sm:text-base px-4">
                  Open camera or upload a photo to get started
                </p>
                <p className="text-gray-400 text-xs sm:text-sm mt-2 px-4">
                  Make sure your photo clearly shows food ingredients for best results
                </p>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {analysisResult && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 text-center sm:text-left">
                🔍 Detected Ingredients
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {analysisResult.ingredients?.map((ingredient, index) => (
                  <div
                    key={index}
                    className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4 text-center hover:bg-green-100 transition-colors"
                  >
                    <p className="font-medium text-green-800 text-sm sm:text-base mb-1">
                      {ingredient.name}
                    </p>
                    <p className="text-xs sm:text-sm text-green-600 mb-2">
                      {Math.round(ingredient.confidence * 100)}% confidence
                    </p>
                    <div className="ingredient-confidence-bar">
                      <div
                        className="ingredient-confidence-fill"
                        style={{ width: `${ingredient.confidence * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  Found {analysisResult.ingredients?.length} ingredient{analysisResult.ingredients?.length !== 1 ? 's' : ''}! Ready to generate recipes?
                </p>

                {/* AI Safety Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-left max-w-md mx-auto">
                  <div className="flex items-start">
                    <div className="flex-shrink-0">
                      <svg className="h-4 w-4 text-amber-400 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2">
                      <p className="text-xs text-amber-700">
                        <strong>Safety Note:</strong> Generated recipes are AI-created. Always verify ingredients and cooking instructions before use.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleGenerateRecipes}
                  className="btn-primary text-base sm:text-lg py-3 px-6"
                >
                  🍳 Generate Recipes with These Ingredients
                </button>
              </div>
            </div>
          )}

          {/* Loading state for analysis */}
          {isAnalyzing && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
              <div className="loading-spinner-large mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Analyzing Your Image...
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Our AI is identifying ingredients in your photo. This may take a few moments.
              </p>
            </div>
          )}

          {/* Hidden canvas for image capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      </div>
    </Layout>
  );
}
