import requests
import json

# Test the users API endpoints
BASE_URL = "http://localhost:5000/api"

def test_users_api():
    print("Testing Users API...")
    
    # Test 1: Try to get users without token (should fail)
    print("\n1. Testing GET /users without token:")
    try:
        response = requests.get(f"{BASE_URL}/users")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Try to login to get a token
    print("\n2. Testing login to get token:")
    try:
        login_data = {
            "email": "jbmuisha@gmail.com",
            "password": "jbGolden2912#"
        }
        response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        print(f"Login Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print(f"Token received: {token[:20]}..." if token else "No token")
            
            # Test 3: Try to get users with valid token
            print("\n3. Testing GET /users with valid token:")
            headers = {"Authorization": f"Bearer {token}"}
            response = requests.get(f"{BASE_URL}/users", headers=headers)
            print(f"Status: {response.status_code}")
            print(f"Response: {response.json()}")
            
        else:
            print(f"Login failed: {response.json()}")
    except Exception as e:
        print(f"Login error: {e}")

if __name__ == "__main__":
    test_users_api()
