import axios from 'axios';

async function test() {
  try {
    const res = await axios.post('https://englishecommerce-back.onrender.com/createuser', {
      name: "Test User",
      email: "test_new_unique_email@gmail.com",
      number: "123456789",
      password: "password123"
    });
    console.log(res.status, res.data);
  } catch (err) {
    if (err.response) {
      console.log("Error status:", err.response.status);
      console.log("Error data:", err.response.data);
    } else {
      console.log("Error:", err.message);
    }
  }
}

test();
