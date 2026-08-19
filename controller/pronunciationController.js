const { GoogleGenerativeAI } = require("@google/generative-ai");
const { model: models } = require("../models/index.js");

const { PronunciationActivity, PronunciationTask, StudentAttempt } = models;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const createActivity = async (req, res) => {
  try {
    const { title, description, assigned_date } = req.body;
    const activity = await PronunciationActivity.create({ title, description, assigned_date });
    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create activity" });
  }
};

const getActivities = async (req, res) => {
  try {
    const { date } = req.query;
    const query = date ? { where: { assigned_date: date } } : {};
    
    // Include nested tasks when fetching activities
    query.include = [{ model: PronunciationTask }];
    
    const activities = await PronunciationActivity.findAll(query);
    res.status(200).json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
};

const createTask = async (req, res) => {
  try {
    const { title, instruction, expected_text, activity_id } = req.body;
    const task = await PronunciationTask.create({ title, instruction, expected_text, activity_id });
    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create task" });
  }
};

const getTasks = async (req, res) => {
  try {
    const { activity_id } = req.query;
    const query = activity_id ? { where: { activity_id } } : {};
    const tasks = await PronunciationTask.findAll(query);
    res.status(200).json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
};

const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, instruction, expected_text } = req.body;
    const task = await PronunciationTask.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    
    await task.update({ title, instruction, expected_text });
    res.status(200).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to update task" });
  }
};

const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await PronunciationTask.findByPk(id);
    if (!task) return res.status(404).json({ error: "Task not found" });
    
    await task.destroy();
    res.status(200).json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to delete task" });
  }
};

