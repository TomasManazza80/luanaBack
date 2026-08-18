const userService = require('./services/userServices');
const db = require('./dbconnection/db');

async function test() {
  try {
    const email = `test_${Date.now()}@gmail.com`;
    const password = 'mysecretpassword';
    
    console.log("1. Creating user...");
    const newUser = await userService.createUser({
      name: "Test Flow",
      email,
      number: "11111111",
      password
    });
    console.log("Create user response:", newUser.email ? "Success" : newUser);

    console.log("2. Logging in...");
    const loginRes = await userService.login({ email, password });
    console.log("Login response:", typeof loginRes === 'object' ? "Success (Token received)" : loginRes);
    
    process.exit(0);
  } catch(e) {
    console.error("Test Error:", e);
    process.exit(1);
  }
}

test();
