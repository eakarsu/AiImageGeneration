const SD_SERVER_URL = process.env.SD_SERVER_URL || 'http://127.0.0.1:5050';

let sdServerReady = false;

async function waitForSDServer(maxRetries = 60, interval = 2000) {
  if (sdServerReady) return true;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${SD_SERVER_URL}/health`);
      const data = await res.json();
      if (data.status === 'ready') {
        console.log('SD server is ready!');
        sdServerReady = true;
        return true;
      }
      console.log(`SD server status: ${data.message || data.status}`);
    } catch (e) {
      // Server not up yet
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error('SD server did not become ready in time');
}

async function generateImage(prompt, style, options = {}) {
  await waitForSDServer(60, 2000);

  const body = {
    prompt,
    style: style || 'digital_art',
    num_inference_steps: options.num_inference_steps || 25,
    guidance_scale: options.guidance_scale || 7.5,
  };

  if (options.negative_prompt) {
    body.negative_prompt = options.negative_prompt;
  }

  if (options.seed != null) {
    body.seed = options.seed;
  }

  const res = await fetch(`${SD_SERVER_URL}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SD server error (${res.status}): ${text}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

module.exports = { generateImage };
