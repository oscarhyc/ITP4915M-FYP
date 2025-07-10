import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { getFilteredIngredients } from '../data/commonIngredients';
import axios from 'axios';

interface Ingredient {
  name: string;
  quantity: string;
}

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error';
  lmStudio: 'connected' | 'disconnected' | 'error';
  models?: string[];
  lmStudioUrl?: string;
}

export default function Generate() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: '', quantity: '' }]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [recipes, setRecipes] = useState<string>('');
  const [parsedRecipe, setParsedRecipe] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Ingredient dropdown state
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [ingredientSuggestions, setIngredientSuggestions] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin');
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Check system status
    checkSystemStatus();
  }, []);

  // Handle URL parameters from AI Camera
  useEffect(() => {
    if (router.isReady) {
      const { ingredients: urlIngredients, source } = router.query;
      
      if (urlIngredients && source === 'ai-camera') {
        try {
          const ingredientNames = JSON.parse(urlIngredients as string);
          if (Array.isArray(ingredientNames) && ingredientNames.length > 0) {
            // Convert ingredient names to ingredient objects with empty quantities
            const newIngredients = ingredientNames.map(name => ({
              name: name,
              quantity: '' // User will need to fill in quantities
            }));
            
            setIngredients(newIngredients);
            
            // Clear URL parameters to avoid re-processing
            router.replace('/generate', undefined, { shallow: true });
          }
        } catch (error) {
          console.error('Failed to parse ingredients from URL:', error);
        }
      }
    }
  }, [router.isReady, router.query, router]);

  const checkSystemStatus = async () => {
    try {
      const response = await axios.get('/api/system/status');
      setSystemStatus((response.data as any).status);
    } catch (error) {
      console.error('Failed to check system status:', error);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { name: '', quantity: '' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const updateIngredient = (index: number, field: 'name' | 'quantity', value: string) => {
    const updated = ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, [field]: value } : ingredient
    );
    setIngredients(updated);

    // Update suggestions for ingredient name field
    if (field === 'name') {
      setIngredientSuggestions(getFilteredIngredients(value));
      setActiveDropdown(index);
    }
  };

  const selectIngredient = (index: number, ingredientName: string) => {
    const updated = ingredients.map((ingredient, i) =>
      i === index ? { ...ingredient, name: ingredientName } : ingredient
    );
    setIngredients(updated);
    setActiveDropdown(null);
    setIngredientSuggestions([]);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
        setIngredientSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Parse recipe JSON response (enhanced for Gemini API responses)
  const parseRecipeResponse = (recipeText: string) => {
    console.log('Raw recipe text:', recipeText);

    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(recipeText);
      console.log('Successfully parsed JSON:', parsed);
      setParsedRecipe(parsed);
      return parsed;
    } catch (error) {
      console.log('Direct JSON parse failed, trying to extract JSON...');

      // Clean the text first - handle Gemini's specific format
      let cleanText = recipeText;

      // Remove Gemini's thinking tags and reasoning text
      cleanText = cleanText.replace(/<think>[\s\S]*?<\/think>/gi, '');
      cleanText = cleanText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');

      // Remove markdown code blocks if present
      cleanText = cleanText.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      // Remove any leading/trailing reasoning text that might be outside JSON
      cleanText = cleanText.replace(/^[^{]*/, '').replace(/[^}]*$/, '');

      // Try multiple JSON extraction patterns
      const patterns = [
        /\{[\s\S]*\}/,  // Original pattern
        /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g,  // Nested objects
        /(\{[\s\S]*?\})\s*$/,  // JSON at the end
        /^[\s\S]*?(\{[\s\S]*\})[\s\S]*$/,  // JSON anywhere in text
        // Additional patterns for Gemini responses
        /```json\s*(\{[\s\S]*?\})\s*```/gi,  // JSON in code blocks
        /(?:recipe|json):\s*(\{[\s\S]*?\})/gi,  // JSON after labels
      ];

      for (const pattern of patterns) {
        const matches = cleanText.match(pattern);
        if (matches) {
          for (const match of Array.isArray(matches) ? matches : [matches[1] || matches[0]]) {
            try {
              const parsed = JSON.parse(match);
              console.log('Successfully extracted and parsed JSON:', parsed);
              setParsedRecipe(parsed);
              return parsed;
            } catch (e) {
              console.log('Failed to parse match:', match.substring(0, 100) + '...');
              continue;
            }
          }
        }
      }

      // Try to fix common JSON issues
      try {
        // Fix trailing commas and other common issues
        let fixedJson = cleanText
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
          .replace(/:\s*'([^']*)'/g, ': "$1"')  // Replace single quotes with double quotes
          .replace(/\n/g, ' ')  // Replace newlines with spaces
          .trim();

        // Extract JSON if it's wrapped in other text
        const jsonMatch = fixedJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('Successfully parsed fixed JSON:', parsed);
          setParsedRecipe(parsed);
          return parsed;
        }
      } catch (e) {
        console.log('Failed to parse fixed JSON');
      }

      // Last resort: try to extract JSON from the original text with more aggressive cleaning
      try {
        const lastResortText = recipeText
          .replace(/<[^>]*>/g, '')  // Remove all HTML/XML tags
          .replace(/^[^{]*\{/, '{')  // Keep everything from first {
          .replace(/\}[^}]*$/, '}')  // Keep everything until last }
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
          .trim();

        const parsed = JSON.parse(lastResortText);
        console.log('Successfully parsed with last resort method:', parsed);
        setParsedRecipe(parsed);
        return parsed;
      } catch (e) {
        console.log('Last resort parsing also failed');
      }

      console.log('All JSON parsing attempts failed');
      // If all parsing fails, return null
      setParsedRecipe(null);
      return null;
    }
  };

  const handleDietaryPreferenceChange = (preference: string, checked: boolean) => {
    if (checked) {
      setDietaryPreferences([...dietaryPreferences, preference]);
    } else {
      setDietaryPreferences(dietaryPreferences.filter(p => p !== preference));
    }
  };

  const generateRecipes = async () => {
    setError('');
    setRecipes('');
    setParsedRecipe(null);
    setSaveMessage('');

    // Validate ingredients
    const validIngredients = ingredients.filter(ing => ing.name.trim() && ing.quantity.trim());
    if (validIngredients.length === 0) {
      setError('Please add at least one ingredient');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await axios.post('/api/recipes/generate', {
        ingredients: validIngredients,
        dietaryPreferences,
      });

      if ((response.data as any).success) {
        setRecipes((response.data as any).recipes);
        parseRecipeResponse((response.data as any).recipes);
      } else {
        setError((response.data as any).message || 'Failed to generate recipes');
      }
    } catch (error: any) {
      console.error('Recipe generation error:', error);
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else {
        setError('Failed to generate recipes. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };



  const shareRecipe = async () => {
    if (!parsedRecipe) return;

    console.log('=== SHARE RECIPE FRONTEND DEBUG ===');
    console.log('Parsed recipe:', parsedRecipe);
    console.log('Ingredients:', ingredients.filter(ing => ing.name.trim() && ing.quantity.trim()));
    console.log('Dietary preferences:', dietaryPreferences);

    setIsSharing(true);
    setSaveMessage('');

    try {
      console.log('Sending share request to API...');
      const response = await axios.post('/api/recipes/share', {
        recipe: parsedRecipe,
        ingredients: ingredients.filter(ing => ing.name.trim() && ing.quantity.trim()),
        dietaryPreferences,
      });

      console.log('Share API response:', response.data);

      if ((response.data as any).success) {
        setSaveMessage('Recipe shared to main page! Check the main page to see your shared recipe.');
        console.log('Recipe shared successfully, triggering events...');

        // Trigger multiple notification mechanisms for better reliability
        setTimeout(() => {
          console.log('Dispatching recipeShared event');
          // Custom event for same-page communication
          window.dispatchEvent(new CustomEvent('recipeShared'));

          // LocalStorage event for cross-tab communication
          const timestamp = Date.now().toString();
          localStorage.setItem('recipeSharedTimestamp', timestamp);
          console.log('Set localStorage recipeSharedTimestamp:', timestamp);

          // Also trigger a storage event manually
          window.dispatchEvent(new StorageEvent('storage', {
            key: 'recipeSharedTimestamp',
            newValue: timestamp,
            storageArea: localStorage
          }));
          console.log('Dispatched storage event');
        }, 500);
      } else {
        console.error('Share API returned error:', (response.data as any).message);
        setSaveMessage('Failed to share recipe: ' + (response.data as any).message);
      }
    } catch (error: any) {
      console.error('Share recipe error:', error);
      if (error.response?.data?.message) {
        setSaveMessage('Failed to share recipe: ' + error.response.data.message);
      } else {
        setSaveMessage('Failed to share recipe');
      }
    } finally {
      setIsSharing(false);
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
    return null;
  }

  const dietaryOptions = [
    'vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'keto', 
    'paleo', 'low-carb', 'high-protein', 'nut-free', 'soy-free'
  ];

  return (
    <Layout>
      <Head>
        <title>Generate Recipe - Smart Recipe Generator</title>
        <meta name="description" content="Generate personalized recipes using local AI" />
      </Head>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Generate Recipe</h1>
            
            {/* System Status - Hidden for better UX */}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Input Form */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Ingredients</h2>
                
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex gap-2 mb-3 relative" ref={activeDropdown === index ? dropdownRef : null}>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder="Ingredient name (type to search)"
                        value={ingredient.name}
                        onChange={(e) => updateIngredient(index, 'name', e.target.value)}
                        onFocus={() => {
                          setActiveDropdown(index);
                          setIngredientSuggestions(getFilteredIngredients(ingredient.name));
                        }}
                        className="w-full input-field"
                      />

                      {/* Dropdown suggestions */}
                      {activeDropdown === index && ingredientSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                          {ingredientSuggestions.map((suggestion, suggestionIndex) => (
                            <button
                              key={suggestionIndex}
                              type="button"
                              onClick={() => selectIngredient(index, suggestion)}
                              className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none text-sm"
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <input
                      type="text"
                      placeholder="Quantity"
                      value={ingredient.quantity}
                      onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                      className="w-32 input-field"
                    />
                    {ingredients.length > 1 && (
                      <button
                        onClick={() => removeIngredient(index)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  onClick={addIngredient}
                  className="btn-outline text-sm mb-6"
                >
                  Add Ingredient
                </button>

                <h3 className="text-lg font-semibold text-gray-900 mb-3">Dietary Preferences</h3>
                <div className="grid grid-cols-2 gap-2 mb-6">
                  {dietaryOptions.map((option) => (
                    <label key={option} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={dietaryPreferences.includes(option)}
                        onChange={(e) => handleDietaryPreferenceChange(option, e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">
                        {option.replace('-', ' ')}
                      </span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={generateRecipes}
                  disabled={isGenerating || systemStatus?.lmStudio !== 'connected'}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? 'Generating...' : 'Generate Recipes'}
                </button>

                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}
              </div>

              {/* Results */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Recipes</h2>
                
                {isGenerating ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="loading-spinner"></div>
                    <span className="ml-3 text-gray-600">Generating recipes...</span>
                  </div>
                ) : parsedRecipe ? (
                  <div className="space-y-6">
                    {/* Recipe Header */}
                    <div className="border-b border-gray-200 pb-4">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">{parsedRecipe.name}</h3>
                      {parsedRecipe.dietaryPreference && parsedRecipe.dietaryPreference.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {parsedRecipe.dietaryPreference.map((pref: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                            >
                              {pref}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Share Button */}
                      <div className="flex gap-3">
                        <button
                          onClick={shareRecipe}
                          disabled={isSharing}
                          className="btn-outline text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSharing ? 'Sharing...' : '🔗 Share Recipe'}
                        </button>
                      </div>

                      {saveMessage && (
                        <div className={`mt-3 p-2 rounded-md text-sm ${
                          saveMessage.includes('Failed')
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {saveMessage}
                        </div>
                      )}
                    </div>

                    {/* Ingredients Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Ingredients</h4>
                      <ul className="space-y-2">
                        {parsedRecipe.ingredients && parsedRecipe.ingredients.map((ingredient: any, index: number) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-primary-500 rounded-full mr-3"></span>
                            <span className="text-gray-700">
                              <span className="font-medium">{ingredient.quantity}</span> {ingredient.name}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Instructions Section */}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h4>
                      <ol className="space-y-3">
                        {parsedRecipe.instructions && parsedRecipe.instructions.map((instruction: string, index: number) => (
                          <li key={index} className="flex">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                              {index + 1}
                            </span>
                            <span className="text-gray-700">{instruction}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Additional Information */}
                    {parsedRecipe.additionalInformation && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-200">
                        {parsedRecipe.additionalInformation.tips && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">💡 Tips</h5>
                            <p className="text-gray-700 text-sm">{parsedRecipe.additionalInformation.tips}</p>
                          </div>
                        )}

                        {parsedRecipe.additionalInformation.variations && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">🔄 Variations</h5>
                            <p className="text-gray-700 text-sm">{parsedRecipe.additionalInformation.variations}</p>
                          </div>
                        )}

                        {parsedRecipe.additionalInformation.servingSuggestions && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">🍽️ Serving Suggestions</h5>
                            <p className="text-gray-700 text-sm">{parsedRecipe.additionalInformation.servingSuggestions}</p>
                          </div>
                        )}

                        {parsedRecipe.additionalInformation.nutritionalInformation && (
                          <div>
                            <h5 className="font-semibold text-gray-900 mb-2">📊 Nutritional Info</h5>
                            <p className="text-gray-700 text-sm">{parsedRecipe.additionalInformation.nutritionalInformation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : recipes ? (
                  <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> The recipe couldn&apos;t be parsed into a structured format. Here&apos;s the raw response:
                      </p>
                    </div>
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-4 rounded-md border">
                        {recipes}
                      </pre>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🍳</div>
                    <p className="text-gray-500 text-lg mb-2">Ready to create something delicious?</p>
                    <p className="text-gray-400 text-sm">Add ingredients and click &quot;Generate Recipes&quot; to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
      </div>
    </Layout>
  );
}
