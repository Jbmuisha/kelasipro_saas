import requests
import json


BASE_URL = "http://localhost:5000/api"

def test_users_api():
    print("Testing Users API...")
    
    
    print("\n1. Testing GET /users without token:")
    try:
        response = requests.get(BASE_URL + "/users")
        print("Status: {}".format(response.status_code))
        print("Response: {}".format(response.json()))
    except Exception as e:
        print("Error: {}".format(e))
    
 
    print("\n2. Testing login to get token:")
    try:
        login_data = {
            "email": "jbmuisha@gmail.com",
            "password": "jbGolden2912#"
        }
        response = requests.post(BASE_URL + "/auth/login", json=login_data)
        print("Login Status: {}".format(response.status_code))
        if response.status_code == 200:
            data = response.json()
            token = data.get("token")
            print("Token received: {}...".format(token[:20]) if token else "No token")
            
           
            print("\n3. Testing GET /users/users with valid token:")
            headers = {"Authorization": "Bearer {}".format(token)}
            response = requests.get(BASE_URL + "/users/users", headers=headers)
            print("Status: {}".format(response.status_code))
            print("Response: {}".format(response.json()))
            
        else:
            print("Login failed: {}".format(response.json()))
    except Exception as e:
        print("Login error: {}".format(e))

if __name__ == "__main__":
    test_users_api()
