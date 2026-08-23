const fetch = global.fetch;

async function testAuthErrors() {
  // Test login with non-existent email
  console.log('Testing login with non-existent email...');
  const res1 = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent@example.com', password: 'password123' })
  });
  const data1 = await res1.json();
  console.log('Non-existent email:', res1.status, data1);

  // Test login with wrong password
  console.log('\nTesting login with wrong password...');
  const res2 = await fetch('http://localhost:3001/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' })
  });
  const data2 = await res2.json();
  console.log('Wrong password:', res2.status, data2);

  // Test signup with existing email
  console.log('\nTesting signup with existing email...');
  const res3 = await fetch('http://localhost:3001/api/v1/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123', fullName: 'Test User' })
  });
  const data3 = await res3.json();
  console.log('Existing email:', res3.status, data3);
}

testAuthErrors().catch(console.error);