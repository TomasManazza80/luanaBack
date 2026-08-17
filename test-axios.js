import axios from 'axios';

const testEvaluate = async () => {
    try {
        console.log("Sending request with empty transcript...");
        const res = await axios.post(`http://localhost:3001/api/pronunciation/evaluate`, {
            task_id: 1,
            transcribed_text: " ",
            student_id: null
        });
        console.log("Success!", res.data);
    } catch (error) {
        console.error("Axios error:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
};

testEvaluate();
