import os
import cv2
import tempfile
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor

try:
    import cloudinary
    import cloudinary.uploader
    import cloudinary.api
except ImportError:
    cloudinary = None


class AsyncCloudinaryUploader:
    def __init__(self):
        load_dotenv()
        self.executor = ThreadPoolExecutor(max_workers=2)

        self.cloud_name = os.getenv('CLOUDINARY_CLOUD_NAME')
        self.api_key = os.getenv('CLOUDINARY_API_KEY')
        self.api_secret = os.getenv('CLOUDINARY_API_SECRET')
        self.is_configured = bool(
            self.cloud_name and self.api_key and self.api_secret and cloudinary is not None
        )

        if self.is_configured:
            try:
                cloudinary.config(
                    cloud_name=self.cloud_name,
                    api_key=self.api_key,
                    api_secret=self.api_secret
                )
            except Exception as e:
                print(f"Error configuring Cloudinary: {e}")
                self.is_configured = False

    def _upload_to_cloudinary(self, frame, public_id, folder_path, callback=None):
        """Internal method to perform the actual upload to Cloudinary"""
        if not self.is_configured:
            return None

        temp_filename = None
        try:
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as temp:
                temp_filename = temp.name

            cv2.imwrite(temp_filename, frame)

            result = cloudinary.uploader.upload(
                temp_filename,
                public_id=public_id,
                folder=folder_path,
                overwrite=True
            )

            if callback and callable(callback) and result and 'secure_url' in result:
                try:
                    callback(result['secure_url'])
                except Exception as cb_err:
                    print(f"Error in Cloudinary callback: {cb_err}")

            return result

        except Exception as e:
            print(f"Error in _upload_to_cloudinary: {e}")
            return None
        finally:
            if temp_filename and os.path.exists(temp_filename):
                try:
                    os.unlink(temp_filename)
                except Exception as err:
                    print(f"Error deleting temporary file: {err}")

    def upload_violation(self, frame, public_id, folder_path, callback=None):
        """Upload a violation image to Cloudinary asynchronously (NON-BLOCKING)"""
        if not self.is_configured:
            return None

        try:
            future = self.executor.submit(
                self._upload_to_cloudinary,
                frame,
                public_id,
                folder_path,
                callback
            )
            return future  # Non-blocking return
        except Exception as e:
            print(f"Error uploading to Cloudinary: {e}")
            return None

    def file_exists_on_cloudinary(self, prefix):
        """Check if a file with the given prefix exists on Cloudinary."""
        if not self.is_configured:
            return False

        try:
            result = cloudinary.api.resources(
                type="upload",
                prefix=prefix,
                max_results=1
            )
            return len(result.get('resources', [])) > 0
        except Exception as e:
            print(f"Error checking if file exists on Cloudinary: {e}")
            return False

    def __del__(self):
        """Shutdown the thread pool executor when the object is destroyed"""
        if hasattr(self, 'executor'):
            self.executor.shutdown(wait=False)
