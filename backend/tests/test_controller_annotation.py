import sys
import os
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.operators.controller import Controller


class MockTrack:
    def __init__(self, track_id=1):
        self.track_id = track_id

    def is_confirmed(self):
        return True

    def to_ltrb(self):
        return [10, 10, 50, 50]

    def get_det_class(self):
        return 0


class ControllerAnnotationTest(unittest.TestCase):
    def test_process_frame_handles_violation_when_annotations_disabled(self):
        controller = Controller.__new__(Controller)
        controller.class_names = ["car"]
        controller.colors = [(255, 255, 0)]
        controller.show_annotations = False
        controller.speed_estimation_enabled = False
        controller.wrong_lane_detection_enabled = False
        controller.red_light_detection_enabled = False

        controller.vehicle_detector = MagicMock()
        controller.vehicle_detector.detect.return_value = []
        controller.tracker = MagicMock()
        controller.tracker.extract_detections.return_value = []
        controller.tracker.update_tracks.return_value = [MockTrack(1)]
        controller.rlv_detector = MagicMock()
        controller.rlv_detector.detect_traffic_light_color.side_effect = lambda f: f

        controller.handle_violation = MagicMock()
        controller.draw_track = MagicMock()

        frame = MagicMock()
        frame.copy.return_value = frame
        res_frame = controller.process_frame(frame)

        controller.handle_violation.assert_called_once()
        controller.draw_track.assert_not_called()


if __name__ == "__main__":
    unittest.main()
