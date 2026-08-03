// Test script to verify the exact API endpoints from curl commands
const fetch = require('node-fetch');
const BASE_URL = process.env.BASE_URL || 'https://serpy.synxautomate.com/api';

const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTkxNDYyZDQ0NDUxZmE1NDExYmVlNDYiLCJpYXQiOjE3NzI3MTQ0NjEsImV4cCI6MTc3MjgwMDg2MX0.PangnkKxFPrEKsmSseKLlcXOO83MzUsDn5Q_aEtfsng';
const staffId = '69a8302c0bd2b8608e6a191b';

async function testAPIs() {
  console.log('🔍 Testing API endpoints...\n');

  // Test 1: Get all tasks
  try {
    console.log('📋 Testing GET /api/tasks');
    const tasksResponse = await fetch('${BASE_URL}/tasks', {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    const tasksData = await tasksResponse.json();
    console.log('✅ Tasks API Status:', tasksResponse.status);
    console.log('📋 Tasks Response:', JSON.stringify(tasksData, null, 2));
    console.log('📋 Tasks Response Type:', typeof tasksData);
    console.log('📋 Tasks Keys:', Object.keys(tasksData));
    console.log('');
  } catch (error) {
    console.error('❌ Tasks API Error:', error.message);
  }

  // Test 2: Get staff schedule
  try {
    console.log('📅 Testing GET /api/staff/{staffId}/schedule');
    const scheduleResponse = await fetch(`${BASE_URL}/staff/${staffId}/schedule`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    const scheduleData = await scheduleResponse.json();
    console.log('✅ Schedule API Status:', scheduleResponse.status);
    console.log('📅 Schedule Response:', JSON.stringify(scheduleData, null, 2));
    console.log('📅 Schedule Response Type:', typeof scheduleData);
    console.log('📅 Schedule Keys:', Object.keys(scheduleData));
    console.log('');
  } catch (error) {
    console.error('❌ Schedule API Error:', error.message);
  }

  // Test 3: Get tasks with assignedTo filter (like the frontend is trying)
  try {
    console.log('📋 Testing GET /api/tasks with assignedTo filter');
    const filteredTasksResponse = await fetch(`${BASE_URL}/tasks?assignedTo=${staffId}`, {
      method: 'GET',
      headers: {
        'Accept': '*/*',
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      }
    });

    const filteredTasksData = await filteredTasksResponse.json();
    console.log('✅ Filtered Tasks API Status:', filteredTasksResponse.status);
    console.log('📋 Filtered Tasks Response:', JSON.stringify(filteredTasksData, null, 2));
    console.log('📋 Filtered Tasks Response Type:', typeof filteredTasksData);
    console.log('📋 Filtered Tasks Keys:', Object.keys(filteredTasksData));
  } catch (error) {
    console.error('❌ Filtered Tasks API Error:', error.message);
  }
}

testAPIs();
