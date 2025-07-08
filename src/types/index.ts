// User types
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Ingredient types
export interface Ingredient {
  name: string;
  quantity: string;
}

// Dietary preference types
export type DietaryPreference = 
  | 'vegetarian' 
  | 'vegan' 
  | 'gluten-free' 
  | 'dairy-free' 
  | 'keto' 
  | 'paleo' 
  | 'low-carb' 
  | 'high-protein'
  | 'nut-free'
  | 'soy-free';

// Recipe types
export interface Recipe {
  name: string;
  ingredients: Ingredient[];
  instructions: string[];
  dietaryPreference: DietaryPreference[];
  additionalInformation: {
    tips: string;
    variations: string;
    servingSuggestions: string;
    nutritionalInformation: string;
  };
}

export interface ExtendedRecipe extends Recipe {
  id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  likes: string[];
  likesCount: number;
  image?: string;
  audio?: string;
  tags: { tag: string }[];
  openaiPromptId?: string;
}

// API Response types
export interface RecipeGenerationResponse {
  recipes: string | null;
  openaiPromptId: string;
}

export interface ImageGenerationResponse {
  imgLink: string;
  name: string;
}

export interface ChatResponse {
  reply: string;
  totalTokens: number;
}

// Database model types
export interface AIGenerated {
  _id: string;
  userId: string;
  prompt: string;
  response: any;
  model?: string;
  createdAt: Date;
}

export interface Notification {
  _id: string;
  userId: string;
  type: 'like' | 'comment' | 'follow';
  message: string;
  relatedRecipeId?: string;
  relatedUserId?: string;
  read: boolean;
  createdAt: Date;
}

// Form types
export interface RecipeGenerationForm {
  ingredients: Ingredient[];
  dietaryPreferences: DietaryPreference[];
}

// Recipe Collection types
export interface RecipeCollection {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  collectionRecipes?: CollectionRecipe[];
  _count?: {
    collectionRecipes: number;
  };
}

export interface CollectionRecipe {
  id: string;
  collectionId: string;
  recipeId: string;
  userId: string;
  addedAt: Date;
  notes?: string;
  recipe?: ExtendedRecipe;
  collection?: RecipeCollection;
}

// Recipe Review types
export interface RecipeReview {
  id: string;
  rating: number; // 1-5 stars
  comment?: string;
  recipeId: string;
  userId: string;
  userName: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: User;
  recipe?: ExtendedRecipe;
}

// Shopping List types
export interface ShoppingList {
  id: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  items?: ShoppingListItem[];
  _count?: {
    items: number;
  };
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: string;
  unit?: string;
  category?: string;
  isCompleted: boolean;
  estimatedPrice?: number;
  notes?: string;
  shoppingListId: string;
  userId: string;
  sourceRecipeId?: string;
  createdAt: Date;
  updatedAt: Date;
  shoppingList?: ShoppingList;
  sourceRecipe?: ExtendedRecipe;
}

// Food categories for shopping list organization
export type FoodCategory = 
  | '蔬菜' 
  | '水果' 
  | '肉類' 
  | '海鮮' 
  | '乳製品' 
  | '調料' 
  | '穀物' 
  | '零食' 
  | '飲料' 
  | '冷凍食品' 
  | '其他';

// API Error types
export interface APIError {
  error: string;
  details?: string;
}

// LM Studio specific types
export interface LMStudioConfig {
  baseURL: string;
  apiKey?: string;
  model?: string;
}

export interface LMStudioResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage?: {
    total_tokens: number;
  };
}
