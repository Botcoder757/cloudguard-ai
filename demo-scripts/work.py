#!/usr/bin/env python3
"""
DEMO SCRIPT - Infinite Loop Detection (IMPROVED)
Shows judges a CLEAR and DRAMATIC spike in the graph!

DEMO TIMELINE:
- 0-20s:  BASELINE (0.5 calls/sec) - Graph builds up steadily
- 20-40s: ACCELERATION (2-5 calls/sec) - Judges see rate increasing
- 40s+:   INFINITE LOOP (10-50 calls/sec) - DRAMATIC SPIKE + Alert triggers
"""

import requests
import time
import sys

API_URL = "http://localhost:3001/api/log-call"

print("\n" + "="*70)
print("🔄 CLOUD FUNCTION - Image Processor (Demo Mode)")
print("="*70)
print("📊 Phase 1: Establishing baseline (20 seconds)")
print("⚡ Phase 2: Acceleration phase (20 seconds)")
print("🚨 Phase 3: INFINITE LOOP - Watch the spike!")
print("="*70 + "\n")

call_count = 0
start_time = time.time()

def get_phase():
    """Determine which phase we're in based on elapsed time"""
    elapsed = time.time() - start_time
    if elapsed < 20:
        return "BASELINE", 2.0  # 0.5 calls/sec
    elif elapsed < 40:
        return "ACCEL", 0.3  # ~3 calls/sec
    else:
        return "LOOP", 0.05  # 20+ calls/sec - SPIKE!

try:
    while True:
        call_count += 1
        elapsed = time.time() - start_time
        phase, delay = get_phase()
        
        try:
            # Call the API
            response = requests.post(API_URL, json={
                "function_name": "image-processor",
                "project_id": "demo-project-001",
                "is_baseline": (phase == "BASELINE"),
                "timestamp": int(time.time() * 1000)
            }, timeout=2)
            
            # Visual feedback
            if phase == "BASELINE":
                icon = "📝"
                color = "green"
            elif phase == "ACCEL":
                icon = "⚡"
                color = "yellow"
            else:
                icon = "🔥"
                color = "red"
            
            status = "✅" if response.status_code == 200 else "⚠️"
            print(f"{status} {icon} [{phase:8s}] Call #{call_count:4d} | Time: {elapsed:5.1f}s | Rate: {1/delay:.1f}/s")
            
            # Sleep between calls
            time.sleep(delay)
            
        except requests.exceptions.Timeout:
            print(f"⏱️  Call #{call_count:4d} | Timeout")
            time.sleep(1)
            
        except requests.exceptions.ConnectionError:
            print(f"❌ Call #{call_count:4d} | Connection error - Is backend running?")
            print("💡 Start backend: cd backend && npm start")
            time.sleep(2)
            
except KeyboardInterrupt:
    print(f"\n{'='*70}")
    print(f"🛑 DEMO STOPPED")
    print(f"{'='*70}")
    print(f"Total calls: {call_count}")
    print(f"Duration: {time.time() - start_time:.1f}s")
    print(f"Peak rate: ~20 calls/second")
    print(f"{'='*70}\n")
    sys.exit(0)

except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)