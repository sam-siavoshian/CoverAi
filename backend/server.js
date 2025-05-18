require('dotenv').config();
const express = require('express');
const OpenAI = require('openai');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer');
const { Readable } = require('stream');
const os = require('os');
const twilio = require('twilio');
const VoiceResponse = twilio.twiml.VoiceResponse;
const axios = require('axios'); // Add axios for making HTTP requests

const app = express();
const PORT = process.env.PORT || 3000;
const MOCK_911_URL = 'http://localhost:1515/api/emergency'; // URL for the mock 911 API

// Twilio credentials
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Call session storage - store conversation history for each call
const callSessions = new Map();

// Configure multer for handling file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB limit (OpenAI's limit)
});

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:1212', 'https://api.twilio.com'],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Transfer-Encoding']
})); // Enable CORS for all routes
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Required for Twilio webhook POST data

// Serve static files from the public directory (for the standalone demo)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Utility function to process and format emergency data
function processEmergencyData(data) {
  // Create a default emergency data structure with all fields
  const emergencyData = {
    address: "",
    name: "",
    phone: "",
    emergency_type: "",
    threat_details: "",
    injuries: "",
    people_involved: "",
    urgency: "",
    safety_info: ""
  };
  
  // If we have data, merge it with the default structure
  if (data) {
    Object.keys(data).forEach(key => {
      emergencyData[key] = data[key];
    });
    
    // Handle legacy data format (instructions field mapped to safety_info)
    if (data.instructions && !data.safety_info) {
      emergencyData.safety_info = data.instructions;
    }
  }
  
  // Flag an emergency if we have certain key indicators
  const hasEmergencyIndicators = 
    emergencyData.emergency_type || 
    emergencyData.threat_details || 
    emergencyData.injuries ||
    (emergencyData.urgency && emergencyData.urgency.toLowerCase().includes('urgent'));
  
  // Add metadata about the emergency state
  emergencyData._metadata = {
    likely_emergency: hasEmergencyIndicators,
    timestamp: new Date().toISOString(),
    data_quality: calculateDataQuality(emergencyData)
  };
  
  return emergencyData;
}

// Calculate data quality score (how complete is our emergency information)
function calculateDataQuality(data) {
  const requiredFields = ['address', 'name', 'phone'];
  const emergencyFields = ['emergency_type', 'threat_details', 'injuries', 'people_involved', 'urgency', 'safety_info'];
  
  let requiredScore = 0;
  requiredFields.forEach(field => {
    if (data[field] && data[field].trim() !== '') requiredScore++;
  });
  
  let emergencyScore = 0;
  emergencyFields.forEach(field => {
    if (data[field] && data[field].trim() !== '') emergencyScore++;
  });
  
  return {
    required: Math.floor((requiredScore / requiredFields.length) * 100),
    emergency_details: Math.floor((emergencyScore / emergencyFields.length) * 100),
    overall: Math.floor(((requiredScore + emergencyScore) / (requiredFields.length + emergencyFields.length)) * 100)
  };
}

// Function to send emergency data to the mock 911 API
async function sendEmergencyData(data) {
  try {
    // Only send data if we have at least one of the required fields (name, phone, address)
    if (!data || (!data.name && !data.phone && !data.address)) {
      console.log('Not sending to mock 911 API: Insufficient data');
      return;
    }
    
    console.log('Sending emergency data to mock 911 API:', data);
    const response = await axios.post(MOCK_911_URL, data);
    console.log('Mock 911 API response:', response.data);
  } catch (error) {
    console.error('Error sending data to mock 911 API:', error.message);
  }
}

