import sys
import os
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.operators.controller import Controller


class MockTrack:
    def __init__(self, track_id=1, time_since_update=0):
        self.track_id = track_id
        self.time_since_update = time_since_update

    def is_confirmed(self):
        return True

    def to_ltrb(self):
        return [10, 10, 50, 50]

    def get_det_class(self):
        return 0


class ControllerAnnotationTest(unittest.TestCase):
    def test_process_frame_skips_stale_tracks(self):
        controller = Controller.__new__(Controller)
        controller.class_names = ["car"]
        controller.colors = [(255, 255, 0)]
        controller.show_annotations = True
        controller.speed_estimation_enabled = False
        controller.wrong_lane_detection_enabled = False
        controller.red_light_detection_enabled = False

        controller.vehicle_detector = MagicMock()
        controller.vehicle_detector.detect.return_value = []
        controller.tracker = MagicMock()
        controller.tracker.extract_detections.return_value = []
        controller.tracker.update_tracks.return_value = [
            MockTrack(1, time_since_update=1)
        ]
        controller.rlv_detector = MagicMock()
        controller.rlv_detector.detect_traffic_light_color.side_effect = lambda f: f

        controller.handle_violation = MagicMock()
        controller.draw_track = MagicMock()

        frame = MagicMock()
        frame.copy.return_value = frame
        res_frame = controller.process_frame(frame)

        controller.handle_violation.assert_not_called()
        controller.draw_track.assert_not_called()

    def test_repeated_violation_submits_one_cloud_upload(self):
        controller = Controller.__new__(Controller)
        controller.camera_name = "1"
        controller.class_names = ["car"]
        controller.speed_estimation_enabled = True
        controller.red_light_detection_enabled = False
        controller.wrong_lane_detection_enabled = False
        controller._cloud_uploads_submitted = set()
        controller.uploader = MagicMock(is_configured=True)
        controller.violation_manager = MagicMock(session_id="session")
        controller.violation_manager.get_violation.side_effect = [
            None,
            {"evidence": "/violations/evidence/local.jpg"},
        ]
        controller.violation_manager.add_violation.return_value = (
            "session-Camera_1-car-1-speed"
        )
        controller.get_license_plate = MagicMock(
            return_value=("29A-12345", "plate", 0.9)
        )
        controller._submit_cloudinary_upload = MagicMock(return_value=True)

        log = {
            "track_id": 1,
            "class_id": 0,
            "speed": 80,
            "speed_limit": 60,
            "turn_type": "straight",
            "speed_violation": True,
            "red_light_violation": False,
            "wrong_way_violation": False,
        }
        frame = MagicMock()

        controller.handle_violation(log, frame)
        controller.handle_violation(log, frame)

        controller._submit_cloudinary_upload.assert_called_once()


if __name__ == "__main__":
    unittest.main()
