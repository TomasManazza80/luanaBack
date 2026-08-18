const axios = require('axios');

async function run() {
  try {
    const email = `testapi_${Date.now()}@gmail.com`;
    const password = 'mysecretpassword';
    
    console.log("1. Creating user...");
    const res = await axios.post('http://localhost:3000/createuser', {
        email: email,
        password: password,
        name: "First Last",
        number: "0000000000",
        role: 'user'
    });
    console.log("Create user status:", res.status);
    console.log("Create user data:", res.data);

    console.log("2. Logging in...");
    const loginRes = await axios.post('http://localhost:3000/login', {
        email: email,
        password: password
    });
    console.log("Login status:", loginRes.status);
    console.log("Login data keys:", Object.keys(loginRes.data));
    
  } catch(e) {
    console.error("Test Error:", e.response ? e.response.status : e.message);
    if(e.response) {
      console.error("Data:", e.response.data);
    }
  }
}

run();
