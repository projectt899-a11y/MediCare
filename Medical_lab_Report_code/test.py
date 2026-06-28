import requests
import time

BASE_URL = "https://omaraahmed-model.hf.space"
IMAGE_PATH = r"C:/Users/Masria/OneDrive/Desktop/img/img.jpg"

print(f"📄 Sending: {IMAGE_PATH}")

with open(IMAGE_PATH, "rb") as f:
    response = requests.post(
        f"{BASE_URL}/analyze",
        files={"file": ("img.jpg", f, "image/jpeg")},
        timeout=30
    )

job_id = response.json()["job_id"]
print(f"✅ Job started, waiting for result...\n")

while True:
    time.sleep(30)
    result = requests.get(f"{BASE_URL}/result/{job_id}", timeout=10).json()

    if result["status"] == "done":
        print(result.get("formatted_output"))
        break
    elif result["status"] == "error":
        print(f"❌ Error: {result.get('detail')}")
        break



    