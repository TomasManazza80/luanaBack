const axios = require('axios');

async function testLeaderboard() {
  try {
    const res = await axios.get('http://localhost:3001/api/pronunciation/leaderboard');
    console.log("Leaderboard:", res.data);
  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

testLeaderboard();
