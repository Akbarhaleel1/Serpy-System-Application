// Test script to check staff schedule API response
const apiClient = require('../client/src/lib/apiClient');

async function testStaffSchedule() {
  try {
    console.log('🔍 Testing staff schedule API...');
    
    // Test with a sample staff ID (you'll need to replace this with actual staff ID)
    const staffId = '69a8302c0bd2b8608e6a191b'; // Example staff ID
    
    console.log(`📅 Fetching schedule for staff: ${staffId}`);
    
    const response = await apiClient.getStaffSchedule(staffId);
    
    console.log('📅 Raw API Response:');
    console.log(JSON.stringify(response, null, 2));
    
    console.log('\n📅 Response Analysis:');
    console.log('Response type:', typeof response);
    console.log('Is array?', Array.isArray(response));
    console.log('Has data property?', response && response.data);
    console.log('Has success property?', response && response.success);
    console.log('Has schedules property?', response && response.schedules);
    
    if (response && response.data) {
      console.log('Data is array?', Array.isArray(response.data));
      console.log('Data length:', response.data?.length);
    }
    
  } catch (error) {
    console.error('❌ Error testing schedule API:', error);
  }
}

// Run the test
testStaffSchedule();
