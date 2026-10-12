import React from 'react';
import FullFieldPresets from './FullFieldPresets';

export const imageAIPresetSets = {
  'prompt-optimizer': [
    { label: 'Golden-hour portrait', values: { original_prompt: 'Editorial portrait of a ceramic artist in a sunlit studio, natural expression, environmental details, warm golden-hour rim light, 85mm lens composition', optimized_prompt: 'Editorial environmental portrait of a ceramic artist at work in a sunlit studio, tactile clay details, authentic expression, warm golden-hour rim lighting, shallow depth of field, 85mm lens, refined color grading, high detail', style: 'Photorealistic', target_quality: 'high' } },
    { label: 'Enchanted forest', values: { original_prompt: 'Ancient forest path with luminous mushrooms, drifting mist, tiny lanterns, and a traveler approaching a ruined archway', optimized_prompt: 'Cinematic enchanted forest path at blue hour, bioluminescent mushrooms, layered silver mist, delicate lantern light, lone traveler approaching a moss-covered ruined archway, rich atmospheric depth, painterly detail', style: 'Fantasy', target_quality: 'ultra' } },
    { label: 'Neon observatory', values: { original_prompt: 'Futuristic rooftop observatory above a rainy neon city, astronomer studying a holographic star map', optimized_prompt: 'Wide cinematic view of a futuristic rooftop observatory above a rain-soaked neon metropolis, astronomer interacting with a translucent holographic star map, reflective surfaces, volumetric light, crisp architectural detail', style: 'Sci-Fi', target_quality: 'ultra' } },
  ],
  'art-instructor': [
    { label: 'Color and light', values: { topic: 'Color and Light for Atmospheric Landscapes', skill_level: 'beginner', art_form: 'digital', lesson_content: 'A complete guided lesson covering value grouping, warm and cool light, atmospheric perspective, a limited-palette demonstration, a 30-minute study, and a self-review checklist.' } },
    { label: 'Portrait structure', values: { topic: 'Portrait Structure, Proportion, and Edge Control', skill_level: 'intermediate', art_form: 'traditional', lesson_content: 'A complete portrait lesson using construction lines, comparative measurement, hard and soft edges, feature studies, a timed drawing exercise, and criteria for reviewing likeness.' } },
    { label: 'Mixed-media narrative', values: { topic: 'Advanced Mixed-Media Visual Storytelling', skill_level: 'advanced', art_form: 'mixed', lesson_content: 'An advanced workshop combining collage, ink, and digital finishing, with concept thumbnails, material tests, focal hierarchy, production stages, and a final critique rubric.' } },
  ],
  'brand-asset-creator': [
    { label: 'Sustainable studio', values: { brand_name: 'Northlight Studio', brand_values: 'Sustainable craft, clarity, warmth, accessibility, and durable design', asset_type: 'Brand Kit', color_preferences: 'Forest green #245B45, warm sand #E7D7B5, charcoal #252A2D, off-white #FAF7F0', generation_prompt: 'Create a complete, accessible identity for Northlight Studio using a restrained botanical geometry, high-contrast typography, production-ready color tokens, responsive logo lockups, and clear usage rules.' } },
    { label: 'Technology launch', values: { brand_name: 'Orbit Foundry', brand_values: 'Precision, responsible innovation, reliability, collaboration, and forward motion', asset_type: 'Social Media Kit', color_preferences: 'Midnight navy #101A35, electric blue #377DFF, pale cyan #DDF7FF, white #FFFFFF', generation_prompt: 'Design a cohesive social launch system for Orbit Foundry with modular orbital graphics, accessible type scales, flexible announcement cards, product-detail templates, and dark and light variants.' } },
    { label: 'Artisan packaging', values: { brand_name: 'Field & Flour', brand_values: 'Local ingredients, handcraft, hospitality, transparency, and everyday delight', asset_type: 'Packaging', color_preferences: 'Rust #A64B2A, wheat #E8C982, sage #71866A, cream #FFF7E8', generation_prompt: 'Develop production-ready bakery packaging for Field & Flour with hand-drawn grain motifs, legible ingredient hierarchy, recyclable-material cues, warm shelf presence, and adaptable labels for three product sizes.' } },
  ],
  'style-transfer': [
    { label: 'Van Gogh landscape', values: { source_style: 'Photograph', target_style: 'Van Gogh Starry Night', content_description: 'A quiet hillside village at dusk with a stone bridge, cypress trees, and the first stars reflected in a river', analysis_prompt: 'Translate the supplied hillside village into an expressive post-impressionist scene with swirling night-sky rhythm, impasto texture, luminous complementary blues and yellows, while preserving the bridge and village silhouette.' } },
    { label: 'Anime expedition', values: { source_style: 'Digital Art', target_style: 'Anime', content_description: 'A research team crossing a windswept alien plateau with translucent plants and a ringed planet above the horizon', analysis_prompt: 'Reframe the expedition as a cinematic anime key frame with clean cel shading, expressive silhouettes, wind-driven motion, layered atmospheric depth, and a vivid but controlled science-fiction palette.' } },
    { label: 'Cyberpunk market', values: { source_style: 'Realistic', target_style: 'Cyberpunk', content_description: 'A crowded evening food market beneath an elevated railway, with umbrellas, steam, signage, and wet pavement', analysis_prompt: 'Transform the market into a believable cyberpunk streetscape using multilingual neon signage, holographic menus, rain reflections, dense practical detail, cinematic contrast, and preserved human-scale activity.' } },
  ],
  upscaler: [
    { label: 'Portrait print', values: { image_description: 'A softly lit editorial portrait with detailed skin, textured linen clothing, loose hair strands, and a smooth studio backdrop', current_resolution: '512x512', target_resolution: '4096x4096', use_case: 'print', enhancement_prompt: 'Preserve natural skin texture and facial identity, recover fine hair and fabric detail, keep the backdrop smooth, avoid plastic sharpening, and prepare a clean high-resolution print master.' } },
    { label: 'Large landscape', values: { image_description: 'A panoramic digital landscape painting with distant mountains, layered forest, reflective water, and fine atmospheric gradients', current_resolution: '1024x768', target_resolution: '4096x3072', use_case: 'large_format', enhancement_prompt: 'Enhance foliage, shoreline, and rock detail while retaining painterly edges; preserve smooth sky gradients, atmospheric depth, original aspect ratio, and large-format viewing quality.' } },
    { label: 'Photo restoration', values: { image_description: 'A scanned 1960s family photograph with faded color, fine scratches, film grain, soft faces, and damaged corners', current_resolution: '256x256', target_resolution: '2048x2048', use_case: 'restoration', enhancement_prompt: 'Restore the scan conservatively: repair scratches and corner damage, reduce noise without erasing authentic grain, improve facial clarity without changing identity, and rebalance faded colors.' } },
  ],
  'variation-generator': [
    { label: 'Dragon concepts', values: { original_prompt: 'A guardian dragon circling a cliffside observatory at dawn while astronomers open a brass telescope dome', num_variations: 5, variation_type: 'creative' } },
    { label: 'Coffee-shop moods', values: { original_prompt: 'A book-lined neighborhood coffee shop during an autumn rain, warm window light and a barista preparing the first order', num_variations: 4, variation_type: 'mood' } },
    { label: 'Alien-world styles', values: { original_prompt: 'An astronaut cataloging translucent plants beside a turquoise lake under two moons', num_variations: 6, variation_type: 'style' } },
  ],
  'generate-image': [
    { label: 'Botanical editorial', values: { title: 'Moonlit Botanical Study', prompt: 'Editorial botanical still life of rare night-blooming flowers in a ceramic vessel, moonlight through textured glass, deep indigo backdrop, precise natural detail, balanced negative space', negativePrompt: 'text, watermark, duplicate flowers, malformed petals, plastic texture, harsh flash, oversaturation', style: 'Digital Art', seed: '18427', steps: 32, guidanceScale: 7.5 } },
    { label: 'Coastal watercolor', values: { title: 'Quiet Harbor Morning', prompt: 'Small coastal harbor at first light, weathered boats, sea mist, distant cottages, gulls above calm water, expressive transparent washes and granulating pigments', negativePrompt: 'photorealism, neon colors, heavy outlines, text, watermark, distorted boats, muddy shadows', style: 'Watercolor', seed: '32018', steps: 28, guidanceScale: 6.5 } },
    { label: 'Retro-future city', values: { title: 'Orbital Transit District', prompt: 'Optimistic retro-futurist transit district at blue hour, elevated magnetic trains, public gardens, geometric towers, pedestrians in colorful raincoats, cinematic wide-angle composition', negativePrompt: 'dystopian decay, empty streets, illegible signs, text, watermark, warped architecture, low detail', style: 'Concept Art', seed: '90731', steps: 40, guidanceScale: 8 } },
  ],
};

export function presetsForFields(kind, value) {
  const keys = Object.keys(value || {});
  return (imageAIPresetSets[kind] || []).map((preset) => ({
    label: preset.label,
    values: Object.fromEntries(keys.map((key) => [key, preset.values[key] ?? `${preset.label} complete example`])),
  }));
}

export default function ImageAIPresets({ kind, value, onChange, disabled = false }) {
  return <FullFieldPresets value={value} onChange={onChange} presets={presetsForFields(kind, value)} disabled={disabled} />;
}
