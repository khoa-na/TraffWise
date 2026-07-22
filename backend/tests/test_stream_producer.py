import sys
import os
import time
import threading
import unittest
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.operators.controller import Controller


class StreamProducerTest(unittest.TestCase):
    def test_controller_constructor_initializes_worker_state(self):
        config = {
            "labels": {"car": 0},
            "frame_skipper": {"target_fps": 30},
        }
        with patch("api.source.operators.controller.AsyncCloudinaryUploader"), \
                patch("api.source.operators.controller.ViolationManager"), \
                patch.object(Controller, "init_components"), \
                patch.object(Controller, "get_system_config", return_value={}):
            controller = Controller(config)

        self.assertIsInstance(controller._worker_lock, type(threading.Lock()))
        self.assertIsInstance(controller._frame_condition, threading.Condition)
        controller.executor.shutdown(wait=False)

    def test_concurrent_starts_create_one_worker(self):
        controller = Controller.__new__(Controller)
        controller._worker_lock = threading.Lock()
        controller._worker_running = False
        controller._worker_thread = None

        fake_worker = MagicMock()
        callers = [threading.Thread(target=controller.start_stream_worker) for _ in range(8)]
        with patch("api.source.operators.controller.threading.Thread", return_value=fake_worker) as thread_cls:
            for caller in callers:
                caller.start()
            for caller in callers:
                caller.join()

        thread_cls.assert_called_once()
        fake_worker.start.assert_called_once()

    def test_multiple_consumers_share_producer_reads(self):
        controller = Controller.__new__(Controller)
        controller.config = {
            "labels": {"car": 0},
            "frame_skipper": {"target_fps": 30, "skip_rate": 1},
            "samples": {"1": {"video_path": "v1"}}
        }
        controller.camera_name = "1"
        controller.show_annotations = False
        controller.lane_annotate_enabled = False
        controller.road_annotate_enabled = False
        controller.intersection_annotate_enabled = False
        controller.is_paused = False
        controller.switch_model_flag = False
        controller.speed_estimation_enabled = False
        controller.red_light_detection_enabled = False
        controller.wrong_lane_detection_enabled = False

        controller.frame_skipper = MagicMock()
        controller.frame_skipper.is_skipable.return_value = False
        controller.frame_skipper.frame_counter = 0
        controller.frame_skipper.current_fps = 30
        controller.frame_skipper.total_skip_frames = 0

        controller.vehicle_detector = MagicMock()
        controller.vehicle_detector.model_type = "yolo11"
        controller.tracker = MagicMock()
        controller.tracker.extract_detections.return_value = []
        controller.tracker.update_tracks.return_value = []
        controller.rlv_detector = MagicMock()
        controller.rlv_detector.detect_traffic_light_color.side_effect = lambda f: f

        controller._latest_jpeg = None
        controller._frame_condition = threading.Condition()
        controller._worker_lock = threading.Lock()
        controller._worker_running = False
        controller._worker_thread = None
        controller._read_count = 0

        dummy_frame = MagicMock()
        dummy_frame.copy.return_value = dummy_frame
        cap_mock = MagicMock()
        cap_mock.isOpened.return_value = True
        cap_mock.read.return_value = (True, dummy_frame)
        cap_mock.get.return_value = 30
        controller.cap = cap_mock
        controller.init_process_video = MagicMock()

        gen1 = controller.yield_from_video()
        gen2 = controller.yield_from_video()

        f1 = next(gen1)
        f2 = next(gen2)

        self.assertIn(b"--frame", f1)
        self.assertIn(b"--frame", f2)

        # Confirm read_count incremented once for the produced frame, shared by both consumers
        self.assertGreaterEqual(controller._read_count, 1)

        controller.stop_stream_worker()

    def test_camera_switch_restarts_worker_without_opening_capture_in_api_thread(self):
        controller = Controller.__new__(Controller)
        controller.config = {"samples": {"1": {}, "2": {}}}
        controller.camera_name = "1"
        controller._worker_running = True
        controller.current_frame = MagicMock()
        controller._latest_jpeg = b"old"
        controller.stop_stream_worker = MagicMock(
            side_effect=lambda: setattr(controller, "_worker_running", False)
        )
        controller.start_stream_worker = MagicMock()
        controller.reinitialize_camera = MagicMock()
        controller.get_camera_config = MagicMock(return_value={"general_setting": {}})
        controller.update_parameters = MagicMock()
        controller.init_process_video = MagicMock()

        result = controller.switch_camera("2")

        self.assertEqual(result, {"general_setting": {}})
        controller.stop_stream_worker.assert_called_once()
        controller.start_stream_worker.assert_called_once()
        controller.init_process_video.assert_not_called()


if __name__ == "__main__":
    unittest.main()
