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
            v_id1 = manager1.add_violation(
                log=log,
                violation_type="speed",
                location="Camera 1",
                details="90 km/h",
                plate_text="unknown",
                lp_img="img_url",
                image_url="/violations/evidence/local_1.jpg"
            )

            # Deduplication test: add same violation again with valid plate text
            v_id2 = manager1.add_violation(
                log=log,
                violation_type="speed",
                location="Camera 1",
                details="90 km/h",
                plate_text="29A-12345",
                lp_img="img_url",
                image_url="/violations/evidence/local_1.jpg"
            )

            self.assertEqual(v_id1, v_id2)

            # Recreate manager pointing to same SQLite database
            manager2 = ViolationManager(["car"], db_path=temp_db)
            violations = manager2.get_violations()

            # Confirm deduplication: only 1 row exists
            self.assertEqual(len(violations), 1)
            self.assertEqual(violations[0]["plate"], "29A-12345")
            self.assertEqual(violations[0]["location"], "Camera 1")
            self.assertEqual(violations[0]["evidence"], "/violations/evidence/local_1.jpg")

            # A new tracking session may reuse track IDs without losing events.
            manager1.start_session()
            v_id3 = manager1.add_violation(
                log=log,
                violation_type="speed",
                location="Camera 1",
                details="90 km/h",
                plate_text="29A-12345",
                lp_img="img_url",
                image_url="/violations/evidence/local_2.jpg"
            )
            self.assertNotEqual(v_id1, v_id3)
            self.assertEqual(len(manager1.get_violations()), 2)

            # Test update_evidence callback persistence
            manager2.update_evidence(v_id1, "https://cloudinary.com/secure_1.jpg")
            manager3 = ViolationManager(["car"], db_path=temp_db)
            fetched = manager3.get_violation(v_id1)
            self.assertEqual(fetched["evidence"], "https://cloudinary.com/secure_1.jpg")

            # Test status update persistence
            manager3.update_status(v_id1, "Resolved")
            manager4 = ViolationManager(["car"], db_path=temp_db)
            fetched2 = manager4.get_violation(v_id1)
            self.assertEqual(fetched2["status"], "Resolved")

        finally:
            if os.path.exists(temp_db):
                os.unlink(temp_db)


if __name__ == "__main__":
    unittest.main()
