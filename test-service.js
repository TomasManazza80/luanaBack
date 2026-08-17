const userServices = require('./services/userServices');

async function test() {
  try {
    const res = await userServices.createUser({
      name: "Test User",
      email: "test_new_unique_email2@gmail.com",
      number: "123456789",
      password: "password123",
      role: "user"
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Error details:", err);
  }
}

test();
