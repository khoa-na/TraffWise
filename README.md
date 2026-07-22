# TraffWise

TraffWise is a full-stack traffic monitoring demo built with computer vision,
FastAPI, and React. It processes sample traffic-camera videos, tracks vehicles,
detects violations, reads license plates, and streams annotated frames to a web
dashboard.

The Git repository contains only code and configuration. The 2.86 GB runtime
asset bundle is downloaded from the public
[`khoa-na/traffwise-assets`](https://huggingface.co/datasets/khoa-na/traffwise-assets)
dataset and verified with SHA-256 before use.

## Features

- Vehicle detection with YOLO11, RT-DETRv2, or Faster R-CNN
- DeepSORT vehicle tracking
- Speed, red-light, and wrong-lane violation detection
- License-plate detection and EasyOCR recognition
- Seven included sample cameras
- CPU mode and NVIDIA GPU acceleration

## Repository layout

```text
backend/                 FastAPI API and computer-vision pipeline
  api/configs/           Runtime configuration
  api/data/              Downloaded weights and videos (not committed)
  api/source/            Detection, tracking, OCR, and violation code
frontend/                React dashboard
notebooks/               Training and evaluation notebooks
scripts/download_assets.py
assets-manifest.json     Pinned asset URLs, sizes, and SHA-256 hashes
docker-compose.yml       CPU-compatible configuration
docker-compose.gpu.yml   NVIDIA GPU override
```

## Prerequisites

Install the following on the host machine:

- Git
- Python 3.9 or newer, used only by the asset downloader
- Docker Engine with the Compose plugin, or Docker Desktop
- At least 12 GB of free disk space; 20 GB is recommended for Docker build cache

Windows users should run the project inside WSL 2. Docker Desktop must use its
WSL 2 backend and have integration enabled for the selected Ubuntu distro.

Node.js, CUDA Toolkit, and backend Python packages do not need to be installed
on the host; Docker provides them.

## Quick start: CPU

Clone the repository:
```bash
git clone https://github.com/khoa-na/TraffWise.git
cd TraffWise
```

Download and verify the required model weights, videos, and annotations:

```bash
python3 scripts/download_assets.py
```

The command downloads 18 files into `backend/api/data`. Interrupted downloads
continue from their `.part` files. Re-running the command skips valid files.

Start the application:

```bash
docker compose up -d --build
```

The first build downloads the Docker dependencies. The first backend start may
also download about 100 MB of EasyOCR files; they are cached under
`backend/api/data/.easyocr`.

Open:

- Dashboard: <http://localhost:3200>
- Swagger API documentation: <http://localhost:8000/docs>
- OpenAPI schema: <http://localhost:8000/openapi.json>

## Quick start: NVIDIA GPU

GPU mode requires an NVIDIA GPU, a current NVIDIA driver, and GPU support in
Docker. On Windows, update WSL from PowerShell and restart it:

```powershell
wsl --update
wsl --shutdown
```

Verify that WSL and Docker can access the GPU:

```bash
nvidia-smi
docker run --rm --gpus all nvidia/cuda:12.8.1-base-ubuntu24.04 nvidia-smi
```

Start TraffWise with the GPU override:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

Verify PyTorch is using CUDA:

```bash
docker compose exec backend python -c \
  "import torch; print(torch.__version__); print(torch.cuda.is_available()); print(torch.cuda.get_device_name(0))"
```

An RTX 5060 should report output similar to:

```text
2.7.1+cu128
True
NVIDIA GeForce RTX 5060
```

## Optional Cloudinary configuration

The dashboard and local inference work without Cloudinary. Cloud uploads for
violation images require credentials.

Create a local environment file:

```bash
cp .env.example .env
```

Then set:

```dotenv
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Never commit `.env`; it is already ignored by Git.

## Useful commands

Check that every downloaded asset is present and valid:

```bash
python3 scripts/download_assets.py --verify-only
```

Show service status:

```bash
docker compose ps
```

Follow backend logs:

```bash
docker compose logs -f --tail=100 backend
```

Restart the services:

```bash
docker compose restart
```

Stop and remove the containers and network without deleting downloaded assets:

```bash
docker compose down
```

Rebuild after changing dependencies or Dockerfiles:

```bash
docker compose up -d --build --force-recreate
```

For GPU mode, include both Compose files in commands that recreate the backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml \
  up -d --build --force-recreate
```

## Troubleshooting

### `Cannot connect to the Docker daemon`

Start Docker Desktop. On Windows, confirm Docker Desktop uses the WSL 2 backend
and that WSL integration is enabled for the current distro.

### `could not select device driver ... with capabilities: [[gpu]]`

Docker cannot access the NVIDIA GPU. Update the NVIDIA Windows driver and WSL,
restart Docker Desktop, and rerun the two `nvidia-smi` checks above. CPU mode
remains available with the base `docker-compose.yml` only.

### Dashboard displays `No Signal`

The backend may still be loading models or EasyOCR. Check:

```bash
docker compose logs -f --tail=100 backend
curl http://localhost:8000/openapi.json
```

The frontend retries the MJPEG stream automatically. Refresh the dashboard once
the backend API responds.

### Asset download fails or a checksum is invalid

Run the downloader again. It resumes `.part` files and replaces an asset only
after its size and SHA-256 checksum match:

```bash
python3 scripts/download_assets.py
```

The pinned source revision is recorded in `assets-manifest.json`.

### Port 3200 or 8000 is already in use

Stop the process using that port, or change the host side of the relevant port
mapping in `docker-compose.yml`.

## Local development without Docker

Docker is the supported setup. For direct local development, use Python 3.10
or 3.11 for the backend:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend
python server.py
```

Start the frontend in a second terminal:

```bash
cd frontend
npm ci
npm start
```

The frontend development server listens on port 3000; the Docker setup exposes
it on port 3200 because some Windows installations reserve port 3000.

## Data and reproducibility

Runtime assets are intentionally excluded from Git by `.gitignore`. Their
paths, sizes, SHA-256 hashes, and immutable Hugging Face revision are recorded
in `assets-manifest.json`.

The notebooks document the original experiments but reference external Kaggle
datasets and are not required to run the dashboard.

Camera 8 is not included because its source video and annotation are
unavailable. Cameras 1 through 7 are fully configured.