const evaluateAttempt = async (req, res) => {
  try {
    const { task_id, transcribed_text, student_id, sentence_index, has_listened } = req.body;

    const task = await PronunciationTask.findByPk(task_id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    let expectedText = task.expected_text;
    
    // If expected_text is an array and a sentence_index is provided, evaluate only that sentence
    if (Array.isArray(expectedText)) {
      if (sentence_index !== undefined && expectedText[sentence_index]) {
        expectedText = expectedText[sentence_index];
      } else {
        expectedText = expectedText.join(' ');
      }
    }

    // Optimization: If the transcription perfectly matches the expected text (ignoring case and punctuation), skip AI call and return 100%.
    const cleanExpected = (expectedText || "").toString().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim().toLowerCase();
    const cleanTranscribed = (transcribed_text || "").toString().replace(/[^\w\s]|_/g, "").replace(/\s+/g, " ").trim().toLowerCase();

    let evaluationResult;

    if (cleanExpected === cleanTranscribed) {
        evaluationResult = { 
            score: 100, 
            errors: [],
            companionMessage: "¡Pronunciación perfecta! ¡Sigue así!",
            companionAnimation: "dancing"
        };
    } else {
        // Use Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });

        const prompt = `Evaluate pronunciation.
Expected: "${expectedText}"
Heard: "${transcribed_text}"

Identify:
1. Omitted words (word from Expected missing in Heard).
2. Mispronounced words (word from Expected incorrectly spoken in Heard).
3. Added words (extra words in Heard not present in Expected).

Additionally, provide a short, fun, educational feedback message in Spanish (max 8 words) for the student based on how they did. Also select one animation from this list that best fits their performance: ['happy', 'sad', 'dancing', 'pointing', 'waving', 'thinking', 'excited'].

Return JSON: {
  "score": 0-100, 
  "errors": [{"word": "the word", "reason": "omitted" | "added" | "mispronounced as '<what they said>'"}],
  "companionMessage": "...",
  "companionAnimation": "..."
}`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            try {
              const cleanText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
              evaluationResult = JSON.parse(cleanText);
            } catch (e) {
              console.error("Failed to parse JSON from Gemini:", responseText);
              return res.status(500).json({ error: "Invalid response from AI evaluator" });
            }
        } catch (apiError) {
            console.error("Gemini API Error (fallback triggered):", apiError.message);
            const expectedWords = cleanExpected.split(' ').filter(w => w);
            const transcribedWords = cleanTranscribed.split(' ').filter(w => w);
            
            let matches = 0;
            const errors = [];
            
            expectedWords.forEach(w => {
                if (transcribedWords.includes(w)) {
                    matches++;
                } else {
                    errors.push({ word: w, reason: "omitted" });
                }
            });
            
            transcribedWords.forEach(w => {
                if (!expectedWords.includes(w)) {
                    errors.push({ word: w, reason: "added" });
                }
            });
            
            const fallbackScore = expectedWords.length > 0 ? Math.round((matches / expectedWords.length) * 100) : 0;
            
            evaluationResult = {
                score: fallbackScore,
                errors: errors,
                companionMessage: fallbackScore >= 80 ? "¡Casi perfecto! Sigue así." : "¡No te rindas, tú puedes!",
                companionAnimation: fallbackScore >= 80 ? "happy" : "thinking"
            };
        }
    }

    if (has_listened && evaluationResult.score > 0) {
      // Apply a penalty (e.g., subtract 20 points, minimum 0)
      evaluationResult.score = Math.max(0, evaluationResult.score - 20);
    }

    const attempt = await StudentAttempt.create({
      student_id: student_id || null,
      task_id,
      sentence_index,
      transcribed_text,
      score: evaluationResult.score,
      feedback_json: evaluationResult.errors
    });

    res.status(200).json({ attempt, evaluation: evaluationResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to evaluate attempt" });
  }
};

const getLeaderboard = async (req, res) => {
  try {
    const { Op } = require("sequelize");
    const sequelize = models.StudentAttempt.sequelize;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const leaderboard = await StudentAttempt.findAll({
      attributes: [
        'student_id',
        [sequelize.fn('SUM', sequelize.col('score')), 'total_score']
      ],
      where: {
        createdAt: {
          [Op.gte]: startOfMonth
        },
        student_id: {
          [Op.ne]: null
        }
      },
      group: ['student_id', 'user.id'],
      include: [{
        model: models.user,
        attributes: ['name', 'email']
      }],
      order: [[sequelize.literal('total_score'), 'DESC']],
      limit: 10
    });

    res.status(200).json(leaderboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};

const getCompanionContext = async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "Text is required" });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });

        const prompt = `You are a fun, encouraging stickman companion helping a student practice English pronunciation.
The student is about to read this sentence: "${text}"

Generate a short, fun, encouraging phrase (max 5 words) related to the topic of the sentence.
Also, choose a fun animation for the stickman to perform while he says this. Choose exactly one from this list based on the context: ['idle', 'dancing', 'yawning', 'waving', 'thinking', 'excited', 'stretching'].

Format: JSON {"message": "...", "animation": "waving"}`;

        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text();
            
            let jsonResult = {};
            try {
                const cleanText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
                jsonResult = JSON.parse(cleanText);
            } catch (e) {
                console.error("Failed to parse companion context:", e);
                jsonResult = { message: "¡Tú puedes!", animation: "idle" };
            }

            res.json(jsonResult);
        } catch (apiError) {
            console.error("Gemini API Error in Context (fallback):", apiError.message);
            res.json({ message: "¡Adelante, tú puedes!", animation: "excited" });
        }
    } catch (error) {
        console.error("Error in getCompanionContext:", error);
        res.status(500).json({ error: "Server error", details: error.message });
    }
};

const completeActivity = async (req, res) => {
    try {
        const { student_id, activity_id, average_score, time_spent } = req.body;
        
        // Log this attempt in StudentAttempt with null task_id to represent activity total, 
        // or just return success if we don't have a specific schema for activities yet.
        const attempt = await models.StudentAttempt.create({
            student_id: student_id || null,
            task_id: null, 
            sentence_index: -1, 
            transcribed_text: `Activity Completed (Time: ${time_spent}s)`,
            score: average_score,
            feedback_json: []
        });

        res.status(200).json({ success: true, attempt });
    } catch (error) {
        console.error("Error in completeActivity:", error);
        res.status(500).json({ error: "Failed to save activity completion" });
    }
};

