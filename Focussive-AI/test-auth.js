const fetch = global.fetch;

async function testAuth() {
  // Test signup
  console.log('Testing signup...');
  const signupRes = await fetch('http://localhost:3001/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123', fullName: 'Test User' })
  });
  const signupData = await signupRes.json();
  console.log('Signup:', signupRes.status, signupData);

  if (signupData.accessToken) {
    // Test login
    console.log('\nTesting login...');
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    console.log('Login:', loginRes.status, loginData);

    // Test /me with token
    console.log('\nTesting /me...');
    const meRes = await fetch('http://localhost:3001/api/v1/auth/me', {
      headers: { 'Authorization': `Bearer ${loginData.accessToken}` }
    });
    const meData = await meRes.json();
    console.log('/me:', meRes.status, meData);
  }
}

testAuth().catch(console.error);