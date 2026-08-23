const fetch = global.fetch;

async function testTimetable() {
  // Try login
  console.log('Logging in...');
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'timetable@test.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginRes.status, loginData.accessToken ? 'success' : loginData.message);
  if (!loginData.accessToken) return;
  
  // Decode token to check
  const token = loginData.accessToken;
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('Token payload:', payload);
  console.log('Token exp:', new Date(payload.exp * 1000).toISOString());
  console.log('Now:', new Date().toISOString());

  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Test regenerate
  console.log('\nTesting regenerate...');
  const today = new Date().toISOString().split('T')[0];
  const regenRes = await fetch('http://localhost:3001/api/v1/timetable/regenerate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ date: today, energyLevel: 'MEDIUM' })
  });
  const regenData = await regenRes.json();
  console.log('Regenerate:', regenRes.status, JSON.stringify(regenData, null, 2));

  // Test get timetable
  console.log('\nTesting get timetable...');
  const getRes = await fetch(`http://localhost:3001/api/v1/timetable?date=${today}`, {
    headers
  });
  const getData = await getRes.json();
  console.log('Get timetable:', getRes.status, JSON.stringify(getData, null, 2));
}

testTimetable().catch(console.error);