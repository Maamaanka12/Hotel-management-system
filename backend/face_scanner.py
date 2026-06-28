# """
# face_scanner.py
# Real face enrollment using face_recognition + OpenCV.
# Usage: python face_scanner.py <guest_id>

# Flow:
# 1. Open webcam
# 2. Detect face using face_recognition
# 3. Extract 128-d embedding
# 4. Draw green rectangle around face
# 5. Print JSON to stdout
# 6. All debug/info goes to stderr (keeps stdout clean for Node.js)
# """

# import sys
# import json
# import time
# import cv2
# import face_recognition
# import numpy as np


# def log(message):
#     print(message, file=sys.stderr, flush=True)


# def build_response(success, guest_id, message, face_embedding=None):
#     return {
#         "success": success,
#         "guestId": guest_id,
#         "message": message,
#         "faceEmbedding": face_embedding
#     }


# def main():
#     if len(sys.argv) < 2:
#         print(json.dumps(build_response(False, None, "Guest ID is required.")))
#         sys.exit(1)

#     try:
#         guest_id = int(sys.argv[1])
#     except ValueError:
#         print(json.dumps(build_response(False, None, "Guest ID must be an integer.")))
#         sys.exit(1)

#     #  Open webcam 
#     camera = cv2.VideoCapture(0)
#     if not camera.isOpened():
#         print(json.dumps(build_response(False, guest_id, "Unable to open webcam.")))
#         sys.exit(1)

#     log(f"[FaceID] Camera opened. Scanning for guest {guest_id}...")

#     embedding = None
#     start_time = time.time()
#     MAX_SECONDS = 10
#     REQUIRED_DETECTIONS = 3   
#     consecutive = 0
#     last_embedding = None

#     try:
#         while time.time() - start_time < MAX_SECONDS:
#             ret, frame = camera.read()
#             if not ret:
#                 log("[FaceID] Failed to read frame.")
#                 break

#             # Resize to 1/4 size for faster detection
#             small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
#             rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)


#             face_locations = face_recognition.face_locations(rgb_small, model="hog")

#             if len(face_locations) == 0:
#                 consecutive = 0
#                 log("[FaceID] No face in frame...")
#                 cv2.imshow("Face ID Enrollment — Press x to cancel", frame)
#                 if cv2.waitKey(1) & 0xFF == ord('x'):
#                     break
#                 continue

#             if len(face_locations) > 1:
#                 log("[FaceID] Multiple faces detected. Need exactly one face.")
#                 consecutive = 0
#                 cv2.imshow("Face ID Enrollment — Press x to cancel", frame)
#                 if cv2.waitKey(1) & 0xFF == ord('x'):
#                     break
#                 continue

#             rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

#             top, right, bottom, left = face_locations[0]
#             top    *= 4
#             right  *= 4
#             bottom *= 4
#             left   *= 4

#             encodings = face_recognition.face_encodings(
#                 rgb_frame,
#                 [(top, right, bottom, left)]
#             )

#             if not encodings:
#                 log("[FaceID] Could not encode face.")
#                 consecutive = 0
#                 continue

#             last_embedding = encodings[0]
#             consecutive += 1
#             log(f"[FaceID] Face detected ({consecutive}/{REQUIRED_DETECTIONS})...")


#             cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
#             cv2.putText(
#                 frame,
#                 f"Scanning... {consecutive}/{REQUIRED_DETECTIONS}",
#                 (left, top - 10),
#                 cv2.FONT_HERSHEY_SIMPLEX,
#                 0.6,
#                 (0, 255, 0),
#                 2
#             )
#             cv2.imshow("Face ID Enrollment — Press x to cancel", frame)
#             if cv2.waitKey(1) & 0xFF == ord('x'):
#                 break

#             if consecutive >= REQUIRED_DETECTIONS:
#                 embedding = last_embedding
#                 log("[FaceID] Face locked. Enrollment complete.")
#                 time.sleep(0.5)  
#                 break

#     finally:
#         camera.release()
#         cv2.destroyAllWindows()

#     if embedding is None:
#         print(json.dumps(build_response(
#             False,
#             guest_id,
#             "No face detected. Please ensure your face is clearly visible."
#         )))
#         sys.exit(1)

#     embedding_list = [round(float(v), 6) for v in embedding]
#     embedding_json = json.dumps(embedding_list)

#     print(json.dumps(build_response(
#         True,
#         guest_id,
#         "Face captured successfully.",
#         embedding_json
#     )))
#     sys.exit(0)


# if __name__ == "__main__":
#     main()




"""
face_scanner.py
Real face enrollment using face_recognition + OpenCV.
Usage: python face_scanner.py <guest_id>
"""

import sys
import json
import time
import cv2
import face_recognition


def log(message):
    print(message, file=sys.stderr, flush=True)


def build_response(success, guest_id, message, face_embedding=None):
    return {
        "success": success,
        "guestId": guest_id,
        "message": message,
        "faceEmbedding": face_embedding
    }


