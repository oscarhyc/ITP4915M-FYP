import OpenAI from 'openai';
import { Ingredient, DietaryPreference, Recipe, ExtendedRecipe, LMStudioConfig, LMStudioResponse } from '../types/index';
import prisma from './prisma';
import {
  getRecipeGenerationPrompt,
  getIngredientValidationPrompt,
  getRecipeNarrationPrompt,
  getRecipeTaggingPrompt,
  getChatAssistantSystemPrompt
} from './prompts';

// LM Studio configuration
const LM_STUDIO_BASE_URL = process.env.LM_STUDIO_BASE_URL;
const LM_STUDIO_API_KEY = process.env.LM_STUDIO_API_KEY;

// Initialize OpenAI client configured for LM Studio
const lmStudio = new OpenAI({
  baseURL: LM_STUDIO_BASE_URL,
  apiKey: LM_STUDIO_API_KEY,
});

// Save LM Studio responses in the database for logging/tracking
type SaveLMStudioResponsesType = {
  userId: string;
  prompt: string;
  response: any;
  model?: string;
};

const saveLMStudioResponses = async ({ userId, prompt, response, model }: SaveLMStudioResponsesType) => {
  try {
    const aiGenerated = await prisma.aIGenerated.create({
      data: {
        userId,
        prompt,
        response,
        model: model || 'gemini-2.0-flash',
        tokens: response.usage?.total_tokens || 0,
        cost: 0, // You can calculate cost based on tokens if needed
        status: 'success',
      },
    });
    return aiGenerated.id;
  } catch (error) {
    console.error('Failed to save LM Studio response to db:', error);
    return null;
  }
};

type ResponseType = {
  recipes: string | null;
  openaiPromptId: string;
};

