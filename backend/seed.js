const pool = require('./db');
const bcrypt = require('bcryptjs');
const { generateImage } = require('./imageGenerator');
const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, 'generated_images');
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

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

  // Seed prompts (16 items)
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

  // Seed styles (16 items)
  const stylesData = [
    { name: 'Watercolor', description: 'Soft, flowing watercolor painting style with gentle color blending', example_prompt: 'Paint a serene lake scene in watercolor style' },
    { name: 'Oil Painting', description: 'Rich, textured oil painting with bold brushstrokes and deep colors', example_prompt: 'Create a portrait in classic oil painting style' },
    { name: 'Digital Art', description: 'Clean, modern digital illustration with vibrant colors', example_prompt: 'Design a futuristic landscape in digital art style' },
    { name: 'Pencil Sketch', description: 'Detailed pencil drawing with fine lines and shading', example_prompt: 'Sketch a city street scene in pencil' },
    { name: 'Pop Art', description: 'Bold colors, strong outlines, and halftone dots inspired by Warhol and Lichtenstein', example_prompt: 'Create a pop art portrait with bold colors' },
    { name: 'Impressionist', description: 'Light-focused style with visible brushstrokes inspired by Monet and Renoir', example_prompt: 'Paint a garden scene in impressionist style' },
    { name: 'Abstract', description: 'Non-representational art focusing on shapes, colors, and forms', example_prompt: 'Create an abstract composition with geometric shapes' },
    { name: 'Minimalist', description: 'Simple, clean designs with minimal elements and lots of white space', example_prompt: 'Design a minimalist mountain landscape' },
    { name: 'Art Nouveau', description: 'Ornate, flowing organic lines and natural forms', example_prompt: 'Create a floral design in art nouveau style' },
    { name: 'Pixel Art', description: 'Retro-style pixel-based artwork reminiscent of classic video games', example_prompt: 'Design a character sprite in pixel art style' },
    { name: 'Surrealism', description: 'Dream-like, fantastical scenes that challenge reality', example_prompt: 'Create a surreal melting clock landscape' },
    { name: 'Gothic', description: 'Dark, moody atmosphere with dramatic lighting and architectural elements', example_prompt: 'Design a gothic cathedral in moonlight' },
    { name: 'Anime', description: 'Japanese animation style with expressive eyes and dynamic poses', example_prompt: 'Draw a character in anime style with cherry blossoms' },
    { name: 'Art Deco', description: 'Geometric patterns, bold lines, and luxurious materials of the 1920s', example_prompt: 'Create an art deco building facade design' },
    { name: 'Photorealism', description: 'Ultra-realistic style that mimics high-definition photography', example_prompt: 'Render a photorealistic still life with fruits' },
    { name: 'Expressionism', description: 'Distorted forms and intense colors to convey emotional experience', example_prompt: 'Paint a stormy landscape in expressionist style' },
  ];

  for (const s of stylesData) {
    // Generate a preview image for each style
    const imageBuffer = await generateImage(s.example_prompt, s.name);
    const filename = `style_${s.name.toLowerCase().replace(/\s+/g, '_')}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);

    await pool.query(
      'INSERT INTO styles (name, description, example_prompt, preview_url) VALUES ($1, $2, $3, $4)',
      [s.name, s.description, s.example_prompt, `/generated_images/${filename}`]
    );
  }

  // Seed gallery items (16 items) - generate actual images
  const galleryData = [
    { title: 'Mystic Mountains', prompt: 'Ethereal mountain landscape with floating islands', style: 'Watercolor' },
    { title: 'Neon Dreams', prompt: 'Cyberpunk city street at night with neon reflections', style: 'Digital Art' },
    { title: 'Ocean Serenity', prompt: 'Calm ocean waves at sunset with golden light', style: 'Oil Painting' },
    { title: 'Forest Spirit', prompt: 'Ancient forest with a glowing spirit creature', style: 'Impressionist' },
    { title: 'Cosmic Journey', prompt: 'Astronaut floating through colorful space nebula', style: 'Digital Art' },
    { title: 'Urban Jungle', prompt: 'City buildings overgrown with tropical plants', style: 'Watercolor' },
    { title: 'Crystal Cave', prompt: 'Underground cave filled with glowing crystals', style: 'Digital Art' },
    { title: 'Autumn Village', prompt: 'Small village in autumn with golden leaves falling', style: 'Oil Painting' },
    { title: 'Sky Whales', prompt: 'Giant whales swimming through clouds above a city', style: 'Abstract' },
    { title: 'Moonlit Garden', prompt: 'Beautiful flower garden under full moonlight', style: 'Impressionist' },
    { title: 'Fire Dragon', prompt: 'A fire dragon soaring over a medieval landscape', style: 'Digital Art' },
    { title: 'Retro Robot', prompt: 'Vintage robot exploring a garden', style: 'Pop Art' },
    { title: 'Starry Night City', prompt: 'Modern city skyline under a starry night sky', style: 'Impressionist' },
    { title: 'Zen Pond', prompt: 'Koi fish swimming in a peaceful zen pond with lotus', style: 'Watercolor' },
    { title: 'Desert Storm', prompt: 'Dramatic desert landscape with approaching sandstorm', style: 'Oil Painting' },
    { title: 'Floating Islands', prompt: 'Fantasy floating islands with waterfalls in the sky', style: 'Digital Art' },
  ];

  for (const g of galleryData) {
    const imageBuffer = await generateImage(g.prompt, g.style);
    const filename = `gallery_${g.title.toLowerCase().replace(/\s+/g, '_')}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);

    await pool.query(
      'INSERT INTO gallery (user_id, title, description, image_url, prompt, style) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, g.title, `Generated with prompt: ${g.prompt}`, `/generated_images/${filename}`, g.prompt, g.style]
    );
  }

  // Seed history (16 items)
  const historyData = [
    { prompt: 'A magical forest with glowing mushrooms', style: 'Watercolor', status: 'completed' },
    { prompt: 'Futuristic space station interior', style: 'Digital Art', status: 'completed' },
    { prompt: 'Ancient Greek temple at sunset', style: 'Oil Painting', status: 'completed' },
    { prompt: 'Underwater coral reef with tropical fish', style: 'Watercolor', status: 'completed' },
    { prompt: 'Steampunk airship over London', style: 'Digital Art', status: 'completed' },
    { prompt: 'Snow-covered village at Christmas', style: 'Impressionist', status: 'completed' },
    { prompt: 'Abstract geometric patterns in space', style: 'Abstract', status: 'completed' },
    { prompt: 'Japanese cherry blossom garden', style: 'Watercolor', status: 'completed' },
    { prompt: 'Haunted lighthouse on a stormy coast', style: 'Oil Painting', status: 'completed' },
    { prompt: 'Cute cat astronaut on the moon', style: 'Pop Art', status: 'completed' },
    { prompt: 'Viking longship in rough seas', style: 'Oil Painting', status: 'completed' },
    { prompt: 'Bioluminescent jellyfish deep sea', style: 'Digital Art', status: 'completed' },
    { prompt: 'Retro 80s sunset with palm trees', style: 'Pop Art', status: 'completed' },
    { prompt: 'Enchanted library with floating books', style: 'Impressionist', status: 'completed' },
    { prompt: 'Phoenix rising from flames', style: 'Digital Art', status: 'completed' },
    { prompt: 'Peaceful mountain lake at dawn', style: 'Minimalist', status: 'completed' },
  ];

  for (const h of historyData) {
    const imageBuffer = await generateImage(h.prompt, h.style);
    const filename = `history_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.png`;
    fs.writeFileSync(path.join(imagesDir, filename), imageBuffer);

    await pool.query(
      'INSERT INTO history (user_id, prompt, style, image_url, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, h.prompt, h.style, `/generated_images/${filename}`, h.status]
    );
  }

  console.log('Seed complete! Created:');
  console.log('- 1 demo user (demo@example.com / password123)');
  console.log('- 16 prompts');
  console.log('- 16 styles (with preview images)');
  console.log('- 16 gallery items (with generated images)');
  console.log('- 16 history entries (with generated images)');

  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
