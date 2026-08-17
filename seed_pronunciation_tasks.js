import axios from 'axios';

const scenarios = [
  {
    id: '01',
    title: 'AT THE AIRPORT',
    emoji: '✈️',
    topics: ['check-in', 'passport control', 'delayed flights', 'asking for directions'],
    questions: [
      'Where are you travelling today?',
      'How many bags are you checking in?',
      'What would you do if your flight was delayed?'
    ]
  },
  {
    id: '02',
    title: 'AT THE HOTEL',
    emoji: '🏨',
    topics: ['checking in', 'requesting services', 'solving problems'],
    questions: [
      'Can I have a room with a view?',
      'The air conditioning isn’t working. What would you say?',
      'How would you ask for late check-out?'
    ]
  },
  {
    id: '03',
    title: 'IN A RESTAURANT',
    emoji: '🍝',
    topics: ['ordering food', 'making complaints', 'recommendations'],
    questions: [
      'What would you order?',
      'How would you complain politely?',
      'What’s your favorite restaurant food?'
    ]
  },
  {
    id: '04',
    title: 'SHOPPING',
    emoji: '🛍️',
    topics: ['asking for sizes', 'prices', 'returns'],
    questions: [
      'Can I try this on?',
      'What would you buy with $100?',
      'How would you ask for a refund?'
    ]
  },
  {
    id: '05',
    title: 'ASKING FOR DIRECTIONS',
    emoji: '🗺️',
    topics: ['transportation', 'maps', 'getting lost'],
    questions: [
      'How do I get to the train station?',
      'What would you do if you got lost abroad?',
      'Do you prefer travelling by subway or taxi?'
    ]
  },
  {
    id: '06',
    title: 'TAKING A TAXI / UBER',
    emoji: '🚕',
    topics: ['destinations', 'traffic', 'small talk'],
    questions: [
      'Where are you going today?',
      'Have you ever had a bad taxi experience?',
      'Do you usually use Uber?'
    ]
  },
  {
    id: '07',
    title: 'MAKING FRIENDS WHILE TRAVELLING',
    emoji: '🌎',
    topics: ['introductions', 'hobbies', 'culture'],
    questions: [
      'Tell me about yourself.',
      'What countries would you like to visit?',
      'What’s interesting about your culture?'
    ]
  },
  {
    id: '08',
    title: 'AT THE DOCTOR / PHARMACY',
    emoji: '💊',
    topics: ['symptoms', 'medicine', 'emergencies'],
    questions: [
      'What would you say if you had a headache?',
      'How would you ask for medicine?',
      'Have you ever visited a doctor abroad?'
    ]
  },
  {
    id: '09',
    title: 'AT THE TRAIN / BUS STATION',
    emoji: '🚉',
    topics: ['schedules', 'tickets', 'delays'],
    questions: [
      'What time does the train leave?',
      'One ticket or return?',
      'What transport do you prefer?'
    ]
  },
  {
    id: '10',
    title: 'TOURIST ATTRACTIONS',
    emoji: '📸',
    topics: ['museums', 'tours', 'sightseeing'],
    questions: [
      'What famous place would you love to visit?',
      'Do you enjoy guided tours?',
      'What’s the best city for tourists?'
    ]
  },
  {
    id: '11',
    title: 'AT THE BEACH / VACATION',
    emoji: '🏖️',
    topics: ['weather', 'relaxing', 'activities'],
    questions: [
      'What’s your ideal vacation?',
      'Do you prefer beaches or mountains?',
      'What activities do you enjoy on holiday?'
    ]
  },
  {
    id: '12',
    title: 'SOCIAL MEDIA & TRAVEL',
    emoji: '📱',
    topics: ['influencers', 'photos', 'travel content'],
    questions: [
      'Do you post your trips online?',
      'What makes a travel influencer popular?',
      'Is social media ruining travel experiences?'
    ]
  },
  {
    id: '13',
    title: 'EMERGENCIES ABROAD',
    emoji: '🚨',
    topics: ['losing documents', 'asking for help', 'safety'],
    questions: [
      'What would you do if you lost your passport?',
      'How would you ask for help in English?',
      'What are important travel safety tips?'
    ]
  },
  {
    id: '14',
    title: 'FOOD & CULTURE',
    emoji: '🍜',
    topics: ['traditional food', 'cultural differences', 'eating habits'],
    questions: [
      'What food represents your country?',
      'What strange foods would you try?',
      'Is food important in culture?'
    ]
  },
  {
    id: '15',
    title: 'DREAM TRIP',
    emoji: '✨',
    topics: ['bucket list', 'travel plans', 'future goals'],
    questions: [
      'What’s your dream destination?',
      'Who would you travel with?',
      'What would you do there?'
    ]
  }
];

async function seedTasks() {
  console.log("Starting to seed pronunciation tasks...");
  for (const scenario of scenarios) {
    const title = `${scenario.title} ${scenario.emoji}`;
    const instruction = `Topics: ${scenario.topics.join(', ')}. Read the following questions out loud to practice your pronunciation.`;
    const expected_text = scenario.questions; // Now sending an array

    try {
      const response = await axios.post('https://englishecommerce-back.onrender.com/api/pronunciation/tasks', {
        title,
        instruction,
        expected_text
      });
      console.log(`✅ Loaded task: ${title}`);
    } catch (error) {
      console.error(`❌ Failed to load task: ${title}`);
      if (error.response) {
        console.error(error.response.data);
      } else {
        console.error(error.message);
      }
    }
  }
  console.log("Seeding complete!");
}

seedTasks();
