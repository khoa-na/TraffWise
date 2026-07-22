import sys
import os
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.operators.controller import Controller


class CameraIsolationTest(unittest.TestCase):
    def test_camera_settings_isolation(self):
        config = {
            "labels": {"car": 0},
            "frame_skipper": {"target_fps": 30, "skip_rate": 1},
            "samples": {
                "1": {"video_path": "v1", "annotation_path": "a1"},
                "2": {"video_path": "v2", "annotation_path": "a2"}
            }
        }
        controller = Controller.__new__(Controller)
        controller.config = config
        controller.camera_name = "1"
        controller.camera_settings = {}
        controller.update_parameters = MagicMock()
        controller.get_system_config = MagicMock(return_value={"test": "default"})

        params_cam1 = {"general_setting": {"conf_threshold": 0.8}}
        controller.update_camera_parameters("1", params_cam1)

        config_cam1 = controller.get_camera_config("1")
        config_cam2 = controller.get_camera_config("2")

        self.assertEqual(config_cam1, params_cam1)
        self.assertNotEqual(config_cam2, params_cam1)


if __name__ == "__main__":
    unittest.main()
