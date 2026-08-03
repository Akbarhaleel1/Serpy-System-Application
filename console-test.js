// Console test script - paste this in browser console when logged in as staff
const BASE_URL = window.__BASE_URL__ || 'https://serpy.synxautomate.com/api';

// Test the APIs directly from browser console
console.log('🧪 Testing APIs from browser console...');

// Get the current token
const token = localStorage.getItem('token');
console.log('🔑 Token:', token ? token.substring(0, 50) + '...' : 'NOT FOUND');

// Get current user info
const userStr = localStorage.getItem('user');
const user = userStr ? JSON.parse(userStr) : null;
console.log('👤 User:', user);

if (token && user) {
  const staffId = user._id || user.id;
  console.log('🆔 Staff ID:', staffId);
  
  // Test schedule API
  fetch(`${BASE_URL}/staff/${staffId}/schedule`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('📅 Schedule API Response:', data);
  })
  .catch(err => {
    console.error('❌ Schedule API Error:', err);
  });
  
  // Test tasks API
  fetch(`${BASE_URL}/tasks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .then(data => {
    console.log('📋 Tasks API Response:', data);
    
    // Filter tasks for this staff member
    if (Array.isArray(data)) {
      const staffTasks = data.filter(task => {
        const assignedToId = task.assignedTo?._id || task.assignedTo;
        return assignedToId === staffId;
      });
      console.log('📋 Staff Tasks (filtered):', staffTasks);
    } else if (data.data && Array.isArray(data.data)) {
      const staffTasks = data.data.filter(task => {
        const assignedToId = task.assignedTo?._id || task.assignedTo;
        return assignedToId === staffId;
      });
      console.log('📋 Staff Tasks (filtered from data.data):', staffTasks);
    }
  })
  .catch(err => {
    console.error('❌ Tasks API Error:', err);
  });
} else {
  console.log('❌ No token or user found in localStorage');
}

console.log('🧪 Test complete! Check the responses above.');