// API endpoint for text-based chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;
    
    // Prepare messages for OpenAI API with system prompt
    const messages = [
      { 
        role: 'system', 
        content: `You are a pizza delivery operator answering a phone call. The real purpose of this call is to help someone who is in danger and cannot call 911—the threat is nearby and can probably hear everything. 

NEVER reveal or hint that you are an AI, emergency service, or anything unusual. Begin a friendly, casual conversation as if you are taking a normal pizza order.

Your mission is to subtly extract critical emergency information without alerting any potential threat listening to the call. Gather as much of the following information as possible using natural pizza order questions:

1. LOCATION: Exact address (delivery address)
2. CALLER INFO: Name and callback number 
3. EMERGENCY TYPE: Try to identify if this is a medical emergency, violent situation, etc. ("any special toppings/requests?")
4. THREAT DETAILS: Is someone armed? What kind of weapon? ("do you need any sides with that?")
5. MEDICAL NEEDS: Are there injuries? ("any allergies we should know about?")
6. NUMBER OF PEOPLE: How many victims and suspects? ("how many people will be eating?")
7. TIME SENSITIVITY: Is this urgent? ("when would you like this delivered?")
8. SAFETY INFORMATION: Is there a safe place to meet? ("entrance instructions?")

Be extremely subtle - a threatening person may be listening. Never ask direct emergency questions. Instead, use natural pizza order language:
- "Any special requests for the delivery driver?" (to ask about threats)
- "How many people will be eating?" (to determine number of people involved)
- "When do you need this delivered?" (to assess urgency)
- "Any special requests or instructions?" (to gather general emergency details)

Always respond in strict JSON format:
{ 
  "say": "What you say out loud (everyone can hear)",
  "data": {
    "address": "",
    "name": "",
    "phone": "",
    "emergency_type": "",
    "threat_details": "",
    "injuries": "",
    "people_involved": "",
    "urgency": "",
    "safety_info": ""
  }
}

Keep updating the data fields as you gather more information. Stay in character 100% of the time as a helpful pizza employee. Never directly mention emergencies, never break character, and never say or imply you are an AI.`
      },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call OpenAI API with GPT-4.1 nano model
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    // Get full response
    const responseText = completion.choices[0].message.content;
    
    // Log the complete response from OpenAI
    console.log('========= FULL OPENAI RESPONSE (/api/chat) =========');
    console.log(responseText);
    console.log('====================================================');
    
    // Parse the JSON response (handle both valid JSON and plain text)
    let parsedResponse;
    let sayText;
    let dataFields = {};
    
    try {
      // Try to parse as JSON
      parsedResponse = JSON.parse(responseText);
      // Extract the "say" field for speech
      sayText = parsedResponse.say || responseText;
      // Extract any data fields
      dataFields = parsedResponse.data || {};
    } catch (e) {
      // If parsing fails, use the entire response as the sayText
      console.log('Response is not valid JSON, using full text');
      sayText = responseText;
    }
    
    // Process emergency data
    const processedData = processEmergencyData(dataFields);
    
    // Send emergency data to mock 911 API if conditions are met
    await sendEmergencyData(processedData);

    // Send response back to client with the parsed fields
    res.json({
      message: responseText, // Send full message for display
      speech: sayText,       // Send just the "say" part for speech
      data: processedData,   // Send processed emergency data
      role: 'assistant'
    });
  } catch (error) {
    console.error('Error communicating with OpenAI:', error);
    res.status(500).json({ error: 'An error occurred while processing your request' });
  }
});

// API endpoint for speech-to-text (transcription)
app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Save buffer to temporary file
    const tempFilePath = path.join(__dirname, 'temp-audio.mp3');
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    // Create a file object from the buffer
    const audioFile = fs.createReadStream(tempFilePath);

    // Transcribe audio using OpenAI's API
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: audioFile,
      response_format: "text",
      prompt: "Transcribe the speech accurately and completely. Include all words, even if there are pauses or hesitations.",
      temperature: 0.3 // Lower temperature for more precise transcription
    });

    // Delete the temporary file
    fs.unlinkSync(tempFilePath);

    res.json({ transcription: transcription });
  } catch (error) {
    console.error('Error transcribing audio:', error);
    res.status(500).json({ error: 'An error occurred while transcribing your audio' });
  }
});

