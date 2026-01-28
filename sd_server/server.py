import io
import os
import traceback
from typing import Optional
from fastapi import FastAPI
from fastapi.responses import Response, JSONResponse
from pydantic import BaseModel
import torch
from diffusers import StableDiffusionPipeline, EulerDiscreteScheduler
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI()

pipe = None
device = "cpu"
model_status = {"status": "loading", "message": "Loading model..."}


class GenerateRequest(BaseModel):
    prompt: str
    style: str = "digital_art"
    num_inference_steps: int = 25
    guidance_scale: float = 7.5
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None


@app.on_event("startup")
async def load_model():
    global pipe, device, model_status
    try:
        model_status = {"status": "loading", "message": "Downloading/loading SD model..."}
        print("Loading SD model...")

        if torch.backends.mps.is_available():
            device = "mps"
            dtype = torch.float32
        elif torch.cuda.is_available():
            device = "cuda"
            dtype = torch.float16
        else:
            device = "cpu"
            dtype = torch.float32

        hf_token = os.environ.get("HF_TOKEN")
        pipe = StableDiffusionPipeline.from_pretrained(
            "Lykon/dreamshaper-8",
            torch_dtype=dtype,
            use_safetensors=True,
            token=hf_token,
        )
        pipe.safety_checker = None
        pipe.requires_safety_checker = False
        pipe.scheduler = EulerDiscreteScheduler.from_config(pipe.scheduler.config)
        pipe = pipe.to(device)
        pipe.enable_attention_slicing()

        print(f"Model loaded on {device}!")
        model_status = {"status": "ready", "message": f"Model loaded and ready on {device}!"}
        print("Model loaded and ready!")
    except Exception as e:
        model_status = {"status": "error", "message": str(e)}
        print(f"Error loading model: {e}")
        traceback.print_exc()


@app.get("/health")
def health():
    return model_status


@app.post("/generate")
def generate(req: GenerateRequest):
    if pipe is None:
        return Response(status_code=503, content="Model not loaded yet")

    try:
        full_prompt = req.prompt
        if req.style and req.style != "digital_art":
            style_label = req.style.replace("_", " ")
            full_prompt = f"{req.prompt}, {style_label} style"

        gen_kwargs = {
            "prompt": full_prompt,
            "num_inference_steps": req.num_inference_steps,
            "guidance_scale": req.guidance_scale,
            "width": 512,
            "height": 512,
        }

        if req.negative_prompt:
            gen_kwargs["negative_prompt"] = req.negative_prompt

        if req.seed is not None:
            generator = torch.Generator(device=device if device != "mps" else "cpu")
            generator.manual_seed(req.seed)
            gen_kwargs["generator"] = generator

        image = pipe(**gen_kwargs).images[0]

        # Free MPS memory after generation
        if device == "mps":
            torch.mps.empty_cache()

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        buf.seek(0)

        return Response(content=buf.getvalue(), media_type="image/png")
    except Exception as e:
        traceback.print_exc()
        if device == "mps":
            torch.mps.empty_cache()
        return JSONResponse(status_code=500, content={"error": str(e)})


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=5050)
