import sys
import os
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.engines.detectors.vehicle_detector import VehicleDetector
import threading
import time


class VehicleDetectorTest(unittest.TestCase):
    def test_concurrent_model_switch_loads_once(self):
        detector = VehicleDetector.__new__(VehicleDetector)
        detector.model_type = "yolo11"
        detector.model = object()
        detector._model_lock = threading.Lock()
        load_count = 0

        def load_model():
            nonlocal load_count
            time.sleep(0.01)
            load_count += 1
            detector.model = object()

        detector.load_model = load_model
        threads = [
            threading.Thread(target=detector.switch_model, args=("rtdetrv2",))
            for _ in range(2)
        ]

        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()

        self.assertEqual(detector.model_type, "rtdetrv2")
        self.assertEqual(load_count, 1)

    def test_failed_model_switch_restores_model_type(self):
        detector = VehicleDetector.__new__(VehicleDetector)
        detector.model_type = "yolo11"
        detector.model = object()
        detector._model_lock = threading.Lock()

        def load_model():
            raise RuntimeError("invalid checkpoint")

        detector.load_model = load_model

        with self.assertRaises(RuntimeError):
            detector.switch_model("rtdetrv2")

        self.assertEqual(detector.model_type, "yolo11")


if __name__ == "__main__":
    unittest.main()