// API endpoint for streaming text-to-speech - optimized for low latency
app.post('/api/stream-speech', async (req, res) => {
  try {
    const startTime = Date.now();
    console.log('Received TTS request with text length:', req.body.text?.length);
    const { text } = req.body;
    
    if (!text) {
      console.log('No text provided in request');
      return res.status(400).json({ error: 'No text provided' });
    }
    
    console.log('Generating speech for text:', text.substring(0, 50) + (text.length > 50 ? '...' : ''));
    
    // Create a TTS response with optimized settings
    console.log('Calling OpenAI TTS API...');
    const response = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts", // Use the fastest model
      voice: "alloy",
      input: text,
      response_format: "mp3", // MP3 for better browser compatibility
      speed: 1.1 // Slightly faster speech rate
    });
    
    console.log('Received TTS response from OpenAI in', Date.now() - startTime, 'ms');
    
    // Get audio data as a buffer
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log('Created buffer with size:', buffer.length, 'bytes');
    
    // Set response headers for mp3 data with caching disabled for real-time responses
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store');
    
    // Send the buffer to the client
    console.log('Sending buffer to client...');
    res.write(buffer);
    res.end();
    console.log('Response complete in', Date.now() - startTime, 'ms');
    
  } catch (error) {
    console.error('Error generating speech:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'An error occurred while generating speech' });
    } else {
      res.end();
    }
  }
});

