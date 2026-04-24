const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

async function callOpenRouter(systemPrompt, userMessage) {
  if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY === 'your_openrouter_api_key_here') {
    throw new Error('OpenRouter API key not configured. Please set OPENROUTER_API_KEY in .env file');
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Image Generation App'
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.7,
      max_tokens: 10000
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenRouter API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// Strip markdown code block formatting (```json ... ``` or ``` ... ```) from AI responses
function stripCodeBlocks(text) {
  if (!text) return text;
  // Remove ```json ... ``` or ```anything ... ``` wrapping
  return text.replace(/```[\w]*\n?/g, '').trim();
}

// AI Prompt Optimizer
async function optimizePrompt(originalPrompt, style = '', targetQuality = 'high') {
  const systemPrompt = `You are an expert AI image generation prompt engineer. Your task is to optimize prompts for better image generation results.

  Respond with a JSON object containing:
  - optimizedPrompt: The improved prompt
  - improvements: Array of improvements made
  - tips: Array of tips for better results
  - negativePrompt: Suggested negative prompt
  - qualityScore: Score from 1-10 for the optimized prompt

  Focus on adding details, artistic style, lighting, composition, and technical quality keywords.`;

  const userMessage = `Optimize this prompt for AI image generation:
Original Prompt: "${originalPrompt}"
${style ? `Style: ${style}` : ''}
Target Quality: ${targetQuality}

Please provide the optimized version with all improvements.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    // Try to parse as JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    // If not valid JSON, structure the response
  }

  return {
    optimizedPrompt: result,
    improvements: ['Enhanced details', 'Improved clarity'],
    tips: ['Add more specific details', 'Consider lighting'],
    negativePrompt: 'blurry, low quality, distorted',
    qualityScore: 7
  };
}

// AI Art Instructor
async function getArtInstruction(topic, skillLevel = 'beginner', artForm = 'digital') {
  const systemPrompt = `You are an expert art instructor specializing in teaching digital and traditional art techniques.

  Respond with a JSON object containing:
  - lesson: Main lesson content
  - keyPoints: Array of key learning points
  - techniques: Array of specific techniques to practice
  - exercises: Array of practice exercises
  - resources: Array of recommended resources
  - nextSteps: Suggested next topics to learn
  - difficulty: Lesson difficulty level`;

  const userMessage = `Create an art lesson on:
Topic: ${topic}
Skill Level: ${skillLevel}
Art Form: ${artForm}

Please provide a comprehensive but accessible lesson.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}

  return {
    lesson: result,
    keyPoints: ['Understanding fundamentals', 'Practice regularly'],
    techniques: ['Basic strokes', 'Color mixing'],
    exercises: ['Daily sketching', 'Reference studies'],
    resources: ['Online tutorials', 'Art communities'],
    nextSteps: ['Advanced techniques'],
    difficulty: skillLevel
  };
}

// AI Style Transfer Analysis
async function analyzeStyleTransfer(sourceStyle, targetStyle, contentDescription) {
  const systemPrompt = `You are an expert in artistic style analysis and style transfer for AI image generation.

  Respond with a JSON object containing:
  - analysisPrompt: Optimized prompt for style transfer
  - styleElements: Key elements from the target style to incorporate
  - technicalSettings: Recommended AI generation settings
  - colorPalette: Suggested color palette
  - compositionTips: Tips for composition
  - expectedResult: Description of expected outcome
  - warnings: Potential issues to watch for`;

  const userMessage = `Analyze and prepare a style transfer:
Source Style: ${sourceStyle}
Target Style: ${targetStyle}
Content: ${contentDescription}

Provide detailed guidance for achieving this style transfer.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}

  return {
    analysisPrompt: `${contentDescription} in the style of ${targetStyle}`,
    styleElements: ['Color palette', 'Brushwork', 'Composition'],
    technicalSettings: { guidanceScale: 7.5, steps: 30 },
    colorPalette: ['Warm tones', 'Earth colors'],
    compositionTips: ['Balance elements', 'Consider focal point'],
    expectedResult: 'A blend of content and style',
    warnings: ['May lose some detail']
  };
}

