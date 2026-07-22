import sys
import os
import time
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.process.cloud_push import AsyncCloudinaryUploader


class CloudinaryNonBlockingTest(unittest.TestCase):
    def test_upload_violation_returns_immediately(self):
        uploader = AsyncCloudinaryUploader.__new__(AsyncCloudinaryUploader)
        uploader.is_configured = True
        uploader.executor = MagicMock()
        uploader.executor.submit = MagicMock(return_value="future")

        start = time.time()
        res = uploader.upload_violation(MagicMock(), "pub1", "folder1")
        elapsed = time.time() - start

        self.assertLess(elapsed, 0.5)
        self.assertEqual(res, "future")
        uploader.executor.submit.assert_called_once()

    def test_upload_violation_skipped_if_unconfigured(self):
        uploader = AsyncCloudinaryUploader.__new__(AsyncCloudinaryUploader)
        uploader.is_configured = False

        res = uploader.upload_violation(MagicMock(), "pub1", "folder1")
        self.assertIsNone(res)


if __name__ == "__main__":
    unittest.main()
