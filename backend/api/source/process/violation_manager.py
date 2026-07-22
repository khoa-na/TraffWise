import os
import base64
import sqlite3
import uuid
import cv2
from contextlib import contextmanager
from pathlib import Path
from datetime import datetime


class ViolationManager:
    def __init__(self, class_names, db_path=None):
        self.class_names = class_names
        self.session_id = uuid.uuid4().hex[:12]
        if db_path is None:
            db_dir = Path(__file__).parent.parent.parent.parent / "violations"
            db_dir.mkdir(exist_ok=True, parents=True)
            db_path = str(db_dir / "violations.db")

        self.db_path = str(db_path)
        self._init_db()

    @contextmanager
    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS violations (
                    id TEXT PRIMARY KEY,
                    vehicle TEXT,
                    plate TEXT,
                    type TEXT,
                    status TEXT,
                    date TEXT,
                    location TEXT,
                    evidence TEXT,
                    lp TEXT,
                    speed TEXT,
                    signal_time TEXT,
                    lane_details TEXT
                )
            """)
            conn.commit()

    def _row_to_dict(self, row):
        if row is None:
            return None
        d = {
            "id": row["id"],
            "vehicle": row["vehicle"] or "unknown",
            "plate": row["plate"],
            "type": row["type"],
            "status": row["status"],
            "date": row["date"],
            "location": row["location"],
            "evidence": row["evidence"],
            "lp": row["lp"]
        }
        if row["speed"]:
            d["speed"] = row["speed"]
        if row["signal_time"]:
            d["signalTime"] = row["signal_time"]
        if row["lane_details"]:
            d["laneDetails"] = row["lane_details"]
        return d

    @property
    def violations(self):
        """Property returning list of all violations from database for backwards compatibility."""
        return self.get_violations()

    def add_violation(self, log, violation_type, location, details, plate_text, lp_img, image_url=None):
        violation_type_map = {
            "speed": "Speeding",
            "rlv": "Red Light Violation",
            "wrong_way": "Wrong Way Driving"
        }

        track_id = log["track_id"]
        vehicle_class = self.class_names[log["class_id"]]

        if hasattr(lp_img, "size") and lp_img.size == 0:
            lp_img_str = "https://placehold.co/400x150?text=No+Plate+Image"
        elif isinstance(lp_img, str):
            lp_img_str = lp_img
        else:
            try:
                _, buffer = cv2.imencode('.jpg', lp_img)
                img_b64 = base64.b64encode(buffer).decode('utf-8')
                lp_img_str = f"data:image/jpeg;base64,{img_b64}"
            except Exception:
                lp_img_str = "https://placehold.co/400x150?text=No+Plate+Image"

        loc_slug = str(location).replace(" ", "_")
        vtype_mapped = violation_type_map.get(violation_type, violation_type)
        # Stable unique identifier per camera location, vehicle class, track ID, and violation type
        violation_id = f"{self.session_id}-{loc_slug}-{vehicle_class}-{track_id}-{violation_type}"

        speed_val = details if violation_type == "speed" else None
        signal_val = details if violation_type == "rlv" else None
        lane_val = details if violation_type == "wrong_way" else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, plate, evidence FROM violations WHERE id = ?", (violation_id,))
            existing = cursor.fetchone()

            if existing:
                # Deduplication branch: update plate if previous was unknown or shorter, or update evidence
                should_update_plate = (existing["plate"] == "unknown" or len(existing["plate"]) < len(plate_text)) and plate_text != "unknown"
                should_update_evidence = image_url and (not existing["evidence"] or "pending_upload" in existing["evidence"])

                if should_update_plate and should_update_evidence:
                    cursor.execute("""
                        UPDATE violations
                        SET plate = ?, lp = ?, evidence = ?
                        WHERE id = ?
                    """, (plate_text, lp_img_str, image_url, violation_id))
                elif should_update_plate:
                    cursor.execute("""
                        UPDATE violations
                        SET plate = ?, lp = ?
                        WHERE id = ?
                    """, (plate_text, lp_img_str, violation_id))
                elif should_update_evidence:
                    cursor.execute("""
                        UPDATE violations
                        SET evidence = ?
                        WHERE id = ?
                    """, (image_url, violation_id))

                conn.commit()
                return violation_id

            # Insert new unique violation record
            cursor.execute("""
                INSERT INTO violations (
                    id, vehicle, plate, type, status, date, location, evidence, lp, speed, signal_time, lane_details
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                violation_id,
                vehicle_class,
                plate_text,
                vtype_mapped,
                "Pending",
                datetime.now().isoformat(),
                location,
                image_url,
                lp_img_str,
                speed_val,
                signal_val,
                lane_val
            ))
            conn.commit()

        print(f"Added {violation_type} violation for track {track_id} with ID {violation_id}")
        return violation_id

    def get_violations(self, limit=None):
        query = "SELECT * FROM violations ORDER BY date DESC"
        if limit:
            query += f" LIMIT {int(limit)}"

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query)
            rows = cursor.fetchall()
            return [self._row_to_dict(r) for r in rows]

    def get_violation(self, violation_id):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM violations WHERE id = ?", (violation_id,))
            row = cursor.fetchone()
            return self._row_to_dict(row)

    def update_evidence(self, violation_id, evidence_url):
        """Update evidence URL for a violation in SQLite database asynchronously."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE violations SET evidence = ? WHERE id = ?", (evidence_url, violation_id))
            conn.commit()
            return cursor.rowcount > 0

    def start_session(self):
        """Start a fresh tracking namespace after a camera switch."""
        self.session_id = uuid.uuid4().hex[:12]

    def update_status(self, violation_id, status):
        """Update violation status (e.g. Pending -> Resolved)."""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("UPDATE violations SET status = ? WHERE id = ?", (status, violation_id))
            conn.commit()
            return cursor.rowcount > 0

    def is_violated_already(self, violation_id):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT type FROM violations WHERE id LIKE ? LIMIT 1",
                (f"%-{violation_id}-%",),
            )
            row = cursor.fetchone()
            if row:
                return row["type"]
            return None
