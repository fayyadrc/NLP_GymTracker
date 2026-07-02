import os
import time
import requests
from ...core import dotenv_loader
from supabase import create_client, Client
from ..analytics.service import AnalyticsService

# ===== CONFIG =====
CLIENT_ID = os.environ.get("STRAVA_CLIENT_ID", "234307")
CLIENT_SECRET = os.environ.get("STRAVA_CLIENT_SECRET", "d22469f5cc510482fff2b760ab9f82b7113c5d4c")
REFRESH_TOKEN = os.environ.get("STRAVA_REFRESH_TOKEN", "3f0d290b37cc0bdb0c118bb67ba21980a3c5634e")

BASE_URL = "https://www.strava.com/api/v3"

def get_access_token():
    auth_data = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": REFRESH_TOKEN,
        "grant_type": "refresh_token",
    }
    
    res = requests.post(
        "https://www.strava.com/oauth/token",
        data=auth_data,
    )
    
    res.raise_for_status()
    data = res.json()
    
    return data["access_token"], data["refresh_token"]

def safe_get(url, token, params=None):
    while True:
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        res = requests.get(
            url,
            headers=headers,
            params=params,
        )

        if res.status_code == 429:
            print("⏳ Rate limit hit, sleeping 60s...")
            time.sleep(60)
            continue

        if res.status_code == 401:
            raise Exception("Unauthorized - token likely invalid")

        res.raise_for_status()
        return res.json()

def get_all_activity_summaries(token):
    all_summaries = []
    page = 1

    while True:
        # May 2, 2026 @ 00:00:00 UTC, date of sync feature implementation
        AFTER_TIMESTAMP = 1777680000
        
        params = {
            "per_page": 200, 
            "page": page,
            "after": AFTER_TIMESTAMP
        }
        
        data = safe_get(
            f"{BASE_URL}/athlete/activities",
            token,
            params=params,
        )

        if not data:
            break
            
        for activity in data:
            activity_id = activity.get("id")
            detailed = safe_get(f"{BASE_URL}/activities/{activity_id}", token)
            
            summary = {
                "id": activity_id,
                "name": activity.get("name"),
                "type": activity.get("type"),
                "start_date": activity.get("start_date"),
                "distance_meters": activity.get("distance"),
                "duration_seconds": activity.get("moving_time"),
                "elevation_gain": activity.get("total_elevation_gain"),
                "avg_speed_mps": activity.get("average_speed"),
                "max_speed_mps": activity.get("max_speed"),
                "avg_heartrate": activity.get("average_heartrate"),
                "max_heartrate": activity.get("max_heartrate"),
                "avg_cadence": activity.get("average_cadence"),
                "avg_temp": activity.get("average_temp"),
                "calories": detailed.get("calories") or activity.get("kilojoules")
            }
            all_summaries.append(summary)
            
            time.sleep(0.2)

        print(f"📄 Page {page}: Processed {len(data)} activities")
        page = page + 1
        time.sleep(1)

    return all_summaries

def sync_strava_data():
    """Fetches live data from Strava and updates the Supabase database."""
    print("🚀 Starting Strava data sync...")
    try:
        token, _ = get_access_token()
        print("🔑 Access token obtained")
        
        print("🏃 Fetching activity summaries...")
        summaries = get_all_activity_summaries(token)
        
        if not summaries:
            print("⚠️ No data fetched from Strava")
            return
            
        print(f"✅ Fetched {len(summaries)} activities from Strava")
        
        url = os.environ.get("SUPABASE_URL")
        key = os.environ.get("SUPABASE_KEY")
        
        if not url or not key:
            print("❌ Missing Supabase credentials! Cannot sync.")
            return
            
        supabase: Client = create_client(url, key)
        print("✅ Connected to Supabase")
        
        # Upsert in batches of 100 to avoid request size limits
        batch_size = 100
        total_inserted = 0
        for i in range(0, len(summaries), batch_size):
            batch = summaries[i:i+batch_size]
            response = supabase.table("strava_activities").upsert(batch).execute()
            inserted_count = len(response.data) if hasattr(response, 'data') and response.data else len(batch)
            total_inserted += inserted_count
            print(f"   Inserted batch {i//batch_size + 1}: {inserted_count} records")
            
        print(f"✅ Successfully synced {total_inserted} activities to Supabase!")
        AnalyticsService.clear_cache()
        
    except Exception as e:
        print(f"❌ Error during Strava sync: {e}")
        raise e

if __name__ == "__main__":
    sync_strava_data()
