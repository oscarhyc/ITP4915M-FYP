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
