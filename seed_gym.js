const { PronunciationActivity, PronunciationTask } = require('./models/index.js');

async function seedGym() {
    try {
        const today = new Date().toISOString().split('T')[0]; // Current date
        
        console.log(`Seeding for date: ${today}`);
        
        const activity = await PronunciationActivity.create({
            title: 'Gym Vocabulary & Routine',
            description: 'Aprende y practica vocabulario esencial para ir al gimnasio y hacer ejercicio.',
            assigned_date: today
        });
        
        await PronunciationTask.create({
            activity_id: activity.id,
            title: 'Warm Up',
            instruction: 'Lee las oraciones de calentamiento en voz alta',
            expected_text: [
                "I always stretch before working out",
                "It is important to warm up your muscles",
                "I do ten minutes of cardio first"
            ]
        });

        await PronunciationTask.create({
            activity_id: activity.id,
            title: 'Lifting Weights',
            instruction: 'Practica frases para levantar pesas',
            expected_text: [
                "How many sets do you have left?",
                "Can you spot me on the bench press?",
                "I am trying to build more muscle"
            ]
        });

        await PronunciationTask.create({
            activity_id: activity.id,
            title: 'Cardio & Cool Down',
            instruction: 'Frases para finalizar la rutina',
            expected_text: [
                "I like to run on the treadmill",
                "Make sure you drink plenty of water",
                "That was a great workout"
            ]
        });
        
        console.log("Successfully seeded gym activities!");
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}

seedGym();
