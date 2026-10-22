"""
Download royalty-free test face images and generate a classroom session photo for testing.
"""

import os
import urllib.request
from PIL import Image

TEST_IMAGES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test-images')
os.makedirs(TEST_IMAGES_DIR, exist_ok=True)

SAMPLES = [
    {
        'id': 'TE-A-01',
        'name': 'student1_aarav.jpg',
        'url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop&q=80'
    },
    {
        'id': 'TE-A-02',
        'name': 'student2_ananya.jpg',
        'url': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&auto=format&fit=crop&q=80'
    },
    {
        'id': 'TE-A-03',
        'name': 'student3_rohan.jpg',
        'url': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=600&auto=format&fit=crop&q=80'
    },
    {
        'id': 'TE-A-04',
        'name': 'student4_pooja.jpg',
        'url': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
    }
]

def main():
    print("Downloading royalty-free test portrait images...")
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
    images = []

    for s in SAMPLES:
        dest = os.path.join(TEST_IMAGES_DIR, s['name'])
        print(f"Fetching {s['name']}...")
        req = urllib.request.Request(s['url'], headers=headers)
        with urllib.request.urlopen(req) as resp, open(dest, 'wb') as f:
            f.write(resp.read())
        images.append(Image.open(dest))
        print(f"[OK] Saved {dest}")

    # Create composite classroom test image (e.g. 1600x900 canvas with 4 students seated)
    print("Generating composite classroom test photo 'class_session_test.jpg'...")
    canvas = Image.new('RGB', (1600, 900), color=(235, 230, 220))
    positions = [(100, 250), (450, 220), (850, 240), (1200, 230)]

    for idx, img in enumerate(images):
        resized = img.resize((300, 400), Image.Resampling.LANCZOS)
        canvas.paste(resized, positions[idx])

    class_dest = os.path.join(TEST_IMAGES_DIR, 'class_session_test.jpg')
    canvas.save(class_dest, format='JPEG', quality=92)
    print(f"[OK] Saved classroom test image: {class_dest}")
    print("Test images preparation complete.")

if __name__ == '__main__':
    main()
