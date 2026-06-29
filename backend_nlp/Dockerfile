# Hugging Face Spaces Docker deployment
# Port 7860 is required by HF Spaces — do not change.

FROM python:3.11-slim

# System dependencies: ffmpeg (required by WhisperX and yt-dlp for audio processing)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp standalone binary — downloads YouTube audio without a YouTube API key
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

COPY requirements.txt .

# PyTorch CPU wheel installed first — index URL required (CPU-only build avoids 4GB CUDA download)
RUN pip install --no-cache-dir \
    torch==2.3.1 torchaudio==2.3.1 \
    --index-url https://download.pytorch.org/whl/cpu

# Remaining dependencies (whisperx finds the torch installed above)
# English model required; Bengali model optional — failure is non-fatal (English-only mode continues)
RUN pip install --no-cache-dir -r requirements.txt && \
    python -m spacy download en_core_web_md && \
    (python -m spacy download bn_core_news_sm || echo "[docker] bn_core_news_sm unavailable — English-only NLP active")

COPY . .

# HF Spaces requires port 7860
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
