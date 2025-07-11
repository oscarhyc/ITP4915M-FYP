# 🍳 Smart Recipe Generator - Local LM Studio Edition

A smart recipe generator powered by **local LM Studio** instead of OpenAI. This app creates unique recipes based on user-selected ingredients and dietary preferences, using locally-hosted language models for complete privacy and control.

## ✨ Features

- **🤖 Local AI-Powered Recipe Generation**: Uses LM Studio for recipe creation
- **🔐 Complete Privacy**: All AI processing happens locally
- **🥗 Dietary Preferences**: Support for vegan, gluten-free, keto, paleo, and more
- **🔍 Smart Search**: Find recipes using AI-generated tags
- **💬 Recipe Chat Assistant**: Ask questions about recipes
- **🎵 Text-to-Speech**: Recipe narration using Web Speech API
- **📱 Mobile Responsive**: Works on all devices
- **🔒 Secure Authentication**: Google OAuth integration

## 🚀 Prerequisites

Before running this application, make sure you have:

1. **Node.js** (v18 or higher)
2. **MongoDB** (local or cloud instance)
3. **LM Studio** installed and running on your network (192.168.5.35:1234)

## 🛠️ LM Studio Setup

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Download a compatible model (recommended: Llama 2 7B, Mistral 7B, or similar instruction-tuned models)
3. Start the local server in LM Studio on `http://192.168.5.35:1234`
4. Ensure the model is loaded and the API is accessible from your network

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd smart-recipe-generator-local
   ```

2. **Install dependencies and set up database**
   ```bash
   npm run setup
   ```

   This will install dependencies and initialize the MongoDB database with sample data.

3. **Set up environment variables**
   ```bash
   cp .env.local.example .env.local
   ```

   Edit `.env.local` with your configuration:
   ```env
   # Next.js Configuration
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-secret-key-change-this-in-production

   # Local Authentication
   JWT_SECRET=your-jwt-secret-key-change-this-in-production
   BCRYPT_ROUNDS=12

   # LM Studio Configuration
   LM_STUDIO_BASE_URL=http://192.168.5.35:1234/v1

   # MongoDB
   MONGO_URI=mongodb://localhost:27017/smart-recipe-generator
   ```

4. **Create storage directories**
   ```bash
   mkdir -p public/images/recipes
   mkdir -p public/audio/recipes
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000) and create an account

## 🔧 Configuration

### LM Studio Models
Recommended models for best results:
- **Llama 2 7B Chat** - Good balance of speed and quality
- **Mistral 7B Instruct** - Fast and efficient
- **Code Llama 7B Instruct** - Good for structured outputs

### Model Settings in LM Studio
- **Temperature**: 0.7-0.8 for creative recipes
- **Max Tokens**: 1500-2000 for complete recipes
- **Top P**: 0.9
- **Repeat Penalty**: 1.1

## 🏗️ Architecture

This application replaces OpenAI services with local alternatives:

- **Text Generation**: LM Studio (local language models)
- **Image Generation**: Placeholder system (can be extended with local Stable Diffusion)
- **Text-to-Speech**: Web Speech API (browser-based)
- **Database**: MongoDB with sample data
- **Authentication**: Local JWT-based authentication
- **Frontend**: Next.js 14 with TypeScript and Tailwind CSS

## 🔄 Migration from OpenAI

Key differences from the original OpenAI-based version:

1. **API Endpoint**: Points to LM Studio at 192.168.5.35:1234 instead of OpenAI
2. **No API Keys**: No external API costs or rate limits
3. **Privacy**: All data processing happens locally on your network
4. **Authentication**: Local JWT-based auth instead of Google OAuth
5. **Database**: Pre-populated MongoDB with sample ingredients
6. **Image Generation**: Uses placeholder images (extensible)
7. **TTS**: Uses browser's built-in speech synthesis

## 🧪 Testing

```bash
# Run tests
npm test

# Run type checking
npm run compileTS

# Generate coverage report
npm run coverage
```

## 📝 Usage

1. **Start LM Studio** on 192.168.5.35:1234 and load your preferred model
2. **Run the application** with `npm run dev`
3. **Create an account** or sign in with your local credentials
4. **Select ingredients** and dietary preferences
5. **Generate recipes** using local AI
6. **Save, like, and share** your favorite recipes
7. **Use the chat assistant** for recipe questions

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Original Smart Recipe Generator by [Dereje1](https://github.com/Dereje1/smart-recipe-generator)
- [LM Studio](https://lmstudio.ai/) for local AI capabilities
- [Next.js](https://nextjs.org/) framework
- [Tailwind CSS](https://tailwindcss.com/) for styling