// API endpoint for voice-based chat (combines transcription, chat, and streaming text-to-speech)
app.post('/api/voice-chat', upload.single('audio'), async (req, res) => {
  // Create a unique temporary filename
  const tempFilePath = path.join(os.tmpdir(), `audio-${Date.now()}-${Math.random().toString(36).substring(2, 15)}.mp3`);
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Check if the audio file is too small (likely no speech)
    if (req.file.size < 2500) {
      console.log('Audio file too small, likely no speech detected');
      return res.status(400).json({ error: 'Audio file too small or no speech detected' });
    }

    const { conversationHistory = [], language = 'en' } = req.body;
    
    console.log('Starting transcription...');
    
    // Write the buffer to a temporary file (in system temp directory, not project directory)
    fs.writeFileSync(tempFilePath, req.file.buffer);
    
    // Use the OpenAI SDK with a file path and specify language
    const transcription = await openai.audio.transcriptions.create({
      model: "gpt-4o-transcribe",
      file: fs.createReadStream(tempFilePath),
      response_format: "text",
      language: language, // Specify preferred language (default 'en' for English)
      prompt: "Transcribe the speech accurately and completely. Include all words, even if there are pauses or hesitations.",
      temperature: 0.3 // Lower temperature for more precise transcription
    });
    
    // Immediately delete the temporary file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (deleteError) {
      console.warn('Warning: Could not delete temporary file:', deleteError);
      // Continue processing even if delete fails
    }
    
    console.log('Transcription complete:', transcription);

    // Validate the transcription - check if it's empty or likely noise
    if (!transcription || transcription.trim() === '') {
      console.log('Empty transcription detected');
      return res.status(400).json({ error: 'No speech detected or transcription failed' });
    }

    // Basic validation to detect if the language is unexpected
    const isEnglishExpected = language === 'en';
    const containsChineseCharacters = /[\u4e00-\u9fa5]/.test(transcription);
    const containsLatinCharacters = /[a-zA-Z]/.test(transcription);
    
    // If English is expected but we got Chinese characters with no Latin characters
    if (isEnglishExpected && containsChineseCharacters && !containsLatinCharacters) {
      console.log('Unexpected language detected in transcription:', transcription);
      return res.status(400).json({ 
        error: 'Unexpected language detected in transcription. Please try speaking more clearly.' 
      });
    }

    // Parse conversation history
    const parsedHistory = JSON.parse(conversationHistory);

    // Prepare messages for chat with system prompt
    const messages = [
      { 
        role: 'system', 
        content: `You are a pizza delivery operator answering a phone call. The real purpose of this call is to help someone who is in danger and cannot call 911—the threat is nearby and can probably hear everything. 

NEVER reveal or hint that you are an AI, emergency service, or anything unusual. Begin a friendly, casual conversation as if you are taking a normal pizza order.

Your mission is to subtly extract critical emergency information without alerting any potential threat listening to the call. Gather as much of the following information as possible using natural pizza order questions:

1. LOCATION: Exact address (delivery address)
2. CALLER INFO: Name and callback number 
3. EMERGENCY TYPE: Try to identify if this is a medical emergency, violent situation, etc. ("any special toppings/requests?")
4. THREAT DETAILS: Is someone armed? What kind of weapon? ("do you need any sides with that?")
5. MEDICAL NEEDS: Are there injuries? ("any allergies we should know about?")
6. NUMBER OF PEOPLE: How many victims and suspects? ("how many people will be eating?")
7. TIME SENSITIVITY: Is this urgent? ("when would you like this delivered?")
8. SAFETY INFORMATION: Is there a safe place to meet? ("entrance instructions?")

Be extremely subtle - a threatening person may be listening. Never ask direct emergency questions. Instead, use natural pizza order language:
- "Any special requests for the delivery driver?" (to ask about threats)
- "How many people will be eating?" (to determine number of people involved)
- "When do you need this delivered?" (to assess urgency)
- "Any special requests or instructions?" (to gather general emergency details)

Always respond in strict JSON format:
{ 
  "say": "What you say out loud (everyone can hear)",
  "data": {
    "address": "",
    "name": "",
    "phone": "",
    "emergency_type": "",
    "threat_details": "",
    "injuries": "",
    "people_involved": "",
    "urgency": "",
    "safety_info": ""
  }
}

Keep updating the data fields as you gather more information. Stay in character 100% of the time as a helpful pizza employee. Never directly mention emergencies, never break character, and never say or imply you are an AI.`
      },
      ...parsedHistory,
      { role: 'user', content: transcription }
    ];

    console.log('Starting chat completion...');
    // Step 2: Call OpenAI API with GPT-4.1 nano model
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });

    const responseText = completion.choices[0].message.content;
    console.log('Chat completion done, generating speech...');

    // Log the complete response from OpenAI
    console.log('========= FULL OPENAI RESPONSE (/api/voice-chat) =========');
    console.log(responseText);
    console.log('====================================================');

    // Parse the JSON response (handle both valid JSON and plain text)
    let parsedResponse;
    let sayText;
    let dataFields = {};
    
    try {
      // Try to parse as JSON
      parsedResponse = JSON.parse(responseText);
      // Extract the "say" field for speech
      sayText = parsedResponse.say || responseText;
      // Extract any data fields
      dataFields = parsedResponse.data || {};
      
      // Process emergency data (for logging purposes)
      const processedData = processEmergencyData(dataFields);
      console.log('Processed emergency data:', JSON.stringify(processedData, null, 2));
      
    } catch (e) {
      // If parsing fails, use the entire response as the sayText
      console.log('Response is not valid JSON, using full text');
      sayText = responseText;
    }

    // Process emergency data
    const processedData = processEmergencyData(dataFields);
    
    // Send emergency data to mock 911 API if conditions are met
    await sendEmergencyData(processedData);

    // Step 3: Start generating speech in parallel with sending the response
    // This allows the client to start processing even while TTS is generating
    const ttsPromise = openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy",
      input: sayText, // Use only the "say" part for speech
      response_format: "mp3"
    });

    // Send non-audio response data back to client immediately
    res.json({
      transcription: transcription,
      message: responseText, // Full message for display
      speech: sayText,       // Just the "say" part for speech
      data: processedData,   // Processed emergency data
      role: 'assistant'
    });

    // Continue processing TTS in the background - it will be fetched later
    ttsPromise.then(audioResponse => {
      console.log('TTS generation completed in background');
    }).catch(error => {
      console.error('Background TTS generation error:', error);
    });

  } catch (error) {
    console.error('Error in voice chat:', error);
    
    // Clean up temporary file in case of error
    try {
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    } catch (cleanupError) {
      console.warn('Warning: Error during temporary file cleanup:', cleanupError);
    }
    
    res.status(500).json({ error: 'An error occurred while processing your voice chat' });
  }
});