// AI Upscaler Recommendations
async function getUpscaleRecommendations(imageDescription, currentResolution, targetResolution, useCase) {
  const systemPrompt = `You are an expert in AI image upscaling and enhancement.

  Respond with a JSON object containing:
  - recommendations: Array of specific recommendations
  - enhancementPrompt: Prompt to use with AI enhancement
  - qualitySettings: Recommended quality settings
  - expectedImprovements: What improvements to expect
  - processingTips: Tips for best results
  - postProcessing: Suggested post-processing steps
  - alternativeMethods: Alternative approaches`;

  const userMessage = `Provide upscaling recommendations:
Image Description: ${imageDescription}
Current Resolution: ${currentResolution}
Target Resolution: ${targetResolution}
Use Case: ${useCase}

Give detailed guidance for optimal upscaling.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}

  return {
    recommendations: ['Use progressive upscaling', 'Apply sharpening'],
    enhancementPrompt: `High resolution, detailed ${imageDescription}`,
    qualitySettings: { denoise: 0.3, sharpness: 0.5 },
    expectedImprovements: ['Clearer details', 'Smoother gradients'],
    processingTips: ['Process in chunks for large images'],
    postProcessing: ['Color correction', 'Final sharpening'],
    alternativeMethods: ['Neural network upscaling', 'Traditional interpolation']
  };
}

// AI Variation Generator
async function generateVariations(originalPrompt, numVariations = 5, variationType = 'creative') {
  const systemPrompt = `You are an expert at creating creative variations of image generation prompts.

  Respond with a JSON object containing:
  - variations: Array of variation objects, each with:
    - prompt: The variation prompt
    - description: What makes this variation unique
    - style: Style suggestion for this variation
    - mood: The mood/atmosphere of this variation
  - originalAnalysis: Analysis of the original prompt
  - variationStrategy: Strategy used for creating variations`;

  const userMessage = `Create ${numVariations} variations of this prompt:
Original: "${originalPrompt}"
Variation Type: ${variationType}

Create diverse and creative variations while maintaining the core concept.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}

  return {
    variations: [
      { prompt: originalPrompt + ' at sunset', description: 'Sunset variation', style: 'Warm colors', mood: 'Peaceful' },
      { prompt: originalPrompt + ' in rain', description: 'Rainy variation', style: 'Moody', mood: 'Melancholic' },
      { prompt: originalPrompt + ' at night', description: 'Night variation', style: 'Dark', mood: 'Mysterious' }
    ],
    originalAnalysis: 'Good base prompt with clear subject',
    variationStrategy: variationType
  };
}

// AI Brand Asset Creator
async function createBrandAsset(brandName, brandValues, assetType, colorPreferences) {
  const systemPrompt = `You are an expert brand designer and AI art director specializing in creating brand assets.

  Respond with a JSON object containing:
  - generationPrompt: Optimized prompt for generating the brand asset
  - designConcept: Description of the design concept
  - colorScheme: Detailed color scheme with hex codes
  - typography: Typography recommendations
  - styleGuide: Brief style guide for consistency
  - variations: Suggested variations to create
  - usageGuidelines: How to use the asset
  - technicalSpecs: Technical specifications`;

  const userMessage = `Create a brand asset:
Brand Name: ${brandName}
Brand Values: ${brandValues}
Asset Type: ${assetType}
Color Preferences: ${colorPreferences}

Design a professional brand asset that reflects the brand identity.`;

  const rawResult = await callOpenRouter(systemPrompt, userMessage);
  const result = stripCodeBlocks(rawResult);

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {}

  return {
    generationPrompt: `Professional ${assetType} for ${brandName}, ${brandValues}, ${colorPreferences}`,
    designConcept: 'Modern and clean design',
    colorScheme: { primary: '#7c3aed', secondary: '#a78bfa', accent: '#f59e0b' },
    typography: { heading: 'Sans-serif bold', body: 'Clean sans-serif' },
    styleGuide: 'Minimalist with bold accent colors',
    variations: ['Light mode', 'Dark mode', 'Monochrome'],
    usageGuidelines: ['Use on white backgrounds', 'Maintain clear space'],
    technicalSpecs: { format: 'PNG/SVG', resolution: '300dpi' }
  };
}

module.exports = {
  callOpenRouter,
  optimizePrompt,
  getArtInstruction,
  analyzeStyleTransfer,
  getUpscaleRecommendations,
  generateVariations,
  createBrandAsset
};
