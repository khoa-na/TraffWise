import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from api.source.operators.adaptive_frame_skipper import AdaptiveFrameSkipper


class AdaptiveFrameSkipperTest(unittest.TestCase):
    def test_pattern_position_resets_when_processing_all_frames(self):
        skipper = AdaptiveFrameSkipper({"target_fps": 60})
        skipper.skip_pattern = [0, 1, 1]
        skipper.pattern_position = 2

        skipper.calculate_skip_pattern(video_fps=60, avg_processing_time=0.01)

        self.assertEqual(skipper.pattern_position, 0)
        self.assertFalse(skipper.is_skipable())


if __name__ == "__main__":
    unittest.main()