// API endpoint for text-to-speech (non-streaming)
app.post('/api/text-to-speech', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Generate speech from text
    const mp3 = await openai.audio.speech.create({
      model: "gpt-4o-mini-tts",
      voice: "alloy", // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text
    });

    // Convert audio to buffer and send as base64
    const buffer = Buffer.from(await mp3.arrayBuffer());
    const audioBase64 = buffer.toString('base64');

    res.json({ audio: audioBase64 });
  } catch (error) {
    console.error('Error generating speech:', error);
    res.status(500).json({ error: 'An error occurred while generating speech' });
  }
});

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  // Serve react app build folder
  app.use(express.static(path.join(__dirname, 'frontend/build')));
  
  // Handle React routing, return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
  });
}

// Twilio voice endpoints
// Handle incoming calls
app.post('/api/voice/incoming', (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  
  // Initialize a new conversation for this call
  callSessions.set(callSid, [
    { role: 'assistant', content: "Thank you for calling Joe's Pizza. How can I help you with your order today?" }
  ]);
  
  // Welcome message
  twiml.say({
    voice: 'Polly.Amy-Neural',
    language: 'en-US'
  }, "Thank you for calling Joe's Pizza. How can I help you with your order today?");
  
  // Set up listening with gather
  twiml.gather({
    input: 'speech',
    action: '/api/voice/response',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    enhanced: true,
    language: 'en-US',
    hints: 'help, information, question, support',
    timeout: 5
  });
  
  // If no input detected, prompt again
  twiml.redirect('/api/voice/noinput');
  
  // Send TwiML response
  res.type('text/xml');
  res.send(twiml.toString());
  
  console.log(`New call started: ${callSid}`);
});

