import requests
import json

try:
    res = requests.get('http://localhost:5000/api/users/?school_id=2')
    print(res.status_code)
    print(json.dumps(res.json(), indent=2))
except Exception as e:
    print(e)
