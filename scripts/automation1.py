# scripts/automation1.py

import requests

def main():
    print("Running Automation 1: Making an HTTP request to JSONPlaceholder API")
    
    # Make a GET request to a test API
    response = requests.get('https://jsonplaceholder.typicode.com/todos/1')
    
    if response.status_code == 200:
        data = response.json()
        print("Received Data:")
        print(data)
    else:
        print(f"Failed to retrieve data. Status code: {response.status_code}")

if __name__ == "__main__":
    main()
