#!/usr/bin/env python3
"""
Test script for the Telegram Sender Backend API
"""

import requests
import json
import time

BASE_URL = "http://localhost:8000"

def test_health_check():
    """Test the health check endpoint"""
    print("🔍 Testing health check...")
    try:
        response = requests.get(f"{BASE_URL}/api/health")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend. Make sure it's running on port 8000")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_auth_endpoints():
    """Test authentication endpoints"""
    print("\n🔐 Testing authentication endpoints...")
    
    # Test login endpoint (should fail without credentials)
    try:
        response = requests.post(f"{BASE_URL}/api/auth/login", json={})
        if response.status_code == 400:
            print("✅ Login validation working (correctly rejected empty credentials)")
        else:
            print(f"⚠️  Unexpected login response: {response.status_code}")
    except Exception as e:
        print(f"❌ Login test error: {e}")
    
    # Test auth status without token
    try:
        response = requests.get(f"{BASE_URL}/api/auth/status")
        if response.status_code == 401:
            print("✅ Auth status protection working (correctly rejected no token)")
        else:
            print(f"⚠️  Unexpected auth status response: {response.status_code}")
    except Exception as e:
        print(f"❌ Auth status test error: {e}")

def test_protected_endpoints():
    """Test protected endpoints without authentication"""
    print("\n🛡️  Testing protected endpoints...")
    
    endpoints = [
        ("/api/chats", "GET"),
        ("/api/messages/send", "POST"),
        ("/api/messages/scheduled", "GET"),
    ]
    
    for endpoint, method in endpoints:
        try:
            if method == "GET":
                response = requests.get(f"{BASE_URL}{endpoint}")
            else:
                response = requests.post(f"{BASE_URL}{endpoint}", json={})
            
            if response.status_code == 401:
                print(f"✅ {endpoint} properly protected")
            else:
                print(f"⚠️  {endpoint} unexpected response: {response.status_code}")
        except Exception as e:
            print(f"❌ Error testing {endpoint}: {e}")

def test_cors():
    """Test CORS headers"""
    print("\n🌐 Testing CORS configuration...")
    try:
        response = requests.options(f"{BASE_URL}/api/health")
        headers = response.headers
        
        if 'Access-Control-Allow-Origin' in headers:
            print("✅ CORS headers present")
        else:
            print("⚠️  CORS headers missing")
            
    except Exception as e:
        print(f"❌ CORS test error: {e}")

def main():
    """Run all tests"""
    print("🧪 Testing Telegram Sender Backend API")
    print("=" * 50)
    
    # Test health check first
    if not test_health_check():
        print("\n❌ Backend is not running or not accessible")
        print("💡 Make sure to start the backend with: python start_backend.py")
        return
    
    # Run other tests
    test_auth_endpoints()
    test_protected_endpoints()
    test_cors()
    
    print("\n" + "=" * 50)
    print("🎉 Backend API tests completed!")
    print("💡 To test with real credentials, use the frontend or manual API calls")

if __name__ == "__main__":
    main() 