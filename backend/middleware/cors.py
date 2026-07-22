import os
from fastapi.middleware.cors import CORSMiddleware


def setup_cors(app):
    raw_origins = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:3200,http://127.0.0.1:3000,http://127.0.0.1:3200"
    )
    origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"]
    )
