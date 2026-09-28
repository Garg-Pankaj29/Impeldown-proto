async function run() {
  const loginRes = await fetch('http://localhost:5173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'pankajgarg654321@gmail.com', password: 'password123' })
  });
  
  if (!loginRes.ok) {
    console.error("Login failed:", await loginRes.text());
    return;
  }
  
  const { token, user } = await loginRes.json();
  
  const formData = new FormData();
  formData.append('title', 'The prisoner has escaped');
  formData.append('location', 'Level 1: Crimson Hell');
  formData.append('category', 'CELL_RIOT');
  formData.append('occurredAt', new Date().toISOString());
  formData.append('description', 'test');
  formData.append('reporter', user.name);

  const res = await fetch('http://localhost:5173/api/incidents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}
run();