def main():
    # ── 1. Validate args ──────────────────────────────────────────────
    if len(sys.argv) < 2:
        print(json.dumps(build_response(False, None, "Guest ID is required.")))
        sys.exit(1)

    try:
        guest_id = int(sys.argv[1])
    except ValueError:
        print(json.dumps(build_response(False, None, "Guest ID must be an integer.")))
        sys.exit(1)

    # ── 2. Open webcam ────────────────────────────────────────────────
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print(json.dumps(build_response(False, guest_id, "Unable to open webcam.")))
        sys.exit(1)

    log(f"[FaceID] Camera opened. Scanning for guest {guest_id}...")

    REQUIRED_DETECTIONS = 3
    MAX_SECONDS = 40
    consecutive = 0
    last_embedding = None
    embedding = None

    # ── 3. Warmup phase (2 seconds) ───────────────────────────────────
    warmup_start = time.time()
    WARMUP_SECONDS = 10

    while time.time() - warmup_start < WARMUP_SECONDS:
        ret, frame = camera.read()
        if not ret:
            break
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (frame.shape[1], frame.shape[0]), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.4, frame, 0.6, 0, frame)
        cv2.putText(
            frame,
            "Initializing camera...",
            (frame.shape[1] // 2 - 160, frame.shape[0] // 2),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9, (255, 255, 255), 2
        )
        cv2.imshow("Face ID Enrollment", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            camera.release()
            cv2.destroyAllWindows()
            print(json.dumps(build_response(False, guest_id, "Scan cancelled by user.")))
            sys.exit(1)

    # ── 4. Scan loop ──────────────────────────────────────────────────
    scan_start = time.time()
    frame_index = 0

    try:
        while time.time() - scan_start < MAX_SECONDS:
            ret, frame = camera.read()
            if not ret:
                log("[FaceID] Failed to read frame.")
                break

            frame_index += 1

            # Process every 2nd frame for speed (still full resolution)
            if frame_index % 2 != 0:
                cv2.imshow("Face ID Enrollment", frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break
                continue

            # Resize small copy for detection only
            small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
            rgb_small = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

            face_locations = face_recognition.face_locations(rgb_small, model="hog")

            if len(face_locations) == 0:
                consecutive = 0
                cv2.putText(frame, "Looking for face...", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 165, 255), 2)
                log("[FaceID] No face in frame...")

            elif len(face_locations) > 1:
                consecutive = 0
                cv2.putText(frame, "Multiple faces detected — show only one face", (20, 40),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
                log("[FaceID] Multiple faces.")

            else:
                # Scale detection box back to full res
                top, right, bottom, left = face_locations[0]
                top    *= 4
                right  *= 4
                bottom *= 4
                left   *= 4

                # Get embedding from full-res frame
                rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                encodings = face_recognition.face_encodings(rgb_frame, [(top, right, bottom, left)])

                if not encodings:
                    consecutive = 0
                else:
                    last_embedding = encodings[0]
                    consecutive += 1
                    log(f"[FaceID] Detected ({consecutive}/{REQUIRED_DETECTIONS})")

                    # Green rectangle
                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                    cv2.putText(
                        frame,
                        f"Scanning... {consecutive}/{REQUIRED_DETECTIONS}",
                        (left, top - 12),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.7, (0, 255, 0), 2
                    )

                    if consecutive >= REQUIRED_DETECTIONS:
                        embedding = last_embedding
                        log("[FaceID] Face locked.")

                        # ── 5. Success screen ─────────────────────────
                        success_start = time.time()
                        while time.time() - success_start < 2.5:
                            ret2, success_frame = camera.read()
                            if ret2:
                                # Draw green rectangle on live feed
                                cv2.rectangle(success_frame, (left, top), (right, bottom), (0, 255, 0), 3)
                                # Dark overlay at top
                                banner = success_frame.copy()
                                cv2.rectangle(banner, (0, 0), (success_frame.shape[1], 80), (0, 0, 0), -1)
                                cv2.addWeighted(banner, 0.6, success_frame, 0.4, 0, success_frame)
                                cv2.putText(
                                    success_frame,
                                    "Face Registered Successfully",
                                    (success_frame.shape[1] // 2 - 230, 50),
                                    cv2.FONT_HERSHEY_SIMPLEX,
                                    1.1, (0, 255, 0), 3
                                )
                                cv2.imshow("Face ID Enrollment", success_frame)
                                cv2.waitKey(1)
                        break

            cv2.imshow("Face ID Enrollment", frame)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    finally:
        camera.release()
        cv2.destroyAllWindows()

    # ── 6. Output JSON ────────────────────────────────────────────────
    if embedding is None:
        print(json.dumps(build_response(
            False, guest_id,
            "No face detected. Please ensure your face is clearly visible."
        )))
        sys.exit(1)

    embedding_list = [round(float(v), 6) for v in embedding]
    embedding_json = json.dumps(embedding_list)

    print(json.dumps(build_response(
        True, guest_id,
        "Face captured successfully.",
        embedding_json
    )))
    sys.exit(0)


if __name__ == "__main__":
    main()