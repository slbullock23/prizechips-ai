"""
Reset all user accounts and re-create the admin user.

Usage:
    cd backend
    python reset_db.py

Reads DATABASE_URL, ADMIN_USERNAME, ADMIN_PASSWORD from .env (or environment).
"""

import os
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base, SessionLocal
import models
import auth as auth_utils

def reset():
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("  ✓ Tables reset")

    db = SessionLocal()
    try:
        admin_username = auth_utils.ADMIN_USERNAME
        admin_password = auth_utils.ADMIN_PASSWORD

        admin = models.User(
            email="admin@blur.local",
            username=admin_username,
            hashed_password=auth_utils.hash_password(admin_password),
        )
        db.add(admin)
        db.commit()
        print(f"  ✓ Admin account created: username={admin_username!r}")
        print()
        print("Done. Log in at /admin/login with these credentials.")
        print(f"  Username : {admin_username}")
        print(f"  Password : {admin_password}")
    finally:
        db.close()

if __name__ == "__main__":
    reset()
