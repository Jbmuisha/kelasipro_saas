"use client";

import { useEffect, useState } from "react";

export default function DebugTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, message]);
  };

  const runTests = async () => {
    addResult("🔍 Starting debug tests...");

    // Test 1: Check if fetch is available
    addResult("Test 1: Checking fetch availability...");
    if (typeof fetch === 'undefined') {
      addResult("❌ fetch is not available");
      return;
    } else {
      addResult("✅ fetch is available");
    }

    // Test 2: Check network connectivity
    addResult("Test 2: Testing network connectivity...");
    try {
      const response = await fetch('https://httpbin.org/get');
      addResult(`✅ Network connectivity: ${response.status}`);
    } catch (error) {
      addResult(`❌ Network error: ${error}`);
    }

    // Test 3: Test backend server accessibility
    addResult("Test 3: Testing backend server...");
    try {
      const response = await fetch('http://localhost:5000/test');
      const data = await response.json();
      addResult(`✅ Backend server: ${response.status} - ${data.message}`);
    } catch (error) {
      addResult(`❌ Backend server error: ${error}`);
    }

    // Test 4: Test schools API endpoint
    addResult("Test 4: Testing schools API...");
    try {
      const response = await fetch('http://localhost:5000/api/schools');
      const data = await response.json();
      addResult(`✅ Schools API: ${response.status} - ${data.schools?.length || 0} schools`);
    } catch (error) {
      addResult(`❌ Schools API error: ${error}`);
    }

    // Test 5: Test CORS
    addResult("Test 5: Testing CORS headers...");
    try {
      const response = await fetch('http://localhost:5000/api/schools', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      addResult(`✅ CORS preflight: ${response.status}`);
    } catch (error) {
      addResult(`❌ CORS error: ${error}`);
    }

    addResult("🏁 Debug tests completed!");
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h2>🔧 Debug Test Page</h2>
      <button onClick={runTests} style={{ 
        padding: '10px 20px', 
        backgroundColor: '#007bff', 
        color: 'white', 
        border: 'none', 
        borderRadius: '5px',
        cursor: 'pointer'
      }}>
        Run Debug Tests
      </button>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Test Results:</h3>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '10px', 
          border: '1px solid #ddd',
          maxHeight: '400px',
          overflow: 'auto'
        }}>
          {testResults.map((result, index) => (
            <div key={index} style={{ marginBottom: '5px', fontFamily: 'monospace' }}>
              {result}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}