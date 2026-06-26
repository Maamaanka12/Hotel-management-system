"""
face_scanner.py

This script is a blueprint for biometric face enrollment.
It accepts a guest ID from the command line, opens the webcam,
captures frames using OpenCV, generates a simulated 128-element
face embedding, and prints a JSON response to stdout.

Node.js will spawn this script and parse the final JSON output.
"""

import sys
import json
import time
import cv2
import numpy as np


def build_response(success, guest_id, message, face_embedding=None):

    return {
        "success": success,
        "guestId": guest_id,
        "message": message,
        "faceEmbedding": face_embedding
    }




def generate_simulated_embedding():
    """
    Generate a 128-element numeric facial fingerprint.

    In a real implementation, this function would extract facial landmarks
    or a learned embedding from a face recognition model.
    """
    embedding_array = np.random.rand(128).round(6).tolist()
    return json.dumps(embedding_array)


def capture_face_frame(camera):
    """
    Capture a single frame from the webcam.

    This function demonstrates the OpenCV read loop pattern and can be extended
    to include face detection or verification logic.
    """
    success, frame = camera.read()
    if not success:
        return None
    return frame


def main():
    """
    Main program entry point.

    Steps:
    1. Validate command-line arguments.
    2. Open the webcam.
    3. Capture frames for a short period.
    4. Generate a simulated 128-dimensional embedding.
    5. Print one final JSON object to stdout.
    """
    if len(sys.argv) < 2:
        print(json.dumps(build_response(False, None, "Guest ID is required.")))
        sys.exit(1)

    try:
        guest_id = int(sys.argv[1])
    except ValueError:
        print(json.dumps(build_response(False, None, "Guest ID must be an integer.")))
        sys.exit(1)

    camera = cv2.VideoCapture(0)

    if not camera.isOpened():
        print(json.dumps(build_response(False, guest_id, "Unable to open webcam.")))
        sys.exit(1)

    try:
        frame_count = 0
        while frame_count < 10:
            frame = capture_face_frame(camera)
            if frame is None:
                print(json.dumps(build_response(False, guest_id, "Failed to capture webcam frame.")))
                sys.exit(1)

            frame_count += 1
            time.sleep(0.05)

        face_embedding = generate_simulated_embedding()

        response_object = build_response(
            True,
            guest_id,
            "Face captured successfully.",
            face_embedding
        )

        print(json.dumps(response_object))
        sys.exit(0)

    finally:
        camera.release()
        cv2.destroyAllWindows()


if __name__ == "__main__":
    main()