const generateTasks = async (req, res) => {
    try {
        const { topic, taskCount = 3, sentenceCount = 3 } = req.body;
        if (!topic) return res.status(400).json({ error: "Topic is required" });

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest", generationConfig: { responseMimeType: "application/json" } });

        const prompt = `
Generate ${taskCount} English pronunciation exercises based on the topic: "${topic}".
Output as a valid JSON array of objects. Do not use markdown blocks, just raw JSON.
Each object should have:
- "title": A short title for the exercise (e.g. "Warm Up", "At the airport").
- "instruction": A short instruction in Spanish for the student.
- "expected_text": An array of EXACTLY ${sentenceCount} simple, common English sentences related to the topic.

Example of expected format:
[
  {
    "title": "Gym Warm Up",
    "instruction": "Lee las oraciones de calentamiento en voz alta",
    "expected_text": [
      "I always stretch before working out",
      "It is important to warm up your muscles",
      "I do ten minutes of cardio first"
    ]
  }
]
`;
        const result = await model.generateContent(prompt);
        let rawResponse = result.response.text().trim();
        if (rawResponse.startsWith("\`\`\`json")) {
            rawResponse = rawResponse.substring(7);
            if (rawResponse.endsWith("\`\`\`")) {
                rawResponse = rawResponse.slice(0, -3);
            }
        }
        
        const tasks = JSON.parse(rawResponse);
        res.json(tasks);
    } catch (error) {
        console.error("Error generating tasks:", error.message || error);
        
        // Fallback genérico en caso de que falle la API de Gemini por límites de cuota (429)
        const commonSentences = [
            "Hello, how are you today?",
            "I need to go to the supermarket.",
            "What time is it right now?",
            "Can you help me with this?",
            "I am learning to speak English.",
            "The weather is very nice today.",
            "I would like to order some food.",
            "Where is the nearest train station?",
            "It was nice meeting you.",
            "I will see you tomorrow."
        ];
        
        const fallbackTasks = Array.from({ length: req.body.taskCount || 3 }).map((_, index) => {
            // Pick random sentences from the common list
            const shuffled = commonSentences.sort(() => 0.5 - Math.random());
            const selectedSentences = shuffled.slice(0, req.body.sentenceCount || 3);
            
            return {
                title: `${req.body.topic || 'General Practice'} - Part ${index + 1}`,
                instruction: `Read the following sentences out loud.`,
                expected_text: selectedSentences
            };
        });
        
        // Si el error es de cuota, mandamos el fallback en vez de crashear
        if (error.status === 429 || error.message?.includes('429')) {
            console.log("Using fallback due to Gemini API rate limit.");
            return res.json(fallbackTasks);
        }

        res.status(500).json({ error: "Failed to generate tasks via AI", fallback: fallbackTasks });
    }
};

const cloneActivity = async (req, res) => {
    try {
        const { id } = req.params;
        const { target_date } = req.body;
        
        if (!target_date) return res.status(400).json({ error: "Target date is required" });

        // Find original
        const originalActivity = await PronunciationActivity.findByPk(id, {
            include: [{ model: PronunciationTask }]
        });

        if (!originalActivity) return res.status(404).json({ error: "Activity not found" });

        // Clone activity
        const clonedActivity = await PronunciationActivity.create({
            title: `${originalActivity.title} (Copia)`,
            description: originalActivity.description,
            assigned_date: target_date
        });

        // Clone tasks
        if (originalActivity.PronunciationTasks && originalActivity.PronunciationTasks.length > 0) {
            const newTasks = originalActivity.PronunciationTasks.map(task => ({
                activity_id: clonedActivity.id,
                title: task.title,
                instruction: task.instruction,
                expected_text: task.expected_text
            }));
            await PronunciationTask.bulkCreate(newTasks);
        }

        const completeClonedActivity = await PronunciationActivity.findByPk(clonedActivity.id, {
            include: [{ model: PronunciationTask }]
        });

        res.status(201).json(completeClonedActivity);
    } catch (error) {
        console.error("Error cloning activity:", error);
        res.status(500).json({ error: "Failed to clone activity" });
    }
};

module.exports = {
  createActivity,
  getActivities,
  createTask,
  getTasks,
  updateTask,
  deleteTask,
  evaluateAttempt,
  getLeaderboard,
  getCompanionContext,
  completeActivity,
  generateTasks,
  cloneActivity
};
