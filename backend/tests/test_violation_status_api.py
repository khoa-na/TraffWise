import sys
import os
import tempfile
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.process.violation_manager import ViolationManager


class ViolationStatusAPITest(unittest.TestCase):
    def test_status_update_logic(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            temp_db = f.name

        try:
            manager = ViolationManager(["car"], db_path=temp_db)
            log = {"track_id": 1, "class_id": 0}
            v_id = manager.add_violation(
                log=log,
                violation_type="speed",
                location="Cam1",
                details="80 km/h",
                plate_text="30A-99999",
                lp_img="img",
                image_url="/violations/evidence/e1.jpg"
            )

            # Test valid status update
            success = manager.update_status(v_id, "Resolved")
            self.assertTrue(success)
            record = manager.get_violation(v_id)
            self.assertEqual(record["status"], "Resolved")

            # Test unknown violation ID update
            failed = manager.update_status("nonexistent_id", "Resolved")
            self.assertFalse(failed)

        finally:
            if os.path.exists(temp_db):
                os.unlink(temp_db)


if __name__ == "__main__":
    unittest.main()
