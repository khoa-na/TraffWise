import sys
import os
import tempfile
import unittest
from unittest.mock import MagicMock

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from tests.mock_env import setup_mocks
setup_mocks()

from api.source.process.violation_manager import ViolationManager


class ViolationSQLiteTest(unittest.TestCase):
    def test_violation_persists_across_instances(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            temp_db = f.name

        try:
            manager1 = ViolationManager(["car"], db_path=temp_db)
            log = {"track_id": 42, "class_id": 0}
            manager1.add_violation(
                log=log,
                violation_type="speed",
                location="Cam 1",
                details="90 km/h",
                plate_text="29A-12345",
                lp_img="img_url",
                image_url="evidence_url"
            )

            # Recreate manager pointing to same SQLite database
            manager2 = ViolationManager(["car"], db_path=temp_db)
            violations = manager2.get_violations()

            self.assertEqual(len(violations), 1)
            self.assertEqual(violations[0]["plate"], "29A-12345")
            self.assertEqual(violations[0]["location"], "Cam 1")
            self.assertEqual(violations[0]["speed"], "90 km/h")

            # Test status update persistence
            v_id = violations[0]["id"]
            manager2.update_status(v_id, "Resolved")

            manager3 = ViolationManager(["car"], db_path=temp_db)
            fetched = manager3.get_violation(v_id)
            self.assertEqual(fetched["status"], "Resolved")

        finally:
            if os.path.exists(temp_db):
                os.unlink(temp_db)


if __name__ == "__main__":
    unittest.main()
