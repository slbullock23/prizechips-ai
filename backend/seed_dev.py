"""Seed dev accounts for local testing.

Usage:
    cd backend && python seed_dev.py
"""

from database import SessionLocal, engine
import models
from auth import hash_password

DEV_USERS = [
    {"email": "admin@blur.dev", "username": "admin", "password": "admin"},
    {"email": "test@blur.dev",  "username": "testuser", "password": "test1234"},
]

def seed():
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for u in DEV_USERS:
            exists = db.query(models.User).filter(models.User.email == u["email"]).first()
            if exists:
                print(f"  skip  {u['email']} (already exists)")
            else:
                db.add(models.User(
                    email=u["email"],
                    username=u["username"],
                    hashed_password=hash_password(u["password"]),
                ))
                print(f"  added {u['email']}")
        db.commit()
        print("Done.")
    finally:
        db.close()

if __name__ == "__main__":
    seed()
