from typing import List, Literal, Optional
from fastapi import FastAPI, Request, File, UploadFile, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from starlette.responses import StreamingResponse
import sys
import time
import cv2
import yaml
import os
from pathlib import Path
from datetime import datetime

from api.source.operators.controller import Controller
from api.source.engines.utils.tester import Tester
from schemas.schemas import (
    ModelRequest,
    CameraRequest,
    CaptureRequest,
    Violation,
    AnnotationToggleRequest,
    SystemParameters,
)
from middleware import setup_cors

BASE_DIR = Path(__file__).parent.absolute()
sys.path.append(str(BASE_DIR))

CAPTURES_DIR = BASE_DIR / "captures"
CAPTURES_DIR.mkdir(exist_ok=True)
print(f"Captures will be saved to: {CAPTURES_DIR}")


EVIDENCE_DIR = BASE_DIR / "violations" / "evidence"
EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI()
setup_cors(app)

app.mount("/violations/evidence", StaticFiles(directory=str(EVIDENCE_DIR)), name="evidence")


def load_config():
    with (BASE_DIR / "api/configs/pipeline.yml").open() as file:
        config = yaml.safe_load(file)

    for model in config["models"].values():
        model["path"] = str(BASE_DIR / model["path"])
    for sample in config["samples"].values():
        sample["video_path"] = str(BASE_DIR / sample["video_path"])
        sample["annotation_path"] = str(BASE_DIR / sample["annotation_path"])
    return config


config = load_config()

controller = Controller(config)
tester = Tester(controller)


@app.post("/set_model")
async def set_model(request: ModelRequest):
    """Sets the model to be used for detection."""
    try:
        controller.switch_model(request.model_type)
        return {"status": "success", "model": request.model_type}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to switch model: {str(e)}")


@app.post("/set_camera")
async def set_camera(request: CameraRequest):
    """Sets the camera to be used for video feed."""
    try:
        updated_config = controller.switch_camera(request.camera_id)
        return {
            "status": "success",
            "camera_id": request.camera_id,
            "config": updated_config
        }
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to switch camera: {str(e)}")


@app.post("/capture_frame")
async def capture_frame(request: CaptureRequest):
    """Captures a single frame from the current video feed and saves it."""
    try:
        # Get current frame without switching camera or model
        frame = controller.get_current_frame()

        if frame is None:
            raise HTTPException(
                status_code=400, detail="No frame available to capture")

        # Generate filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"cam{request.camera_id}_{request.model_type}_{timestamp}.jpg"
        filepath = str(CAPTURES_DIR / filename)

        # Ensure the directory exists
        os.makedirs(os.path.dirname(filepath), exist_ok=True)

        # Debug info
        print(f"Saving capture to: {filepath}")

        # Save the frame
        success = cv2.imwrite(filepath, frame)

        if not success:
            raise HTTPException(
                status_code=500, detail=f"Failed to write image to {filepath}")

        return {
            "status": "success",
            "filename": filename,
            "path": filepath
        }

    except Exception as e:
        print(f"Error in capture_frame: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to capture frame: {str(e)}")


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(
        content=controller.yield_from_video(),
        media_type="multipart/x-mixed-replace; boundary=frame")


@app.post("/toggle_pause")
async def toggle_pause():
    """Toggles the pause state of the video feed."""
    try:
        is_paused = controller.toggle_pause()
        return {"status": "success", "paused": is_paused}
    except Exception as e:
        print(f"Error toggling pause: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to toggle pause: {str(e)}")


@app.post("/toggle_annotations")
async def toggle_annotations(request: AnnotationToggleRequest):
    """Toggles the display of annotations on the video feed."""
    try:
        result = controller.toggle_annotations(request.show_annotations)
        return {"status": "success", "show_annotations": result["show_annotations"]}
    except Exception as e:
        print(f"Error toggling annotations: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to toggle annotations: {str(e)}")


