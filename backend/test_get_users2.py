import urllib.request
import json

req = urllib.request.Request('http://localhost:5000/api/users/?school_id=2')
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Users found: {len(data.get('users', []))}")
        for u in data.get('users', []):
            print(f"Name: {u.get('name')}, Role: {u.get('role')}, School: {u.get('school_id')}")
except Exception as e:
    print(e)
