const pool = require('./db');
const bcrypt = require('bcryptjs');
const { generateImage } = require('./imageGenerator');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const imagesDir = path.join(__dirname, 'generated_images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

// Generate a placeholder image when SD server is unavailable
function generatePlaceholder(text) {
  try {
    const canvas = createCanvas(512, 512);
    const ctx = canvas.getContext('2d');
    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);
    // Purple accent circle
    ctx.beginPath();
    ctx.arc(256, 200, 80, 0, Math.PI * 2);
    ctx.fillStyle = '#7c3aed';
    ctx.fill();
    // Text
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    const words = text.substring(0, 60).split(' ');
    let line = '';
    let y = 340;
    for (const word of words) {
      if ((line + word).length > 30) { ctx.fillText(line.trim(), 256, y); y += 28; line = ''; }
      line += word + ' ';
    }
    if (line.trim()) ctx.fillText(line.trim(), 256, y);
    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.fillText('Placeholder Image', 256, 480);
    return canvas.toBuffer('image/png');
  } catch (e) {
    // If canvas not available, return a minimal 1x1 PNG
    return Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64');
  }
}

// Check SD server availability once, then use placeholder if unavailable
let sdAvailable = null;
async function checkSDOnce() {
  if (sdAvailable !== null) return sdAvailable;
  try {
    const res = await fetch('http://127.0.0.1:5050/health', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    sdAvailable = data.status === 'ready';
  } catch (e) {
    sdAvailable = false;
  }
  if (!sdAvailable) console.log('SD server unavailable, using placeholder images.');
  else console.log('SD server available, generating real images.');
  return sdAvailable;
}

async function safeGenerateImage(prompt, style) {
  const available = await checkSDOnce();
  if (available) {
    try {
      return await generateImage(prompt, style);
    } catch (e) {
      return generatePlaceholder(prompt);
    }
  }
  return generatePlaceholder(prompt);
}

async function seed() {
  // Create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS gallery (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url VARCHAR(500),
      prompt TEXT,
      style VARCHAR(100),
      negative_prompt TEXT,
      seed INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      prompt_text TEXT NOT NULL,
      category VARCHAR(100),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS styles (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      example_prompt TEXT,
      preview_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id),
      prompt TEXT NOT NULL,
      style VARCHAR(100),
      image_url VARCHAR(500),
      status VARCHAR(50) DEFAULT 'completed',
      negative_prompt TEXT,
      seed INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS prompt_optimizer (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      original_prompt TEXT,
      optimized_prompt TEXT,
      style VARCHAR(100),
      target_quality VARCHAR(50),
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS art_instructor (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      topic VARCHAR(255),
      skill_level VARCHAR(50),
      art_form VARCHAR(50),
      lesson_content TEXT,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS style_transfer (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      source_style VARCHAR(100),
      target_style VARCHAR(100),
      content_description TEXT,
      analysis_prompt TEXT,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS upscaler (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      image_description TEXT,
      current_resolution VARCHAR(20),
      target_resolution VARCHAR(20),
      use_case VARCHAR(50),
      enhancement_prompt TEXT,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS variation_generator (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      original_prompt TEXT,
      num_variations INTEGER,
      variation_type VARCHAR(50),
      variations JSONB,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS brand_asset_creator (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      brand_name VARCHAR(255),
      brand_values TEXT,
      asset_type VARCHAR(50),
      color_preferences VARCHAR(255),
      generation_prompt TEXT,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS ai_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      feature VARCHAR(50) NOT NULL,
      title VARCHAR(255) NOT NULL,
      input_data JSONB,
      ai_response JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      token VARCHAR(255) NOT NULL,
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // Migration: Add new columns for existing databases
  await pool.query(`
    ALTER TABLE history ADD COLUMN IF NOT EXISTS negative_prompt TEXT;
    ALTER TABLE history ADD COLUMN IF NOT EXISTS seed INTEGER;
    ALTER TABLE gallery ADD COLUMN IF NOT EXISTS negative_prompt TEXT;
    ALTER TABLE gallery ADD COLUMN IF NOT EXISTS seed INTEGER;
  `);

  // Skip seeding if data already exists (pass --force to re-seed)
  const existing = await pool.query('SELECT COUNT(*) FROM users');
  if (parseInt(existing.rows[0].count) > 0 && !process.argv.includes('--force')) {
    console.log('Database already seeded, skipping. Use --force to re-seed.');
    await pool.end();
    process.exit(0);
  }

  // Clear existing data for fresh seed
  await pool.query('DELETE FROM password_reset_tokens');
  await pool.query('DELETE FROM ai_history');
  await pool.query('DELETE FROM prompt_optimizer');
  await pool.query('DELETE FROM art_instructor');
  await pool.query('DELETE FROM style_transfer');
  await pool.query('DELETE FROM upscaler');
  await pool.query('DELETE FROM variation_generator');
  await pool.query('DELETE FROM brand_asset_creator');
  await pool.query('DELETE FROM history');
  await pool.query('DELETE FROM gallery');
  await pool.query('DELETE FROM prompts');
  await pool.query('DELETE FROM styles');
  await pool.query('DELETE FROM users');

  // Seed demo user
  const hashed = await bcrypt.hash('password123', 10);
  const userResult = await pool.query(
    'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id',
    ['demo@example.com', hashed]
  );
  const userId = userResult.rows[0].id;

  // Seed prompts (16 items - already at 15+)
  const promptsData = [
    { title: 'Enchanted Forest', description: 'A mystical forest with glowing elements', prompt_text: 'A magical enchanted forest with bioluminescent plants and fireflies, moonlight streaming through ancient trees', category: 'Fantasy' },
    { title: 'Cyberpunk City', description: 'Futuristic neon-lit cityscape', prompt_text: 'A sprawling cyberpunk city at night with neon signs, flying cars, and towering skyscrapers in the rain', category: 'Sci-Fi' },
    { title: 'Ocean Depths', description: 'Deep sea underwater scene', prompt_text: 'A deep ocean scene with bioluminescent creatures, coral reefs, and ancient underwater ruins', category: 'Nature' },
    { title: 'Mountain Sunrise', description: 'Majestic mountain at dawn', prompt_text: 'A snow-capped mountain landscape at sunrise with golden light, pine forests, and a crystal clear lake reflection', category: 'Nature' },
    { title: 'Dragon\'s Lair', description: 'Fantasy dragon in its cave', prompt_text: 'A massive dragon sleeping on a pile of gold in a vast cavern, with treasure and glowing gems', category: 'Fantasy' },
    { title: 'Space Station', description: 'Orbital space station view', prompt_text: 'A futuristic space station orbiting Earth with nebula in the background, stars and galaxy visible', category: 'Sci-Fi' },
    { title: 'Japanese Garden', description: 'Peaceful zen garden', prompt_text: 'A serene Japanese zen garden with cherry blossoms, koi pond, stone lanterns, and a wooden bridge', category: 'Nature' },
    { title: 'Steampunk Workshop', description: 'Victorian-era inventor\'s workshop', prompt_text: 'A steampunk inventor workshop filled with gears, brass machinery, steam pipes, and glowing inventions', category: 'Steampunk' },
    { title: 'Northern Lights', description: 'Aurora borealis over snowy landscape', prompt_text: 'Northern lights aurora borealis dancing over a snowy mountain landscape with a frozen lake', category: 'Nature' },
    { title: 'Haunted Mansion', description: 'Spooky Victorian mansion', prompt_text: 'A haunted Victorian mansion at midnight with ghostly fog, dead trees, and an eerie full moon', category: 'Horror' },
    { title: 'Tropical Paradise', description: 'Beautiful tropical island', prompt_text: 'A tropical paradise island with turquoise water, white sand beach, palm trees, and a colorful sunset', category: 'Nature' },
    { title: 'Medieval Castle', description: 'Grand medieval fortress', prompt_text: 'A grand medieval castle on a cliff with banners flying, surrounded by a moat and lush green hills', category: 'Fantasy' },
    { title: 'Autumn Path', description: 'Fall colors walking path', prompt_text: 'A winding path through an autumn forest with red, orange, and golden leaves falling gently', category: 'Nature' },
    { title: 'Robot Companion', description: 'Friendly robot character', prompt_text: 'A cute friendly robot companion with glowing eyes, sitting in a garden surrounded by butterflies', category: 'Sci-Fi' },
    { title: 'Underwater City', description: 'Atlantis-inspired city', prompt_text: 'An ancient underwater city with grand architecture, sea creatures swimming between buildings, coral growing on walls', category: 'Fantasy' },
    { title: 'Desert Oasis', description: 'Oasis in vast desert', prompt_text: 'A lush oasis in the middle of a vast golden desert with palm trees, clear water pool, and camels', category: 'Nature' },
  ];

  for (const p of promptsData) {
    await pool.query(
      'INSERT INTO prompts (title, description, prompt_text, category) VALUES ($1, $2, $3, $4)',
      [p.title, p.description, p.prompt_text, p.category]
    );
  }

  // Seed styles (15 items - 3 with preview images, 12 without)
  const stylesWithImages = [
    { name: 'Watercolor', description: 'Soft, flowing watercolor painting style with gentle color blending', example_prompt: 'Paint a serene lake scene in watercolor style' },
    { name: 'Digital Art', description: 'Clean, modern digital illustration with vibrant colors', example_prompt: 'Design a futuristic landscape in digital art style' },
    { name: 'Oil Painting', description: 'Rich, textured oil painting with bold brushstrokes and deep colors', example_prompt: 'Create a portrait in classic oil painting style' },
  ];

  const generatedImagePaths = [];

  for (const s of stylesWithImages) {
    const imageBuffer = await safeGenerateImage(s.example_prompt, s.name);
    const filename = `style_${s.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);
    generatedImagePaths.push(`/generated_images/${filename}`);

    await pool.query(
      'INSERT INTO styles (name, description, example_prompt, preview_url) VALUES ($1, $2, $3, $4)',
      [s.name, s.description, s.example_prompt, `/generated_images/${filename}`]
    );
  }

  const stylesWithoutImages = [
    { name: 'Anime', description: 'Japanese anime art style with bold outlines and vivid colors', example_prompt: 'Draw a magical girl in anime style' },
    { name: 'Pixel Art', description: 'Retro pixel-based art reminiscent of classic video games', example_prompt: 'Create a medieval castle scene in pixel art' },
    { name: 'Impressionist', description: 'Light-focused style with visible brushstrokes inspired by Monet', example_prompt: 'Paint a flower garden in impressionist style' },
    { name: 'Art Nouveau', description: 'Elegant decorative style with organic flowing lines and floral motifs', example_prompt: 'Design a poster in art nouveau style' },
    { name: 'Pop Art', description: 'Bold, colorful style inspired by Andy Warhol and Roy Lichtenstein', example_prompt: 'Create a portrait in pop art style with halftone dots' },
    { name: 'Minimalist', description: 'Clean, simple designs with limited colors and shapes', example_prompt: 'Design a mountain landscape in minimalist style' },
    { name: 'Surrealist', description: 'Dream-like imagery with impossible scenes inspired by Dali', example_prompt: 'Create a melting clock landscape in surrealist style' },
    { name: 'Gothic', description: 'Dark, dramatic style with ornate architectural elements', example_prompt: 'Paint a cathedral scene in gothic style' },
    { name: 'Ukiyo-e', description: 'Traditional Japanese woodblock print style', example_prompt: 'Create a wave scene in ukiyo-e style' },
    { name: 'Photorealistic', description: 'Hyper-realistic rendering indistinguishable from photography', example_prompt: 'Render a city street in photorealistic style' },
    { name: 'Concept Art', description: 'Professional concept art style used in game and film design', example_prompt: 'Design a spaceship in concept art style' },
    { name: 'Sketch', description: 'Hand-drawn pencil sketch with crosshatching and shading', example_prompt: 'Sketch a portrait with pencil crosshatching' },
  ];

  for (const s of stylesWithoutImages) {
    await pool.query(
      'INSERT INTO styles (name, description, example_prompt, preview_url) VALUES ($1, $2, $3, $4)',
      [s.name, s.description, s.example_prompt, null]
    );
  }

  // Seed gallery items (15 items - 3 with generated images, 12 reusing existing images)
  const galleryWithImages = [
    { title: 'Mystic Mountains', prompt: 'Ethereal mountain landscape with floating islands', style: 'Watercolor' },
    { title: 'Neon Dreams', prompt: 'Cyberpunk city street at night with neon reflections', style: 'Digital Art' },
    { title: 'Ocean Serenity', prompt: 'Calm ocean waves at sunset with golden light', style: 'Oil Painting' },
  ];

  for (const g of galleryWithImages) {
    const imageBuffer = await safeGenerateImage(g.prompt, g.style);
    const filename = `gallery_${g.title.toLowerCase().replace(/\s+/g, '_')}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);
    generatedImagePaths.push(`/generated_images/${filename}`);

    await pool.query(
      'INSERT INTO gallery (user_id, title, description, image_url, prompt, style) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, g.title, `Generated with prompt: ${g.prompt}`, `/generated_images/${filename}`, g.prompt, g.style]
    );
  }

  const galleryExtras = [
    { title: 'Crystal Cavern', prompt: 'A vast underground cavern filled with glowing crystals', style: 'Digital Art' },
    { title: 'Autumn Village', prompt: 'A cozy village in autumn with smoke rising from chimneys', style: 'Watercolor' },
    { title: 'Starship Bridge', prompt: 'Interior of a starship command bridge with holographic displays', style: 'Concept Art' },
    { title: 'Samurai Sunset', prompt: 'A lone samurai standing on a cliff at sunset', style: 'Ukiyo-e' },
    { title: 'Enchanted Library', prompt: 'A magical library with floating books and glowing runes', style: 'Digital Art' },
    { title: 'Arctic Aurora', prompt: 'Northern lights over an arctic landscape with ice formations', style: 'Oil Painting' },
    { title: 'Clockwork Dragon', prompt: 'A mechanical steampunk dragon made of brass and gears', style: 'Concept Art' },
    { title: 'Fairy Garden', prompt: 'A miniature fairy garden with tiny houses and mushroom homes', style: 'Watercolor' },
    { title: 'Dystopian Ruins', prompt: 'Post-apocalyptic city ruins overgrown with vegetation', style: 'Digital Art' },
    { title: 'Celestial Temple', prompt: 'A floating temple among clouds with golden light beams', style: 'Oil Painting' },
    { title: 'Pirate Cove', prompt: 'A hidden pirate cove with treasure and an old ship', style: 'Watercolor' },
    { title: 'Neon Alley', prompt: 'A narrow alley in a cyberpunk city with rain and neon signs', style: 'Digital Art' },
  ];

  for (const g of galleryExtras) {
    const reusedImage = generatedImagePaths[Math.floor(Math.random() * generatedImagePaths.length)];
    await pool.query(
      'INSERT INTO gallery (user_id, title, description, image_url, prompt, style) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, g.title, `Generated with prompt: ${g.prompt}`, reusedImage, g.prompt, g.style]
    );
  }

  // Seed history (15 items - 3 with generated images, 12 reusing existing images)
  const historyWithImages = [
    { prompt: 'A magical forest with glowing mushrooms', style: 'Watercolor', status: 'completed' },
    { prompt: 'Futuristic space station interior', style: 'Digital Art', status: 'completed' },
    { prompt: 'Ancient Greek temple at sunset', style: 'Oil Painting', status: 'completed' },
  ];

  for (const h of historyWithImages) {
    const imageBuffer = await safeGenerateImage(h.prompt, h.style);
    const filename = `history_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);
    generatedImagePaths.push(`/generated_images/${filename}`);

    await pool.query(
      'INSERT INTO history (user_id, prompt, style, image_url, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, h.prompt, h.style, `/generated_images/${filename}`, h.status]
    );
  }

  const historyExtras = [
    { prompt: 'A dragon flying over a medieval castle', style: 'Digital Art', status: 'completed' },
    { prompt: 'Underwater coral reef with tropical fish', style: 'Watercolor', status: 'completed' },
    { prompt: 'A cyberpunk street market at night', style: 'Digital Art', status: 'completed' },
    { prompt: 'Snow-covered mountain cabin with warm light', style: 'Oil Painting', status: 'completed' },
    { prompt: 'A wizard casting a spell in a dark forest', style: 'Digital Art', status: 'completed' },
    { prompt: 'Japanese cherry blossom garden at dawn', style: 'Watercolor', status: 'completed' },
    { prompt: 'Abandoned space station floating in nebula', style: 'Concept Art', status: 'completed' },
    { prompt: 'A knight in shining armor on horseback', style: 'Oil Painting', status: 'completed' },
    { prompt: 'Steampunk airship flying over London', style: 'Digital Art', status: 'completed' },
    { prompt: 'A phoenix rising from flames', style: 'Digital Art', status: 'failed' },
    { prompt: 'Moonlit vampire castle on a cliff', style: 'Gothic', status: 'completed' },
    { prompt: 'A peaceful zen rock garden with raked sand', style: 'Minimalist', status: 'completed' },
  ];

  for (const h of historyExtras) {
    const reusedImage = h.status === 'completed' ? generatedImagePaths[Math.floor(Math.random() * generatedImagePaths.length)] : null;
    await pool.query(
      'INSERT INTO history (user_id, prompt, style, image_url, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, h.prompt, h.style, reusedImage, h.status]
    );
  }

  // Seed prompt_optimizer (15 items)
  const promptOptimizerData = [
    { original: 'A cat sitting on a windowsill', optimized: 'A fluffy orange tabby cat lounging on a sun-drenched windowsill, soft bokeh background of a garden, warm golden hour lighting, photorealistic, 8k detail', style: 'Photorealistic', quality: 'high', ai: { qualityScore: 9, improvements: ['Added specific cat breed', 'Added lighting details', 'Added background context', 'Added quality modifiers'], tips: ['Include specific breeds for more accurate results', 'Specify lighting conditions'], negativePrompt: 'blurry, low quality, distorted, extra limbs' } },
    { original: 'A sunset over the ocean', optimized: 'A breathtaking dramatic sunset over a vast turquoise ocean, vibrant orange and purple sky, sun rays breaking through cumulus clouds, calm waves reflecting colors, wide-angle cinematic composition', style: 'Photorealistic', quality: 'ultra', ai: { qualityScore: 9, improvements: ['Enhanced color description', 'Added cloud details', 'Added composition direction', 'Added reflection details'], tips: ['Use wide-angle for landscapes', 'Mention specific cloud types'], negativePrompt: 'overexposed, washed out, flat colors' } },
    { original: 'A robot', optimized: 'A sleek humanoid robot with chrome and blue LED accents, standing in a futuristic lab, holographic displays in background, cinematic lighting with volumetric fog, concept art style', style: 'Sci-Fi', quality: 'high', ai: { qualityScore: 8, improvements: ['Added material details', 'Added environment context', 'Added lighting style', 'Specified art style'], tips: ['Material descriptions add realism', 'Environmental context grounds the subject'], negativePrompt: 'cartoonish, low detail, pixelated' } },
    { original: 'A flower garden', optimized: 'A lush English cottage garden overflowing with roses, lavender, and wildflowers, stone pathway, morning dew on petals, soft diffused light, impressionist painting style with visible brushstrokes', style: 'Impressionist', quality: 'high', ai: { qualityScore: 9, improvements: ['Specified garden type', 'Added specific flowers', 'Added atmospheric details', 'Added artistic style reference'], tips: ['Name specific flower varieties', 'Morning/evening light adds mood'], negativePrompt: 'dead plants, withered, dark, gloomy' } },
    { original: 'A mountain', optimized: 'A towering snow-capped mountain peak piercing through clouds, alpine meadow with wildflowers in foreground, eagle soaring, dramatic golden hour lighting, landscape photography style', style: 'Photorealistic', quality: 'ultra', ai: { qualityScore: 9, improvements: ['Added scale with foreground elements', 'Added wildlife', 'Added atmospheric conditions', 'Added photography style'], tips: ['Foreground elements add depth', 'Wildlife adds life to landscapes'], negativePrompt: 'flat, boring composition, overprocessed' } },
    { original: 'A dragon', optimized: 'A massive ancient dragon with iridescent scales, perched on a volcanic mountain, breathing blue fire, storm clouds and lightning in background, epic fantasy art, highly detailed scales and wings', style: 'Fantasy', quality: 'ultra', ai: { qualityScore: 10, improvements: ['Added scale color details', 'Added dramatic setting', 'Added action element', 'Added atmospheric drama'], tips: ['Iridescent materials catch light beautifully', 'Action poses are more dynamic'], negativePrompt: 'cute, cartoonish, small, friendly looking' } },
    { original: 'A city at night', optimized: 'A sprawling metropolis at night viewed from a rooftop, thousands of glowing windows, car light trails on streets below, full moon, light fog creating halos around streetlights, noir photography style', style: 'Photorealistic', quality: 'high', ai: { qualityScore: 8, improvements: ['Added viewpoint', 'Added light trail effect', 'Added atmospheric fog', 'Added photographic style'], tips: ['Rooftop views add dramatic perspective', 'Light trails suggest motion and energy'], negativePrompt: 'daytime, empty streets, overlit' } },
    { original: 'A portrait of a woman', optimized: 'A stunning portrait of an elegant woman with flowing auburn hair, soft Rembrandt lighting, shallow depth of field, wearing a vintage lace dress, emerald eyes, fine art portrait photography', style: 'Portrait', quality: 'ultra', ai: { qualityScore: 9, improvements: ['Added specific hair color', 'Added classic lighting technique', 'Added clothing detail', 'Added eye color for character'], tips: ['Rembrandt lighting is classic and flattering', 'Shallow depth of field focuses attention'], negativePrompt: 'distorted face, extra fingers, asymmetric eyes, uncanny valley' } },
    { original: 'A spaceship', optimized: 'A massive interstellar battlecruiser emerging from hyperspace, blue energy trail, nearby planet and asteroid field, detailed hull plating with running lights, cinematic sci-fi concept art', style: 'Sci-Fi', quality: 'high', ai: { qualityScore: 9, improvements: ['Specified ship type', 'Added action (emerging from hyperspace)', 'Added environmental context', 'Added hull details'], tips: ['Action moments are more engaging', 'Scale references help convey size'], negativePrompt: 'toy-like, simple, cartoon, low polygon' } },
    { original: 'A cute dog', optimized: 'An adorable golden retriever puppy playing in a field of daisies, tongue out, tail wagging, soft natural sunlight, shallow depth of field, pet photography, joyful expression', style: 'Photorealistic', quality: 'high', ai: { qualityScore: 9, improvements: ['Specified breed and age', 'Added playful action', 'Added natural setting', 'Captured emotion'], tips: ['Specific breeds give clearer results', 'Action and emotion create engaging images'], negativePrompt: 'aggressive, scary, dark mood, blurry' } },
    { original: 'A haunted house', optimized: 'A decrepit Victorian haunted mansion on a hill, crooked shutters, broken windows with eerie green glow, twisted dead trees, full moon partially hidden by clouds, bats flying, horror movie poster style', style: 'Gothic', quality: 'high', ai: { qualityScore: 8, improvements: ['Added architectural era', 'Added decay details', 'Added eerie lighting', 'Added atmospheric elements'], tips: ['Period-specific architecture adds authenticity', 'Partial moon lighting is more atmospheric'], negativePrompt: 'cheerful, bright, well-maintained, daytime' } },
    { original: 'An underwater scene', optimized: 'A vibrant coral reef ecosystem teeming with tropical fish, sea turtles, and rays, sunlight filtering through crystal clear water creating caustic patterns, macro photography detail, National Geographic quality', style: 'Photorealistic', quality: 'ultra', ai: { qualityScore: 10, improvements: ['Added specific marine life', 'Added light caustics', 'Added photography reference', 'Added quality benchmark'], tips: ['Caustic light patterns are key for underwater scenes', 'Reference quality benchmarks like National Geographic'], negativePrompt: 'murky water, dead coral, pollution, dark' } },
    { original: 'A fairy tale castle', optimized: 'A magnificent fairy tale castle with soaring spires and turrets, sitting atop a lush green hill, rainbow arching overhead, butterflies and birds, surrounded by a moat with swans, storybook illustration style', style: 'Fantasy', quality: 'high', ai: { qualityScore: 8, improvements: ['Added architectural details', 'Added natural setting', 'Added wildlife', 'Added illustration style'], tips: ['Storybook style works well for fairy tales', 'Natural elements add life and color'], negativePrompt: 'dark, ruined, scary, war-torn, realistic' } },
    { original: 'A coffee shop', optimized: 'A cozy artisan coffee shop interior, exposed brick walls, warm pendant lighting, steam rising from ceramic cups, vintage decor, rain visible through fogged windows, hygge atmosphere, lifestyle photography', style: 'Photorealistic', quality: 'high', ai: { qualityScore: 9, improvements: ['Added interior design details', 'Added atmospheric elements', 'Added mood concept (hygge)', 'Added weather outside'], tips: ['Steam and fog add atmosphere', 'Contrasting inside warmth vs outside weather tells a story'], negativePrompt: 'empty, sterile, bright fluorescent, fast food' } },
    { original: 'A warrior', optimized: 'A battle-worn female warrior in ornate mythril armor, wielding a glowing enchanted sword, standing on a cliff edge, wind blowing her braided hair, army visible in valley below, epic fantasy art, dramatic lighting', style: 'Fantasy', quality: 'ultra', ai: { qualityScore: 10, improvements: ['Added gender and armor details', 'Added magical weapon', 'Added dramatic pose', 'Added scale with army below'], tips: ['Armor material names add visual richness', 'Elevation gives a commanding perspective'], negativePrompt: 'peaceful, modern clothing, no weapon, sitting' } },
  ];

  for (const p of promptOptimizerData) {
    await pool.query(
      'INSERT INTO prompt_optimizer (user_id, original_prompt, optimized_prompt, style, target_quality, ai_response) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, p.original, p.optimized, p.style, p.quality, JSON.stringify(p.ai)]
    );
  }

  // Seed art_instructor (15 items)
  const artInstructorData = [
    { topic: 'Color Theory Basics', skill: 'beginner', form: 'digital', lesson: 'Understanding the color wheel, primary, secondary, and tertiary colors. Learn how to create harmonious color palettes.', ai: { difficulty: 'beginner', lesson: 'Color theory is the foundation of all visual art...', keyPoints: ['Primary colors: red, blue, yellow', 'Secondary colors are created by mixing primaries', 'Complementary colors create contrast', 'Analogous colors create harmony'], techniques: ['Color wheel exercises', 'Palette creation', 'Color temperature studies'], exercises: [{ name: 'Color Wheel Practice', duration: '30 min', description: 'Create a full color wheel from primary colors' }], nextSteps: ['Study color psychology', 'Practice with limited palettes'] } },
    { topic: 'Portrait Drawing Fundamentals', skill: 'beginner', form: 'traditional', lesson: 'Learn the basic proportions of the human face and placement of features.', ai: { difficulty: 'beginner', lesson: 'The human face follows specific proportional guidelines...', keyPoints: ['Eyes are at the halfway point of the head', 'The face can be divided into thirds', 'Ears align with eyebrows and nose'], techniques: ['Loomis method', 'Grid technique', 'Gesture drawing'], exercises: [{ name: 'Feature Studies', duration: '45 min', description: 'Draw individual features: eyes, nose, mouth' }], nextSteps: ['Study facial expressions', 'Practice from life'] } },
    { topic: 'Digital Brushwork Techniques', skill: 'intermediate', form: 'digital', lesson: 'Master essential brush techniques for digital painting including opacity, flow, and custom brushes.', ai: { difficulty: 'intermediate', lesson: 'Digital brushwork requires understanding of pressure sensitivity...', keyPoints: ['Brush opacity vs flow differences', 'Custom brush creation', 'Texture brush techniques', 'Blending modes'], techniques: ['Dry brush effect', 'Wet edge simulation', 'Textured strokes'], exercises: [{ name: 'Brush Sampler', duration: '1 hour', description: 'Create a reference sheet of different brush effects' }], nextSteps: ['Create custom brush library', 'Study master painters brush techniques'] } },
    { topic: 'Perspective Drawing', skill: 'intermediate', form: 'traditional', lesson: 'Learn one-point, two-point, and three-point perspective for accurate spatial representation.', ai: { difficulty: 'intermediate', keyPoints: ['Vanishing points and horizon line', 'One-point for interior scenes', 'Two-point for buildings', 'Three-point for dramatic views'], techniques: ['Ruler-based construction', 'Freehand perspective', 'Atmospheric perspective'], exercises: [{ name: 'City Street Scene', duration: '1 hour', description: 'Draw a two-point perspective street scene' }], nextSteps: ['Study curvilinear perspective', 'Practice architectural drawing'] } },
    { topic: 'Light and Shadow Mastery', skill: 'advanced', form: 'digital', lesson: 'Advanced techniques for rendering realistic lighting including subsurface scattering and caustics.', ai: { difficulty: 'advanced', keyPoints: ['Core shadow vs cast shadow', 'Subsurface scattering in skin', 'Caustic light effects', 'Multiple light source interaction'], techniques: ['Chiaroscuro', 'Rim lighting', 'Ambient occlusion painting'], exercises: [{ name: 'Sphere Study', duration: '2 hours', description: 'Render a sphere with 3 different light sources' }], nextSteps: ['Study photographic lighting setups', 'Practice plein air digital painting'] } },
    { topic: 'Character Design Basics', skill: 'beginner', form: 'digital', lesson: 'Introduction to creating compelling character designs with strong silhouettes and visual storytelling.', ai: { difficulty: 'beginner', keyPoints: ['Silhouette readability', 'Shape language', 'Color coding characters', 'Costume design fundamentals'], techniques: ['Thumbnail sketching', 'Silhouette testing', 'Turnaround sheets'], exercises: [{ name: 'Hero vs Villain', duration: '45 min', description: 'Design a hero and villain using contrasting shapes' }], nextSteps: ['Study anatomy for artists', 'Learn expression sheets'] } },
    { topic: 'Watercolor Wet-on-Wet Technique', skill: 'intermediate', form: 'traditional', lesson: 'Master the wet-on-wet watercolor technique for creating soft, blended effects.', ai: { difficulty: 'intermediate', keyPoints: ['Water-to-pigment ratio', 'Timing is everything', 'Paper wetness levels', 'Color blooming effects'], techniques: ['Graded wash', 'Variegated wash', 'Wet-on-wet blending'], exercises: [{ name: 'Sky Study', duration: '30 min', description: 'Paint a sunset sky using wet-on-wet technique' }], nextSteps: ['Combine wet-on-wet with wet-on-dry', 'Study atmospheric effects'] } },
    { topic: 'Composition and Layout', skill: 'intermediate', form: 'mixed', lesson: 'Learn the principles of strong composition including rule of thirds, leading lines, and visual hierarchy.', ai: { difficulty: 'intermediate', keyPoints: ['Rule of thirds', 'Golden ratio', 'Leading lines', 'Visual weight and balance', 'Focal point placement'], techniques: ['Thumbnail planning', 'Value studies', 'Cropping exercises'], exercises: [{ name: 'Master Study', duration: '1 hour', description: 'Analyze and recreate the composition of a famous painting' }], nextSteps: ['Study cinematography composition', 'Practice dynamic compositions'] } },
    { topic: 'Anatomy for Artists', skill: 'advanced', form: 'traditional', lesson: 'Deep study of human anatomy focusing on muscle groups and skeletal structure for figure drawing.', ai: { difficulty: 'advanced', keyPoints: ['Major muscle groups', 'Skeletal landmarks', 'Proportional systems', 'Dynamic figure poses'], techniques: ['Gesture drawing', 'Ecorche studies', 'Constructive anatomy'], exercises: [{ name: 'Gesture Session', duration: '1 hour', description: '30-second to 5-minute gesture drawings from reference' }], nextSteps: ['Study animal anatomy', 'Practice foreshortening'] } },
    { topic: 'Digital Painting from Photos', skill: 'beginner', form: 'digital', lesson: 'Learn to use photo references effectively to create digital paintings without tracing.', ai: { difficulty: 'beginner', keyPoints: ['Reference vs copying', 'Color picking from photos', 'Simplifying complex scenes', 'Building confidence with references'], techniques: ['Block-in method', 'Color studies', 'Value mapping'], exercises: [{ name: 'Photo Study', duration: '1 hour', description: 'Paint a simple landscape from a photo reference' }], nextSteps: ['Practice painting from life', 'Try plein air digital painting'] } },
    { topic: 'Fantasy Environment Design', skill: 'advanced', form: 'digital', lesson: 'Create immersive fantasy environments with believable architecture and atmospheric effects.', ai: { difficulty: 'advanced', keyPoints: ['World-building through design', 'Architectural plausibility', 'Scale and proportion', 'Atmospheric perspective'], techniques: ['Photobashing', 'Matte painting', 'Overpainting'], exercises: [{ name: 'Fantasy City', duration: '3 hours', description: 'Design a fantasy city using photobashing and overpainting' }], nextSteps: ['Study real-world architecture', 'Learn about biome design'] } },
    { topic: 'Ink Drawing Techniques', skill: 'beginner', form: 'traditional', lesson: 'Introduction to ink drawing with pens, including line weight variation and cross-hatching.', ai: { difficulty: 'beginner', keyPoints: ['Line weight creates depth', 'Cross-hatching for values', 'Stippling technique', 'Ink wash basics'], techniques: ['Contour drawing', 'Cross-hatching', 'Stippling'], exercises: [{ name: 'Still Life in Ink', duration: '45 min', description: 'Draw a still life using only ink pens' }], nextSteps: ['Study comic book inking', 'Try brush pen techniques'] } },
    { topic: 'Concept Art for Games', skill: 'advanced', form: 'digital', lesson: 'Professional concept art techniques for game development, including rapid ideation and visual communication.', ai: { difficulty: 'advanced', keyPoints: ['Speed painting techniques', 'Visual communication', 'Design iteration', 'Production pipeline'], techniques: ['Thumbnail sketching', 'Speed painting', 'Material studies'], exercises: [{ name: 'Weapon Design Sheet', duration: '2 hours', description: 'Create a weapon design sheet with 10 variations' }], nextSteps: ['Build a portfolio', 'Study game design principles'] } },
    { topic: 'Color Mixing for Acrylics', skill: 'beginner', form: 'traditional', lesson: 'Learn how to mix acrylic paints to create a full range of colors from a limited palette.', ai: { difficulty: 'beginner', keyPoints: ['Limited palette approach', 'Warm vs cool primaries', 'Mixing greens and purples', 'Tinting and shading'], techniques: ['Palette knife mixing', 'Glazing', 'Dry brush'], exercises: [{ name: 'Color Charts', duration: '1 hour', description: 'Create color mixing charts from 6 tube colors' }], nextSteps: ['Study Zorn palette', 'Practice color matching'] } },
    { topic: 'Texture and Material Rendering', skill: 'intermediate', form: 'digital', lesson: 'Learn to render different materials convincingly: metal, fabric, glass, wood, and skin.', ai: { difficulty: 'intermediate', keyPoints: ['Specular vs diffuse reflection', 'Transparency and refraction', 'Fabric folds and draping', 'Surface roughness'], techniques: ['Material sphere studies', 'Texture overlays', 'Custom material brushes'], exercises: [{ name: 'Material Spheres', duration: '2 hours', description: 'Render 6 spheres with different materials: metal, glass, wood, fabric, stone, skin' }], nextSteps: ['Study PBR texturing', 'Practice cloth simulation reference'] } },
  ];

  for (const a of artInstructorData) {
    await pool.query(
      'INSERT INTO art_instructor (user_id, topic, skill_level, art_form, lesson_content, ai_response) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, a.topic, a.skill, a.form, a.lesson, JSON.stringify(a.ai)]
    );
  }

  // Seed style_transfer (15 items)
  const styleTransferData = [
    { source: 'Photograph', target: 'Van Gogh Starry Night', content: 'A peaceful countryside with rolling hills', prompt: 'Transform countryside photo into Van Gogh style with swirling skies and bold brushstrokes', ai: { analysisPrompt: 'Countryside with swirling Van Gogh sky, bold impasto brushstrokes, vibrant yellows and blues', styleElements: ['Swirling sky patterns', 'Bold impasto brushstrokes', 'Vibrant complementary colors'], colorPalette: ['Deep blue', 'Bright yellow', 'Olive green'], compositionTips: ['Emphasize sky area', 'Add movement to static elements'], expectedResult: 'A dreamy countryside scene with characteristic Van Gogh swirling patterns' } },
    { source: 'Digital Art', target: 'Anime', content: 'A warrior standing on a cliff overlooking the ocean', prompt: 'Convert digital art to anime style with cel shading and dramatic wind effect', ai: { analysisPrompt: 'Anime warrior on cliff, cel-shaded, wind-blown hair, dramatic ocean backdrop', styleElements: ['Cel shading', 'Large expressive eyes', 'Dynamic hair flow', 'Simplified shadows'], colorPalette: ['Saturated blues', 'Warm skin tones', 'Black outlines'], compositionTips: ['Use dramatic low angle', 'Add speed lines for wind'] } },
    { source: 'Realistic', target: 'Cyberpunk', content: 'A busy city street with tall buildings', prompt: 'Transform city street into cyberpunk dystopia with neon and holograms', ai: { analysisPrompt: 'Cyberpunk city street, neon signs in Japanese/English, holographic ads, rain-slicked streets', styleElements: ['Neon lighting', 'Holographic displays', 'Rain effects', 'Dense urban atmosphere'], colorPalette: ['Neon pink', 'Electric blue', 'Deep purple', 'Black'], compositionTips: ['Add vertical neon signs', 'Use reflections in wet surfaces'] } },
    { source: 'Photograph', target: 'Impressionist', content: 'A garden with sunflowers and a small pond', prompt: 'Transform garden photo into Monet-style impressionist painting', ai: { analysisPrompt: 'Impressionist garden scene, visible brushstrokes, dappled light, lily pond, Monet influence', styleElements: ['Visible brushstrokes', 'Light-focused palette', 'Soft edges', 'Atmospheric color'], colorPalette: ['Soft greens', 'Lavender', 'Warm yellow', 'Sky blue'], compositionTips: ['Focus on light and reflections', 'Soften all hard edges'] } },
    { source: 'Sketch', target: 'Watercolor', content: 'A medieval knight on horseback', prompt: 'Transform pencil sketch to loose watercolor illustration', ai: { analysisPrompt: 'Watercolor knight on horseback, wet washes, controlled bleeds, ink outlines visible', styleElements: ['Wet-on-wet washes', 'Ink line work showing through', 'Color bleeds at edges', 'White paper as highlights'], colorPalette: ['Raw sienna', 'Ultramarine blue', 'Burnt umber'], compositionTips: ['Leave white space for highlights', 'Let colors bleed naturally'] } },
    { source: 'Digital Art', target: 'Pop Art', content: 'A portrait of a person wearing sunglasses', prompt: 'Convert portrait to bold Warhol-inspired pop art', ai: { analysisPrompt: 'Pop art portrait, bold flat colors, halftone dots, high contrast, Warhol style', styleElements: ['Flat color areas', 'Halftone dot patterns', 'Bold outlines', 'Limited color palette'], colorPalette: ['Hot pink', 'Electric yellow', 'Cyan', 'Black'], compositionTips: ['Simplify to 4-5 colors', 'Use Ben-Day dots for shading'] } },
    { source: 'Photograph', target: 'Ukiyo-e', content: 'A large wave with Mount Fuji in the background', prompt: 'Transform ocean photo into Hokusai-style ukiyo-e woodblock print', ai: { analysisPrompt: 'Ukiyo-e great wave, woodblock print style, flat colors, bold outlines, Hokusai composition', styleElements: ['Flat color areas', 'Bold black outlines', 'Decorative foam patterns', 'Layered depth'], colorPalette: ['Prussian blue', 'White', 'Indigo', 'Pale yellow'], compositionTips: ['Emphasize wave curves', 'Add decorative foam patterns'] } },
    { source: 'Oil Painting', target: 'Pixel Art', content: 'A fantasy castle with towers and flags', prompt: 'Convert oil painting to retro pixel art style', ai: { analysisPrompt: '16-bit pixel art castle, limited palette, clean pixel placement, retro game aesthetic', styleElements: ['Clean pixel edges', 'Limited color palette', 'Dithering for gradients', 'Tile-based composition'], colorPalette: ['Stone gray', 'Forest green', 'Royal blue', 'Banner red'], compositionTips: ['Work at low resolution', 'Use dithering sparingly'] } },
    { source: 'Realistic', target: 'Art Nouveau', content: 'A woman surrounded by flowers', prompt: 'Transform portrait to Mucha-style Art Nouveau illustration', ai: { analysisPrompt: 'Art Nouveau woman with flowers, Mucha style, organic flowing lines, ornate border, muted palette', styleElements: ['Flowing organic lines', 'Ornate decorative borders', 'Flat color areas', 'Natural motifs'], colorPalette: ['Gold', 'Sage green', 'Dusty rose', 'Cream'], compositionTips: ['Add circular or arch framing', 'Use flowing hair as decorative element'] } },
    { source: 'Photograph', target: 'Studio Ghibli', content: 'A small house on a hillside with a garden', prompt: 'Transform house photo into Studio Ghibli animated style', ai: { analysisPrompt: 'Studio Ghibli hillside cottage, lush detailed garden, fluffy clouds, warm lighting, Miyazaki atmosphere', styleElements: ['Detailed backgrounds', 'Soft lighting', 'Lush vegetation', 'Whimsical charm'], colorPalette: ['Grass green', 'Sky blue', 'Warm brown', 'Soft white'], compositionTips: ['Add more vegetation detail', 'Soften colors for dreamlike quality'] } },
    { source: 'Digital Art', target: 'Watercolor', content: 'A dragon perched on a mountain peak', prompt: 'Convert digital dragon art to watercolor painting style', ai: { analysisPrompt: 'Watercolor dragon on mountain, wet washes for sky, dry brush for scales, ink outlines', styleElements: ['Wet washes for background', 'Dry brush for texture', 'Ink outlines', 'Pigment granulation'], colorPalette: ['Dragon red', 'Mountain gray', 'Sky wash blue'], compositionTips: ['Use wet-on-wet for atmospheric sky', 'Dry brush creates scale texture'] } },
    { source: 'Sketch', target: 'Anime', content: 'A group of friends at a festival', prompt: 'Transform sketch to colorful anime illustration', ai: { analysisPrompt: 'Anime festival scene, group of friends, colorful yukata, lanterns, cherry blossoms, vibrant', styleElements: ['Cel shading', 'Colorful character designs', 'Festival lighting', 'Cherry blossom particles'], colorPalette: ['Festival red', 'Lantern gold', 'Cherry pink', 'Night blue'], compositionTips: ['Create visual hierarchy with lighting', 'Use warm festival colors'] } },
    { source: 'Photograph', target: 'Cyberpunk', content: 'A motorcycle parked on a rainy street', prompt: 'Transform motorcycle photo into cyberpunk neon scene', ai: { analysisPrompt: 'Cyberpunk motorcycle, neon reflections on wet asphalt, holographic ads, rain, dark atmosphere', styleElements: ['Neon reflections', 'Rain effects', 'Dark atmosphere', 'Tech modifications to bike'], colorPalette: ['Neon cyan', 'Hot pink', 'Dark purple', 'Chrome'], compositionTips: ['Maximize reflections on wet surface', 'Add neon signage in background'] } },
    { source: 'Oil Painting', target: 'Impressionist', content: 'A bridge over a river with willows', prompt: 'Reimagine bridge scene in Monet impressionist style', ai: { analysisPrompt: 'Impressionist bridge scene, water lily reflections, weeping willows, dappled sunlight, Monet palette', styleElements: ['Broken color technique', 'Water reflections', 'Atmospheric light', 'Visible brushwork'], colorPalette: ['Water green', 'Willow yellow-green', 'Sky blue', 'Stone gray'], compositionTips: ['Focus on reflections in water', 'Use complementary colors for shadows'] } },
    { source: 'Realistic', target: 'Van Gogh Starry Night', content: 'A small village at night with a church', prompt: 'Transform village night scene to Van Gogh swirling night sky style', ai: { analysisPrompt: 'Van Gogh village at night, swirling starry sky, cypresses, church spire, impasto texture, bold colors', styleElements: ['Swirling sky patterns', 'Thick impasto texture', 'Bold color contrasts', 'Expressive brushwork'], colorPalette: ['Cobalt blue', 'Cadmium yellow', 'Viridian green', 'Deep purple'], compositionTips: ['Make sky the dominant element', 'Add cypress trees as vertical elements'] } },
  ];

  for (const s of styleTransferData) {
    await pool.query(
      'INSERT INTO style_transfer (user_id, source_style, target_style, content_description, analysis_prompt, ai_response) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, s.source, s.target, s.content, s.prompt, JSON.stringify(s.ai)]
    );
  }

  // Seed upscaler (15 items)
  const upscalerData = [
    { desc: 'High-detail portrait photograph', current: '512x512', target: '4096x4096', use: 'print', prompt: 'Enhance portrait with focus on skin detail, hair strands, and eye clarity, maintain natural skin texture', ai: { enhancementPrompt: 'Enhance portrait details...', recommendations: ['Use face-aware upscaling', 'Apply subtle sharpening to eyes', 'Preserve skin texture'], expectedImprovements: ['Sharper facial features', 'Visible hair strands', 'Clear eye detail'], processingTips: ['Process in tiles for memory efficiency', 'Apply denoising before upscaling'], postProcessing: ['Gentle unsharp mask', 'Noise reduction on flat areas'] } },
    { desc: 'Landscape digital painting', current: '1024x1024', target: '4096x3072', use: 'large_format', prompt: 'Upscale landscape with enhanced foliage detail, sky gradients, and water reflections', ai: { enhancementPrompt: 'Enhance landscape details...', recommendations: ['Use landscape-specific model', 'Enhance edge detail in trees'], expectedImprovements: ['Detailed foliage', 'Smooth sky gradients', 'Sharp horizon line'], processingTips: ['Maintain aspect ratio', 'Process sky separately if needed'] } },
    { desc: 'Vintage family photo from 1960s', current: '256x256', target: '2048x2048', use: 'restoration', prompt: 'Restore and upscale vintage photo, reduce grain, repair scratches, enhance facial features', ai: { enhancementPrompt: 'Restore vintage photo...', recommendations: ['Apply GFPGAN for face restoration', 'Use denoising for film grain', 'Repair scratches with inpainting'], expectedImprovements: ['Clear facial features', 'Reduced grain', 'Repaired damage'], processingTips: ['Face restore first, then upscale', 'Adjust color balance for aged photos'] } },
    { desc: 'Product photo for e-commerce', current: '512x512', target: '2048x2048', use: 'web', prompt: 'Upscale product photo maintaining sharp edges and accurate colors', ai: { enhancementPrompt: 'Sharpen product details...', recommendations: ['Use edge-preserving upscaling', 'Maintain color accuracy', 'Sharpen product edges'], expectedImprovements: ['Crisp product edges', 'Accurate colors', 'Clean background'], processingTips: ['Calibrate monitor for color accuracy', 'Use lossless format for output'] } },
    { desc: 'Anime illustration', current: '768x768', target: '3072x3072', use: 'poster', prompt: 'Upscale anime art maintaining clean lines and flat color areas', ai: { enhancementPrompt: 'Enhance anime illustration...', recommendations: ['Use waifu2x or similar anime-specific upscaler', 'Preserve line art crispness', 'Maintain flat color areas'], expectedImprovements: ['Crisp line art', 'Smooth color fills', 'No artifacts in gradients'], processingTips: ['Anime-specific models work best', 'Avoid over-sharpening flat areas'] } },
    { desc: 'Architectural interior photo', current: '1024x768', target: '4096x3072', use: 'print', prompt: 'Upscale interior photo with enhanced material textures and lighting', ai: { enhancementPrompt: 'Enhance interior details...', recommendations: ['Focus on material textures', 'Enhance window light effects', 'Sharpen furniture details'], expectedImprovements: ['Visible wood grain', 'Fabric texture detail', 'Clean geometric lines'] } },
    { desc: 'Nature macro photograph', current: '512x512', target: '4096x4096', use: 'large_format', prompt: 'Upscale macro photo with enhanced fine detail in petals, insects, and water droplets', ai: { enhancementPrompt: 'Enhance macro details...', recommendations: ['Use detail-focused upscaling', 'Enhance fine structures', 'Maintain bokeh quality'], expectedImprovements: ['Visible pollen grains', 'Sharp water droplets', 'Detailed wing structures'] } },
    { desc: 'Old scanned document', current: '256x256', target: '1024x1024', use: 'restoration', prompt: 'Upscale scanned document improving text readability and reducing noise', ai: { enhancementPrompt: 'Improve document clarity...', recommendations: ['Binarize text areas', 'Remove scanning artifacts', 'Straighten if skewed'], expectedImprovements: ['Readable text', 'Clean backgrounds', 'Sharp edges'] } },
    { desc: 'Fantasy game asset sprite', current: '256x256', target: '2048x2048', use: 'web', prompt: 'Upscale game sprite maintaining pixel-perfect edges and transparency', ai: { enhancementPrompt: 'Upscale game sprite...', recommendations: ['Use nearest-neighbor for pixel art', 'Or use AI upscaler for smooth look', 'Preserve alpha channel'], expectedImprovements: ['Clean edges', 'Preserved transparency', 'No interpolation blur'] } },
    { desc: 'Concert photograph in low light', current: '512x512', target: '2048x2048', use: 'print', prompt: 'Upscale low-light concert photo, reduce noise while preserving stage lighting effects', ai: { enhancementPrompt: 'Denoise and enhance concert photo...', recommendations: ['Apply aggressive denoising', 'Preserve intentional light effects', 'Enhance performer details'], expectedImprovements: ['Reduced noise', 'Clear performer faces', 'Preserved atmosphere'] } },
    { desc: 'Satellite earth imagery', current: '1024x1024', target: '4096x4096', use: 'large_format', prompt: 'Upscale satellite imagery enhancing terrain detail and color accuracy', ai: { enhancementPrompt: 'Enhance satellite terrain...', recommendations: ['Use terrain-aware upscaling', 'Enhance water body edges', 'Improve vegetation detail'], expectedImprovements: ['Visible road networks', 'Clear water boundaries', 'Detailed terrain'] } },
    { desc: 'Fashion photography for magazine', current: '1920x1080', target: '5120x2880', use: 'print', prompt: 'Upscale fashion photo to 5K for magazine spread, enhance fabric and accessory detail', ai: { enhancementPrompt: 'Enhance fashion details...', recommendations: ['Focus on fabric texture', 'Sharpen accessory details', 'Maintain skin quality'], expectedImprovements: ['Visible fabric weave', 'Sharp jewelry detail', 'Smooth skin tones'] } },
    { desc: 'Food photography', current: '512x512', target: '2048x2048', use: 'web', prompt: 'Upscale food photo enhancing texture and color vibrancy for menu use', ai: { enhancementPrompt: 'Enhance food details...', recommendations: ['Enhance food texture', 'Boost color saturation slightly', 'Sharpen steam and garnish details'], expectedImprovements: ['Visible food texture', 'Vibrant colors', 'Appetizing presentation'] } },
    { desc: 'Pet portrait photo', current: '768x768', target: '3072x3072', use: 'poster', prompt: 'Upscale pet portrait enhancing fur detail and eye clarity', ai: { enhancementPrompt: 'Enhance pet portrait...', recommendations: ['Use pet-aware enhancement', 'Focus on fur texture', 'Enhance eye catchlights'], expectedImprovements: ['Individual fur strands', 'Clear sparkling eyes', 'Nose detail'] } },
    { desc: 'Wedding photograph', current: '1024x1024', target: '4096x4096', use: 'large_format', prompt: 'Upscale wedding photo for large canvas print, enhance dress detail and facial features', ai: { enhancementPrompt: 'Enhance wedding portrait...', recommendations: ['Face restoration for clarity', 'Dress fabric detail enhancement', 'Venue background sharpening'], expectedImprovements: ['Clear expressions', 'Lace detail visible', 'Beautiful venue backdrop'] } },
  ];

  for (const u of upscalerData) {
    await pool.query(
      'INSERT INTO upscaler (user_id, image_description, current_resolution, target_resolution, use_case, enhancement_prompt, ai_response) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, u.desc, u.current, u.target, u.use, u.prompt, JSON.stringify(u.ai)]
    );
  }

  // Seed variation_generator (15 items)
  const variationData = [
    { prompt: 'A majestic dragon flying over a medieval castle at dawn', num: 5, type: 'creative', vars: [{ prompt: 'An ice dragon soaring above a frozen fortress at dawn, frost trailing from its wings', style: 'Fantasy', mood: 'Mysterious' }, { prompt: 'A tiny dragon hovering over a sand castle on a beach at sunrise', style: 'Whimsical', mood: 'Joyful' }, { prompt: 'A mechanical steampunk dragon flying over a Victorian castle, steam and gears', style: 'Steampunk', mood: 'Energetic' }, { prompt: 'A ghost dragon gliding through a ruined castle at twilight', style: 'Gothic', mood: 'Melancholic' }, { prompt: 'A fire dragon defending a castle under siege, flames lighting the dawn sky', style: 'Epic Fantasy', mood: 'Energetic' }], ai: { originalAnalysis: { theme: 'Fantasy', elements: ['dragon', 'castle', 'dawn'], mood: 'Majestic' }, variations: [], variationStrategy: { approach: 'Element substitution and mood shifting' } } },
    { prompt: 'A cozy coffee shop interior with warm lighting and books', num: 4, type: 'mood', vars: [{ prompt: 'A melancholic coffee shop on a rainy afternoon, dim lighting, empty chairs, condensation on windows', mood: 'Melancholic' }, { prompt: 'A bustling vibrant coffee shop full of artists and musicians, colorful murals, espresso steam', mood: 'Energetic' }, { prompt: 'A mysterious coffee shop at midnight, candles flickering, old books, jazz playing softly', mood: 'Mysterious' }, { prompt: 'A serene Japanese-style tea house with minimalist decor, zen garden visible through window', mood: 'Peaceful' }], ai: { originalAnalysis: { theme: 'Interior', elements: ['coffee shop', 'lighting', 'books'] } } },
    { prompt: 'An astronaut exploring an alien planet with strange vegetation', num: 6, type: 'style', vars: [{ prompt: 'An astronaut exploring an alien planet, Studio Ghibli anime style', style: 'Anime' }, { prompt: 'An astronaut on alien planet, retro 1950s sci-fi pulp magazine cover style', style: 'Retro Sci-Fi' }, { prompt: 'An astronaut among alien plants, photorealistic NASA photography style', style: 'Photorealistic' }, { prompt: 'An astronaut in alien vegetation, pixel art retro game style', style: 'Pixel Art' }, { prompt: 'An astronaut exploring alien world, watercolor botanical illustration style', style: 'Watercolor' }, { prompt: 'An astronaut on alien planet, dark moody concept art for a horror game', style: 'Horror Concept Art' }], ai: { originalAnalysis: { theme: 'Sci-Fi', elements: ['astronaut', 'alien planet', 'vegetation'] } } },
    { prompt: 'A lighthouse on a rocky coast during a storm', num: 5, type: 'lighting', vars: [{ prompt: 'A lighthouse at golden hour, warm amber light, calm seas, seagulls', mood: 'Peaceful' }, { prompt: 'A lighthouse in thick fog, beam cutting through mist, eerie moonlight', mood: 'Mysterious' }, { prompt: 'A lighthouse during a fierce lightning storm, dramatic chiaroscuro', mood: 'Energetic' }, { prompt: 'A lighthouse at blue hour twilight, bioluminescent waves', mood: 'Mysterious' }, { prompt: 'A lighthouse at sunrise, pink and orange sky, dewy morning light', mood: 'Peaceful' }], ai: { originalAnalysis: { theme: 'Seascape', elements: ['lighthouse', 'coast', 'storm'] } } },
    { prompt: 'A fox in a snowy forest', num: 4, type: 'perspective', vars: [{ prompt: 'Close-up macro shot of a fox face in snow, individual snowflakes on fur' }, { prompt: 'Aerial drone view of a tiny fox crossing a vast snowy forest clearing' }, { prompt: 'Low-angle shot from ground level, fox towering above, snow falling' }, { prompt: 'Fox silhouette against a sunset, long shadows on snow, telephoto compression' }], ai: { originalAnalysis: { theme: 'Wildlife', elements: ['fox', 'snow', 'forest'] } } },
    { prompt: 'A grand ballroom with crystal chandeliers', num: 5, type: 'time', vars: [{ prompt: 'A grand ballroom at midnight, moonlight through windows, dancing shadows' }, { prompt: 'A grand ballroom in morning sunlight, dust motes in golden rays, empty and peaceful' }, { prompt: 'A grand ballroom at sunset, warm amber light through stained glass, preparations for a ball' }, { prompt: 'A grand ballroom in winter, ice crystals on windows, snow-white decor' }, { prompt: 'A grand ballroom in spring, flower garlands, open windows, breeze moving curtains' }], ai: { originalAnalysis: { theme: 'Architecture', elements: ['ballroom', 'chandeliers'] } } },
    { prompt: 'A samurai meditating in a bamboo grove', num: 4, type: 'creative', vars: [{ prompt: 'A cyberpunk samurai meditating in a neon bamboo grove, holographic cherry blossoms', style: 'Cyberpunk' }, { prompt: 'A child samurai practicing with a wooden sword in a bamboo grove, butterflies around', style: 'Anime', mood: 'Joyful' }, { prompt: 'A ghost samurai meditating in an ancient bamboo grove, spirit energy swirling', style: 'Fantasy', mood: 'Mysterious' }, { prompt: 'A robotic samurai powering down in a bamboo grove, nature reclaiming technology', style: 'Sci-Fi' }], ai: { originalAnalysis: { theme: 'Japanese', elements: ['samurai', 'meditation', 'bamboo'] } } },
    { prompt: 'A vintage train station platform', num: 5, type: 'mood', vars: [{ prompt: 'A bustling 1920s train station, steam engine arriving, excited crowd, art deco architecture', mood: 'Energetic' }, { prompt: 'An empty abandoned train station at night, single flickering light, cobwebs, silence', mood: 'Melancholic' }, { prompt: 'A magical train station with a glowing purple train, stars visible through glass ceiling', mood: 'Mysterious' }, { prompt: 'A sunny small-town station in spring, flower boxes, station cat sleeping, gentle breeze', mood: 'Peaceful' }, { prompt: 'A war-era station with soldiers departing, emotional farewells, steam and tears', mood: 'Melancholic' }], ai: { originalAnalysis: { theme: 'Architecture', elements: ['train station', 'vintage', 'platform'] } } },
    { prompt: 'A waterfall in a tropical jungle', num: 4, type: 'style', vars: [{ prompt: 'A waterfall in tropical jungle, Monet impressionist painting style', style: 'Impressionist' }, { prompt: 'A waterfall in jungle, detailed botanical illustration with labeled plants', style: 'Scientific Illustration' }, { prompt: 'A waterfall in jungle, minimalist vector art with flat colors', style: 'Minimalist' }, { prompt: 'A waterfall in jungle, dramatic HDR photography with extreme contrast', style: 'HDR Photography' }], ai: { originalAnalysis: { theme: 'Nature', elements: ['waterfall', 'jungle', 'tropical'] } } },
    { prompt: 'A wizard tower filled with books and potions', num: 5, type: 'creative', vars: [{ prompt: 'A modern wizard tech startup office, coding on magical screens, potion energy drinks', style: 'Modern Fantasy' }, { prompt: 'A tiny mouse wizard in a thimble tower, miniature book stacks, acorn potions', style: 'Whimsical', mood: 'Joyful' }, { prompt: 'A dark necromancer tower with cursed books and bubbling green potions, storm outside', style: 'Dark Fantasy', mood: 'Mysterious' }, { prompt: 'An underwater wizard tower made of coral, sea scroll books, pearl potions', style: 'Fantasy' }, { prompt: 'A wizard tower in the clouds, books floating on air currents, rainbow potions', style: 'Fantasy', mood: 'Joyful' }], ai: { originalAnalysis: { theme: 'Fantasy', elements: ['wizard', 'tower', 'books', 'potions'] } } },
    { prompt: 'A bridge over a misty river', num: 4, type: 'lighting', vars: [{ prompt: 'A stone bridge over a river at golden hour, warm light, long shadows, fireflies appearing' }, { prompt: 'A bridge over a river in dense morning fog, barely visible, ethereal, monochrome' }, { prompt: 'A bridge lit by paper lanterns at night, reflections dancing on dark water' }, { prompt: 'A frozen bridge in winter moonlight, ice crystals catching blue light, snow falling' }], ai: { originalAnalysis: { theme: 'Landscape', elements: ['bridge', 'river', 'mist'] } } },
    { prompt: 'A cat sleeping on a stack of books', num: 4, type: 'perspective', vars: [{ prompt: 'Extreme close-up of sleeping cat face on books, shallow depth of field, visible whiskers' }, { prompt: 'Wide shot of entire cozy library with tiny sleeping cat barely visible on book stack' }, { prompt: 'Overhead bird-eye view looking down at cat curled on books, circular composition' }, { prompt: 'Low angle from floor level, cat and books towering above, dramatic proportions' }], ai: { originalAnalysis: { theme: 'Domestic', elements: ['cat', 'books', 'sleeping'] } } },
    { prompt: 'A pirate ship sailing through a storm', num: 5, type: 'creative', vars: [{ prompt: 'A ghost pirate ship sailing through a supernatural storm, spectral crew, green lightning', style: 'Gothic', mood: 'Mysterious' }, { prompt: 'A LEGO pirate ship in a bathtub storm, rubber duck kraken attacking', style: 'Toy Photography', mood: 'Joyful' }, { prompt: 'A space pirate ship navigating through an asteroid storm in deep space', style: 'Sci-Fi', mood: 'Energetic' }, { prompt: 'A steampunk pirate airship flying through a thunderstorm above the clouds', style: 'Steampunk', mood: 'Energetic' }, { prompt: 'A pirate ship made of candy sailing through a chocolate milk storm, candy rain', style: 'Surreal', mood: 'Joyful' }], ai: { originalAnalysis: { theme: 'Adventure', elements: ['pirate ship', 'storm', 'sailing'] } } },
    { prompt: 'A futuristic city skyline', num: 4, type: 'time', vars: [{ prompt: 'A futuristic city skyline at dawn, first light reflecting off glass towers, drones delivering breakfast' }, { prompt: 'A futuristic city at noon, bustling with flying vehicles, holographic billboards at max brightness' }, { prompt: 'A futuristic city skyline at sunset, golden hour on chrome buildings, workers heading home' }, { prompt: 'A futuristic city at midnight, neon lights, quiet streets, maintenance robots working' }], ai: { originalAnalysis: { theme: 'Sci-Fi', elements: ['city', 'skyline', 'futuristic'] } } },
    { prompt: 'A garden cottage with flowers', num: 5, type: 'style', vars: [{ prompt: 'A garden cottage, Thomas Kinkade glowing light style, cozy and warm', style: 'Thomas Kinkade' }, { prompt: 'A garden cottage, Studio Ghibli anime style, lush hand-painted backgrounds', style: 'Studio Ghibli' }, { prompt: 'A garden cottage, architectural blueprint style, technical drawing with measurements', style: 'Technical Drawing' }, { prompt: 'A garden cottage, Van Gogh bold brushwork, swirling garden, vibrant colors', style: 'Post-Impressionist' }, { prompt: 'A garden cottage, gothic dark fairy tale style, overgrown, mysterious, twilight', style: 'Dark Fairy Tale' }], ai: { originalAnalysis: { theme: 'Pastoral', elements: ['cottage', 'garden', 'flowers'] } } },
  ];

  for (const v of variationData) {
    const aiData = { ...v.ai, variations: v.vars };
    await pool.query(
      'INSERT INTO variation_generator (user_id, original_prompt, num_variations, variation_type, variations, ai_response) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, v.prompt, v.num, v.type, JSON.stringify(v.vars), JSON.stringify(aiData)]
    );
  }

  // Seed brand_asset_creator (15 items)
  const brandAssetData = [
    { name: 'TechNova', values: 'Innovation, cutting-edge technology, reliability', type: 'Logo', colors: 'Blue, silver, white', prompt: 'Modern tech logo, abstract circuit pattern forming letter T, blue gradient, clean lines, minimalist, white background', ai: { generationPrompt: 'Modern tech logo...', designConcept: 'Abstract circuit pattern forming the letter T', colorScheme: { primary: '#3B82F6', secondary: '#94A3B8', accent: '#F8FAFC' }, typography: { heading: 'Inter Bold', body: 'Inter Regular' }, variations: ['Dark background version', 'Monochrome version', 'Icon-only version'], usageGuidelines: ['Maintain clear space around logo', 'Do not rotate or skew'] } },
    { name: 'Green Earth Organics', values: 'Sustainability, natural, healthy', type: 'Brand Kit', colors: 'Forest green, earth brown, cream', prompt: 'Organic brand kit with leaf motif, earth tones, natural textures, sustainable feel', ai: { generationPrompt: 'Organic brand identity...', designConcept: 'Leaf growing from earth, natural cycle symbolism', colorScheme: { primary: '#166534', secondary: '#78350F', accent: '#FFFBEB' }, typography: { heading: 'Playfair Display', body: 'Lato' }, variations: ['Seasonal variants', 'Product line sub-brands'], usageGuidelines: ['Use recycled paper for print', 'Earthy color palette only'] } },
    { name: 'Luxe Studio', values: 'Luxury, elegance, exclusivity', type: 'Social Media Kit', colors: 'Gold, black, ivory', prompt: 'Luxury social media templates with gold accents, elegant typography, high-end feel', ai: { generationPrompt: 'Luxury social media...', designConcept: 'Minimalist luxury with gold leaf accents', colorScheme: { primary: '#D4AF37', secondary: '#1A1A2E', accent: '#FFFFF0' }, typography: { heading: 'Didot', body: 'Montserrat Light' }, variations: ['Instagram post', 'Story template', 'LinkedIn banner'], usageGuidelines: ['Maintain high contrast', 'Use gold sparingly for impact'] } },
    { name: 'FitPulse', values: 'Energy, health, motivation', type: 'App Icon', colors: 'Orange, white, dark gray', prompt: 'Fitness app icon, dynamic pulse/heartbeat shape, energetic orange gradient, rounded corners', ai: { generationPrompt: 'Fitness app icon...', designConcept: 'Heartbeat pulse forming running figure', colorScheme: { primary: '#F97316', secondary: '#FFFFFF', accent: '#374151' }, typography: { heading: 'Poppins Bold' }, variations: ['Light mode', 'Dark mode', 'Notification badge'], usageGuidelines: ['Test at all icon sizes', 'Ensure visibility against any wallpaper'] } },
    { name: 'Ocean Blue Resorts', values: 'Relaxation, luxury travel, tropical', type: 'Logo', colors: 'Ocean blue, sand gold, white', prompt: 'Resort logo with wave and palm tree, ocean blue gradient, elegant serif font, tropical elegance', ai: { generationPrompt: 'Tropical resort logo...', designConcept: 'Stylized wave with palm tree silhouette', colorScheme: { primary: '#0891B2', secondary: '#D4A656', accent: '#FFFFFF' }, typography: { heading: 'Cormorant Garamond' }, variations: ['Horizontal layout', 'Stacked layout', 'Embroidery version'], usageGuidelines: ['Use on light backgrounds primarily', 'Gold version for dark backgrounds'] } },
    { name: 'ByteForge', values: 'Innovation, developer tools, open source', type: 'Icon Set', colors: 'Purple, electric blue, dark', prompt: 'Developer tool icon set, geometric shapes, code-inspired design, consistent line weight', ai: { generationPrompt: 'Developer icon set...', designConcept: 'Code brackets and binary forming tool shapes', colorScheme: { primary: '#7C3AED', secondary: '#3B82F6', accent: '#0F172A' }, variations: ['Filled icons', 'Outline icons', 'Duotone icons'], usageGuidelines: ['Maintain consistent stroke width', 'Use on dark IDE backgrounds'] } },
    { name: 'Petal & Bloom', values: 'Natural beauty, floral, artisanal', type: 'Packaging', colors: 'Blush pink, sage green, cream', prompt: 'Floral packaging design with hand-drawn botanicals, pastel palette, artisanal feel, premium paper texture', ai: { generationPrompt: 'Floral packaging...', designConcept: 'Hand-drawn botanical illustrations with watercolor accents', colorScheme: { primary: '#FBC4D0', secondary: '#86B07D', accent: '#FFF8F0' }, typography: { heading: 'Playfair Display Italic', body: 'Raleway' }, variations: ['Gift box', 'Shopping bag', 'Ribbon design'], usageGuidelines: ['Print on textured paper', 'Botanicals should feel hand-drawn'] } },
    { name: 'SpeedRacer Gaming', values: 'Speed, competition, excitement', type: 'Logo', colors: 'Red, black, chrome', prompt: 'Racing game logo with speed lines, aggressive angular typography, chrome metallic effect, racing flag element', ai: { generationPrompt: 'Racing game logo...', designConcept: 'Angular speed lines forming a racing flag pattern', colorScheme: { primary: '#DC2626', secondary: '#09090B', accent: '#E5E7EB' }, typography: { heading: 'Russo One' }, variations: ['Animated version', 'Simplified mobile version', 'Embroidered patch'], usageGuidelines: ['Use on dark backgrounds for maximum impact', 'Chrome effect for premium materials'] } },
    { name: 'Mindful Space', values: 'Calm, wellness, mindfulness', type: 'Brand Kit', colors: 'Lavender, soft gray, white', prompt: 'Wellness brand kit with zen circle, soft gradients, breathing space in design, calming aesthetic', ai: { generationPrompt: 'Wellness brand identity...', designConcept: 'Zen enso circle with soft gradient', colorScheme: { primary: '#C4B5FD', secondary: '#D1D5DB', accent: '#FFFFFF' }, typography: { heading: 'Quicksand', body: 'Open Sans Light' }, variations: ['App design system', 'Print materials', 'Meditation card deck'], usageGuidelines: ['Maximize white space', 'Soft transitions only, no hard edges'] } },
    { name: 'Wild Frontier', values: 'Adventure, outdoors, exploration', type: 'Logo', colors: 'Forest green, burnt orange, cream', prompt: 'Outdoor adventure logo with mountain and compass, vintage badge style, rugged typography', ai: { generationPrompt: 'Adventure brand logo...', designConcept: 'Mountain silhouette inside compass rose badge', colorScheme: { primary: '#15803D', secondary: '#C2410C', accent: '#FFFBEB' }, typography: { heading: 'Oswald' }, variations: ['Badge version', 'Horizontal lockup', 'Embroidered patch'], usageGuidelines: ['Works on natural backgrounds', 'Vintage texture optional'] } },
    { name: 'Melody Records', values: 'Music, creativity, artistry', type: 'Album Art', colors: 'Deep purple, gold, black', prompt: 'Music label album art template, abstract sound waves, gold accents, atmospheric, vinyl-inspired', ai: { generationPrompt: 'Album art template...', designConcept: 'Abstract sound waves with golden particle effects', colorScheme: { primary: '#581C87', secondary: '#D4AF37', accent: '#000000' }, typography: { heading: 'Bebas Neue', body: 'Source Sans Pro' }, variations: ['Single cover', 'EP cover', 'Playlist cover'], usageGuidelines: ['Square format always', 'Title at top or bottom third'] } },
    { name: 'CloudStack', values: 'Reliability, scalability, modern infrastructure', type: 'Logo', colors: 'Sky blue, white, dark navy', prompt: 'Cloud infrastructure logo with stacked cloud layers, modern gradient, clean sans-serif, tech forward', ai: { generationPrompt: 'Cloud tech logo...', designConcept: 'Three stacked cloud layers representing scalability', colorScheme: { primary: '#0EA5E9', secondary: '#FFFFFF', accent: '#0F172A' }, typography: { heading: 'Space Grotesk' }, variations: ['Horizontal', 'Stacked', 'Favicon'], usageGuidelines: ['Maintain gradient direction top-to-bottom', 'Clear space minimum 2x logo height'] } },
    { name: 'Artisan Bakehouse', values: 'Handcrafted, traditional, warm', type: 'Packaging', colors: 'Warm brown, cream, rustic red', prompt: 'Bakery packaging with wheat illustration, warm rustic feel, kraft paper texture, hand-lettered logo', ai: { generationPrompt: 'Artisan bakery packaging...', designConcept: 'Hand-drawn wheat sheaf with vintage lettering', colorScheme: { primary: '#92400E', secondary: '#FFFBEB', accent: '#991B1B' }, typography: { heading: 'Amatic SC', body: 'Merriweather' }, variations: ['Bread bag', 'Cake box', 'Coffee cup sleeve'], usageGuidelines: ['Print on kraft paper when possible', 'Avoid glossy finishes'] } },
    { name: 'NovaPet', values: 'Pet care, love, trust', type: 'Social Media Kit', colors: 'Teal, warm yellow, white', prompt: 'Pet care social media kit with paw prints, friendly rounded design, pet silhouettes, warm feel', ai: { generationPrompt: 'Pet care social media...', designConcept: 'Paw print trail forming heart shape', colorScheme: { primary: '#0D9488', secondary: '#FBBF24', accent: '#FFFFFF' }, typography: { heading: 'Nunito Bold', body: 'Nunito Regular' }, variations: ['Dog-focused', 'Cat-focused', 'General pet'], usageGuidelines: ['Always include pet imagery', 'Keep tone warm and friendly'] } },
    { name: 'Quantum Labs', values: 'Research, precision, future', type: 'Presentation', colors: 'Electric blue, white, charcoal', prompt: 'Scientific presentation template with molecular structure background, clean data visualizations, professional', ai: { generationPrompt: 'Scientific presentation...', designConcept: 'Molecular lattice structure as background pattern', colorScheme: { primary: '#2563EB', secondary: '#FFFFFF', accent: '#374151' }, typography: { heading: 'IBM Plex Sans', body: 'IBM Plex Sans Light' }, variations: ['Conference talk', 'Research paper', 'Investor deck'], usageGuidelines: ['Data visualizations must be colorblind-safe', 'Maintain high contrast for projectors'] } },
  ];

  for (const b of brandAssetData) {
    await pool.query(
      'INSERT INTO brand_asset_creator (user_id, brand_name, brand_values, asset_type, color_preferences, generation_prompt, ai_response) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [userId, b.name, b.values, b.type, b.colors, b.prompt, JSON.stringify(b.ai)]
    );
  }

  // Seed ai_history (15 items logging AI tool usage)
  const aiHistoryData = [
    { feature: 'prompt_optimizer', title: 'Optimized: A cat sitting on a windowsill', input: { original_prompt: 'A cat sitting on a windowsill', style: 'Photorealistic', target_quality: 'high' }, ai: { qualityScore: 9, improvements: ['Added specific cat breed', 'Added lighting details'] } },
    { feature: 'art_instructor', title: 'Lesson: Color Theory Basics', input: { topic: 'Color Theory Basics', skill_level: 'beginner', art_form: 'digital' }, ai: { difficulty: 'beginner', keyPoints: ['Primary colors', 'Color wheel'] } },
    { feature: 'style_transfer', title: 'Photo → Van Gogh: Countryside', input: { source_style: 'Photograph', target_style: 'Van Gogh Starry Night', content: 'countryside' }, ai: { styleElements: ['Swirling patterns', 'Bold brushstrokes'] } },
    { feature: 'upscaler', title: 'Upscale: Portrait 512→4096', input: { image_description: 'Portrait', current: '512x512', target: '4096x4096' }, ai: { recommendations: ['Face-aware upscaling', 'Subtle sharpening'] } },
    { feature: 'variation_generator', title: '5 Variations: Dragon over castle', input: { original_prompt: 'A dragon flying over a castle', num_variations: 5 }, ai: { variations: ['Ice dragon', 'Mechanical dragon'] } },
    { feature: 'brand_asset_creator', title: 'Brand: TechNova Logo', input: { brand_name: 'TechNova', asset_type: 'Logo' }, ai: { designConcept: 'Circuit pattern letter T' } },
    { feature: 'prompt_optimizer', title: 'Optimized: A sunset over the ocean', input: { original_prompt: 'A sunset over the ocean', style: 'Photorealistic', target_quality: 'ultra' }, ai: { qualityScore: 9, improvements: ['Enhanced color description'] } },
    { feature: 'art_instructor', title: 'Lesson: Portrait Drawing', input: { topic: 'Portrait Drawing', skill_level: 'beginner', art_form: 'traditional' }, ai: { difficulty: 'beginner', keyPoints: ['Proportions', 'Feature placement'] } },
    { feature: 'style_transfer', title: 'Digital Art → Anime: Warrior', input: { source_style: 'Digital Art', target_style: 'Anime', content: 'warrior on cliff' }, ai: { styleElements: ['Cel shading', 'Dynamic hair'] } },
    { feature: 'upscaler', title: 'Upscale: Vintage Photo 256→2048', input: { image_description: 'Vintage photo', current: '256x256', target: '2048x2048' }, ai: { recommendations: ['GFPGAN face restoration'] } },
    { feature: 'variation_generator', title: '4 Variations: Coffee shop', input: { original_prompt: 'Coffee shop interior', num_variations: 4 }, ai: { variations: ['Rainy afternoon', 'Midnight jazz'] } },
    { feature: 'brand_asset_creator', title: 'Brand: Green Earth Organics', input: { brand_name: 'Green Earth Organics', asset_type: 'Brand Kit' }, ai: { designConcept: 'Leaf growing from earth' } },
    { feature: 'prompt_optimizer', title: 'Optimized: A dragon', input: { original_prompt: 'A dragon', style: 'Fantasy', target_quality: 'ultra' }, ai: { qualityScore: 10, improvements: ['Scale color details', 'Dramatic setting'] } },
    { feature: 'art_instructor', title: 'Lesson: Light and Shadow', input: { topic: 'Light and Shadow', skill_level: 'advanced', art_form: 'digital' }, ai: { difficulty: 'advanced', keyPoints: ['Subsurface scattering', 'Multiple light sources'] } },
    { feature: 'style_transfer', title: 'Realistic → Cyberpunk: City Street', input: { source_style: 'Realistic', target_style: 'Cyberpunk', content: 'city street' }, ai: { styleElements: ['Neon lighting', 'Rain effects'] } },
  ];

  for (const h of aiHistoryData) {
    await pool.query(
      'INSERT INTO ai_history (user_id, feature, title, input_data, ai_response) VALUES ($1, $2, $3, $4, $5)',
      [userId, h.feature, h.title, JSON.stringify(h.input), JSON.stringify(h.ai)]
    );
  }

  console.log('Seed complete! Created:');
  console.log('- 1 demo user (demo@example.com / password123)');
  console.log('- 16 prompts');
  console.log('- 15 styles (3 with preview images, 12 without)');
  console.log('- 15 gallery items (3 with generated images, 12 reusing images)');
  console.log('- 15 history entries (3 with generated images, 12 reusing images)');
  console.log('- 15 prompt optimizer entries');
  console.log('- 15 art instructor lessons');
  console.log('- 15 style transfer analyses');
  console.log('- 15 upscaler requests');
  console.log('- 15 variation generator entries');
  console.log('- 15 brand asset entries');
  console.log('- 15 AI history entries');

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