@app.post("/api/parameters")
async def update_parameters(params: dict):
    try:
        controller.update_camera_parameters(controller.camera_name, params)

        # Get updated config to verify changes
        updated_config = controller.get_system_config()
        return {
            "success": True,
            "message": "Parameters updated successfully",
            "config": updated_config
        }
    except Exception as e:
        print(f"Error updating parameters: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Failed to update parameters: {str(e)}")


@app.post("/api/camera/{camera_id}/parameters")
async def update_camera_parameters(camera_id: str, request: Request):
    """Update parameters for specific camera"""
    try:
        if camera_id not in config["samples"]:
            raise HTTPException(
                status_code=404, detail=f"Camera '{camera_id}' not found")

        body = await request.json()
        settings = body.get("settings", body)

        if not settings:
            raise HTTPException(
                status_code=400, detail="Settings not provided")

        controller.update_camera_parameters(camera_id, settings)

        return {
            "status": "success",
            "camera_id": camera_id,
            "config": controller.get_camera_config(camera_id)
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update camera parameters: {str(e)}"
        )


@app.get("/api/violations", response_model=List[dict])
async def get_violations(limit: Optional[int] = None):
    """Get all traffic violations"""
    try:
        violations = controller.violation_manager.get_violations(limit)
        return violations
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch violations: {str(e)}")


@app.get("/api/violations/{violation_id}")
async def get_violation(violation_id: str):
    """Get a specific violation by ID"""
    try:
        violation = controller.violation_manager.get_violation(violation_id)
        if not violation:
            raise HTTPException(status_code=404, detail="Violation not found")
        return violation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to fetch violation: {str(e)}")


class StatusUpdateRequest(BaseModel):
    status: Literal["Pending", "Resolved", "Dismissed"]


@app.post("/api/violations/{violation_id}/status")
async def update_violation_status(violation_id: str, request: StatusUpdateRequest):
    """Update violation status (e.g. Pending -> Resolved)"""
    try:
        success = controller.violation_manager.update_status(violation_id, request.status)
        if not success:
            raise HTTPException(status_code=404, detail="Violation not found")
        return {"status": "success", "violation_id": violation_id, "new_status": request.status}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/camera/{camera_id}/config")
async def get_camera_config(camera_id: str):
    """Get configuration for specific camera"""
    try:
        if camera_id not in config["samples"]:
            raise HTTPException(
                status_code=404, detail=f"Camera '{camera_id}' not found")

        cam_config = controller.get_camera_config(camera_id)
        if cam_config is None:
            raise HTTPException(
                status_code=404, detail="Configuration not found")
        return cam_config
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to get config: {str(e)}")


@app.post("/api/test/ocr")
async def test_ocr(image: UploadFile = File(...)):
    """Test OCR on an uploaded image"""
    try:
        contents = await image.read()
        results = tester.process_lp_image(contents)

        if "error" in results:
            raise HTTPException(
                status_code=500,
                detail=results["error"]
            )

        return results
    except Exception as e:
        import traceback
        print(f"OCR Test Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@app.post("/api/test/pipeline")
async def test_pipeline(image: UploadFile = File(...)):
    """Test full detection pipeline on an uploaded image"""
    try:
        contents = await image.read()
        results = tester.process_image(contents)

        if "error" in results:
            raise HTTPException(
                status_code=500,
                detail=results["error"]
            )

        return results
    except Exception as e:
        import traceback
        print(f"Pipeline Test Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=f"Error processing image: {str(e)}"
        )


@app.post("/reset")
async def reset_controller(request: Request = None):
    """Reset the controller to initial state safely stopping background workers."""
    try:
        global controller, tester
        if controller:
            controller.stop_stream_worker()
            if hasattr(controller, 'executor'):
                controller.executor.shutdown(wait=False)
        controller = Controller(load_config())
        tester = Tester(controller)
        return {"status": "success", "message": "Controller reset to initial state"}
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to reset controller: {str(e)}")


@app.on_event("shutdown")
def shutdown_event():
    global controller
    if controller:
        controller.stop_stream_worker()
        if hasattr(controller, 'executor'):
            controller.executor.shutdown(wait=False)
