const fetch = global.fetch;

async function testDB() {
  // Login
  console.log('Logging in...');
  const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'timetable@test.com', password: 'Password123!' })
  });
  const loginData = await loginRes.json();
  console.log('Login:', loginRes.status, loginData.accessToken ? 'success' : loginData.message);
  if (!loginData.accessToken) return;

  const headers = { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${loginData.accessToken}`
  };

  // Test timetable get
  console.log('\nTesting timetable get...');
  const today = new Date().toISOString().split('T')[0];
  const getRes = await fetch(`http://localhost:3001/api/v1/timetable?date=${today}`, { headers });
  const getData = await getRes.json();
  console.log('Timetable get:', getRes.status, JSON.stringify(getData, null, 2));

  // Test timetable regenerate
  console.log('\nTesting timetable regenerate...');
  const regenRes = await fetch('http://localhost:3001/api/v1/timetable/regenerate', {
    method: 'POST',
    headers,
    body: JSON.stringify({ date: today, energyLevel: 'MEDIUM' })
  });
  const regenData = await regenRes.json();
  console.log('Timetable regenerate:', regenRes.status, JSON.stringify(regenData, null, 2));
}

testDB().catch(console.error);