// Generate recipes using LM Studio
export const generateRecipe = async (
  ingredients: Ingredient[],
  dietaryPreferences: DietaryPreference[],
  userId: string
): Promise<ResponseType> => {
  try {
    const prompt = getRecipeGenerationPrompt(ingredients, dietaryPreferences);
    const model = 'gemini-2.0-flash';

    console.info('Generating recipes from LM Studio...');

    const response = await lmStudio.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.9,
    });

    console.log('LM Studio response received successfully');

    const _id = await saveLMStudioResponses({
      userId,
      prompt,
      response,
      model,
    });

    return {
      recipes: response.choices[0].message?.content,
      openaiPromptId: _id || 'null-prompt-id'
    };
  } catch (error) {
    console.error('Failed to generate recipe with LM Studio:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    // Re-throw with more specific error information
    throw new Error(`LM Studio Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

// Validate an ingredient name using LM Studio
export const validateIngredient = async (ingredientName: string, userId: string): Promise<string | null> => {
  try {
    const prompt = getIngredientValidationPrompt(ingredientName);
    const model = 'gemini-2.0-flash';

    console.info('Validating ingredient with LM Studio...');

    const response = await lmStudio.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      max_tokens: 500,
      temperature: 0.3,
    });

    await saveLMStudioResponses({
      userId,
      prompt,
      response,
      model,
    });

    return response.choices[0].message?.content;
  } catch (error) {
    console.error('Failed to validate ingredient with LM Studio:', error);
    throw new Error('Failed to validate ingredient');
  }
};

// Get recipe narration text using LM Studio
const getRecipeNarration = async (recipe: ExtendedRecipe, userId: string): Promise<string | null> => {
  try {
    const prompt = getRecipeNarrationPrompt(recipe);
    const model = 'gemini-2.0-flash';

    console.info('Getting recipe narration text from LM Studio...');

    const response = await lmStudio.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      max_tokens: 1500,
      temperature: 0.6,
    });

    const _id = await saveLMStudioResponses({
      userId,
      prompt,
      response,
      model,
    });

    return response.choices[0].message?.content;
  } catch (error) {
    console.error('Failed to generate recipe narration with LM Studio:', error);
    throw new Error('Failed to generate recipe narration');
  }
};

// Generate text-to-speech using Web Speech API (browser-based)
export const getTTS = async (recipe: ExtendedRecipe, userId: string): Promise<string> => {
  try {
    const text = await getRecipeNarration(recipe, userId);
    if (!text) throw new Error('Unable to get text for recipe narration');

    // Return the text for client-side TTS using Web Speech API
    // The actual TTS will be handled on the frontend
    return text;
  } catch (error) {
    console.error('Failed to prepare TTS text:', error);
    throw new Error('Failed to prepare TTS text');
  }
};

// Generate tags for a recipe using LM Studio
export const generateRecipeTags = async (recipe: ExtendedRecipe, userId: string): Promise<void> => {
  try {
    const prompt = getRecipeTaggingPrompt(recipe);
    const model = 'gemini-2.0-flash';

    console.info('Generating recipe tags with LM Studio...');

    const response = await lmStudio.chat.completions.create({
      model,
      messages: [{
        role: 'user',
        content: prompt,
      }],
      max_tokens: 300,
      temperature: 0.4,
    });

    await saveLMStudioResponses({
      userId,
      prompt,
      response,
      model,
    });

    const [tagsObject] = response.choices;
    const rawTags = tagsObject.message?.content?.trim();
    let tagsArray: string[] = [];

    if (rawTags) {
      try {
        tagsArray = JSON.parse(rawTags);
        if (!Array.isArray(tagsArray) || tagsArray.some(tag => typeof tag !== 'string')) {
          throw new Error('Invalid JSON structure: Expected an array of strings.');
        }
      } catch (jsonError) {
        console.error('JSON parsing error:', jsonError);
        console.error('Received malformed JSON:', rawTags);
        throw new Error(`Failed to parse tags from LM Studio response. --> ${jsonError}`);
      }
    }

    if (tagsArray.length) {
      const tags = tagsArray.map((tag: string) => ({ tag: tag.toLowerCase() }));
      console.info(`Adding tags -> ${tagsArray} for new recipe -> ${recipe.name} from LM Studio`);
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { tags }
      });
    }

    return;
  } catch (error) {
    console.error('Failed to generate tags for the recipe with LM Studio:', error);
    throw new Error(`Failed to generate tags for the recipe --> ${error}`);
  }
};

// Generate a chat response using LM Studio
export const generateChatResponse = async (
  message: string,
  recipe: ExtendedRecipe,
  history: any[],
  userId: string
): Promise<{ reply: string; totalTokens: number }> => {
  try {
    const model = 'gemini-2.0-flash';
    const messages = [
      { role: 'system', content: getChatAssistantSystemPrompt(recipe) },
      ...history,
      { role: 'user', content: message },
    ];

    console.info('Generating chat response with LM Studio...');

    const response = await lmStudio.chat.completions.create({
      model,
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = response.choices?.[0]?.message?.content ?? 'Sorry, I had trouble responding.';
    const totalTokens = response.usage?.total_tokens ?? 0;

    // Save to DB only on first message
    if (history.length === 1) {
      await saveLMStudioResponses({
        userId,
        prompt: `Chat session started for recipe: ${recipe.name}, first message: ${message}`,
        response,
        model,
      });
    }

    return { reply, totalTokens };
  } catch (error) {
    console.error('Failed to generate chat response with LM Studio:', error);
    return { reply: 'Sorry, I had trouble responding.', totalTokens: 0 };
  }
};

// Health check function to verify LM Studio connection
export const checkLMStudioHealth = async (): Promise<boolean> => {
  try {
    const response = await lmStudio.chat.completions.create({
      model: 'gemini-2.0-flash',
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 10,
    });

    return response.choices?.[0]?.message?.content !== undefined;
  } catch (error) {
    console.error('LM Studio health check failed:', error);
    return false;
  }
};

// Get available models from LM Studio
export const getAvailableModels = async (): Promise<string[]> => {
  try {
    const response = await lmStudio.models.list();
    return response.data.map(model => model.id);
  } catch (error) {
    console.error('Failed to get available models from LM Studio:', error);
    return ['gemini-2.0-flash']; // fallback
  }
};