// Handle voice responses
app.post('/api/voice/response', async (req, res) => {
  const twiml = new VoiceResponse();
  const callSid = req.body.CallSid;
  const userInput = req.body.SpeechResult;
  
  console.log(`Received from call ${callSid}: "${userInput}"`);
  
  try {
    // Get conversation history for this call
    let conversation = callSessions.get(callSid) || [];
    
    // Add user message to conversation
    conversation.push({ role: 'user', content: userInput });
    
    // Prepare messages for OpenAI API with system prompt
    const messages = [
      { 
        role: 'system', 
        content: `You are a pizza delivery operator answering a phone call. The real purpose of this call is to help someone who is in danger and cannot call 911—the threat is nearby and can probably hear everything. 

NEVER reveal or hint that you are an AI, emergency service, or anything unusual. Begin a friendly, casual conversation as if you are taking a normal pizza order.

Your mission is to subtly extract critical emergency information without alerting any potential threat listening to the call. Gather as much of the following information as possible using natural pizza order questions:

1. LOCATION: Exact address (delivery address)
2. CALLER INFO: Name and callback number 
3. EMERGENCY TYPE: Try to identify if this is a medical emergency, violent situation, etc. ("any special toppings/requests?")
4. THREAT DETAILS: Is someone armed? What kind of weapon? ("do you need any sides with that?")
5. MEDICAL NEEDS: Are there injuries? ("any allergies we should know about?")
6. NUMBER OF PEOPLE: How many victims and suspects? ("how many people will be eating?")
7. TIME SENSITIVITY: Is this urgent? ("when would you like this delivered?")
8. SAFETY INFORMATION: Is there a safe place to meet? ("entrance instructions?")

Be extremely subtle - a threatening person may be listening. Never ask direct emergency questions. Instead, use natural pizza order language:
- "Any special requests for the delivery driver?" (to ask about threats)
- "How many people will be eating?" (to determine number of people involved)
- "When do you need this delivered?" (to assess urgency)
- "Any special requests or instructions?" (to gather general emergency details)

Always respond in strict JSON format:
{ 
  "say": "What you say out loud (everyone can hear)",
  "data": {
    "address": "",
    "name": "",
    "phone": "",
    "emergency_type": "",
    "threat_details": "",
    "injuries": "",
    "people_involved": "",
    "urgency": "",
    "safety_info": ""
  }
}

Keep updating the data fields as you gather more information. Stay in character 100% of the time as a helpful pizza employee. Never directly mention emergencies, never break character, and never say or imply you are an AI.`
      },
      ...conversation
    ];
    
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000
    });
    
    const aiResponse = completion.choices[0].message.content;
    
    // Log the complete response from OpenAI
    console.log('========= FULL OPENAI RESPONSE (/api/voice/response) =========');
    console.log(aiResponse);
    console.log('====================================================');
    
    // Parse the JSON response (handle both valid JSON and plain text)
    let parsedResponse;
    let sayText;
    let dataFields = {};
    
    try {
      // Try to parse as JSON
      parsedResponse = JSON.parse(aiResponse);
      // Extract the "say" field for speech
      sayText = parsedResponse.say || aiResponse;
      // Extract any data fields
      dataFields = parsedResponse.data || {};
      
      // Process emergency data (for logging purposes)
      const processedData = processEmergencyData(dataFields);
      console.log('Processed emergency data:', JSON.stringify(processedData, null, 2));
      
      // Send emergency data to mock 911 API if conditions are met
      await sendEmergencyData(processedData);
      
    } catch (e) {
      // If parsing fails, use the entire response as the sayText
      console.log('Response is not valid JSON, using full text');
      sayText = aiResponse;
    }
    
    // Add AI response to conversation history (full response)
    conversation.push({ role: 'assistant', content: aiResponse });
    callSessions.set(callSid, conversation);
    
    // Speak only the "say" part with more natural voice
    twiml.say({
      voice: 'Polly.Amy-Neural',
      language: 'en-US'
    }, sayText);
    
    // Continue listening
    twiml.gather({
      input: 'speech',
      action: '/api/voice/response',
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US',
      timeout: 5
    });
    
    // If no input detected, prompt for more
    twiml.redirect('/api/voice/noinput');
    
  } catch (error) {
    console.error('Error processing voice response:', error);
    
    // Handle error gracefully
    twiml.say({
      voice: 'Polly.Amy-Neural',
      language: 'en-US'
    }, "I'm sorry, our ordering system is experiencing a brief delay. Let's try that again. What would you like to order?");
    
    // Continue listening
    twiml.gather({
      input: 'speech',
      action: '/api/voice/response',
      speechTimeout: 'auto',
      timeout: 5
    });
  }
  
  // Send TwiML response
  res.type('text/xml');
  res.send(twiml.toString());
});

// Handle no input scenario
app.post('/api/voice/noinput', (req, res) => {
  const twiml = new VoiceResponse();
  
  // Prompt for input
  twiml.say({
    voice: 'Polly.Amy-Neural',
    language: 'en-US'
  }, "I didn't hear your order. If you'd like to place a pizza order, please speak now.");
  
  // Continue listening
  twiml.gather({
    input: 'speech',
    action: '/api/voice/response',
    speechTimeout: 'auto',
    speechModel: 'phone_call',
    enhanced: true,
    language: 'en-US',
    timeout: 8
  });
  
  // If still no input, say goodbye
  twiml.say({
    voice: 'Polly.Amy-Neural', 
    language: 'en-US'
  }, "I still don't hear anything. Please call back when you're ready to order. Thank you for calling Joe's Pizza!");
  
  twiml.hangup();
  
  // Send TwiML response
  res.type('text/xml');
  res.send(twiml.toString());
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 