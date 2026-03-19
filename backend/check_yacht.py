from core.database import SessionLocal
from models.booking import Yacht

db = SessionLocal()
y = db.query(Yacht).first()
if y:
    print(f"Yacht Name: {y.name}")
    print(f"Yacht Model: {y.model}")
    print(f"Images: {y.images}")
    print(f"Videos: {y.videos if hasattr(y, 'videos') else 'N/A'}")
else:
    print("No yacht found")
db.close()
