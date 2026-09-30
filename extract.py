import cv2
import os
import glob

output_folder = 'frame'
# Nettoyer
if os.path.exists(output_folder):
    for old_file in glob.glob(os.path.join(output_folder, '*.jpg')):
        os.remove(old_file)
else:
    os.makedirs(output_folder)

video_path = 'video/1.mp4'
cap = cv2.VideoCapture(video_path)

if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

# Paramètres de fluidité
target_fps = 24
duration_limit = 8 # Secondes
total_frames_to_save = target_fps * duration_limit

# On calcule le saut pour atteindre 24fps à partir d'une source 30fps
# On va simplement lire les frames et en garder une proportion
source_fps = cap.get(cv2.CAP_PROP_FPS)
frame_interval = source_fps / target_fps

saved_count = 0
frame_idx = 0

while saved_count < total_frames_to_save:
    cap.set(cv2.CAP_PROP_POS_FRAMES, int(frame_idx * frame_interval))
    ret, frame = cap.read()
    if not ret:
        break
    
    # Resize pour gain de place massif (480px de large est suffisant pour un preloader)
    height, width = frame.shape[:2]
    new_width = 480
    new_height = int((new_width / width) * height)
    frame_resized = cv2.resize(frame, (new_width, new_height), interpolation=cv2.INTER_AREA)
    
    saved_count += 1
    frame_path = os.path.join(output_folder, f'{saved_count}.jpg')
    # Compression JPEG à 50% pour un bon compromis
    cv2.imwrite(frame_path, frame_resized, [int(cv2.IMWRITE_JPEG_QUALITY), 50])
    
    frame_idx += 1

cap.release()
print(f'Done! {saved_count} frames saved to {output_folder} (24 FPS, 8 seconds)')
