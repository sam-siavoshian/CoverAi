const tf = require('@tensorflow/tfjs-node');
const mic = require('mic');
const wav = require('wav');
const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');

// Define emergency sound classes that YAMNet can detect
// Based on AudioSet ontology: https://github.com/tensorflow/tfjs-models/tree/master/yamnet
const EMERGENCY_CLASSES = {
  'Alarm': [288, 289, 290, 291, 292, 293, 294], // Alarm, siren, fire/smoke alarm
  'Screaming': [29, 30, 31], // Human voice, shout, scream
  'Crying': [23, 24, 25], // Crying, sobbing, whimper
  'Gunshot': [427, 428, 429, 430], // Gunshot, gun, machine gun, fusillade
  'Glass': [440, 441, 442], // Glass breaking, shatter
  'Explosion': [431, 432, 433, 434, 435], // Explosion, boom, blast
  'Fire': [442, 443] // Fire crackling, flames
};

// Threshold for detection confidence
const DETECTION_THRESHOLD = 0.5;
// Frequency of checking audio (ms)
const DETECTION_INTERVAL = 1000;

class EmergencySoundDetector extends EventEmitter {
  constructor() {
    super();
    this.model = null;
    this.micInstance = null;
    this.running = false;
    this.detectionInterval = null;
    this.scores = [];
    this.classMap = [];
    
    // Buffer to hold audio samples
    this.audioBuffer = [];
    this.bufferSize = 1024;
    this.sampleRate = 16000; // YAMNet requires 16kHz audio
  }

  async loadModel() {
    try {
      console.log('Loading YAMNet model...');
      this.model = await tf.loadGraphModel(
        'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1',
        { fromTFHub: true }
      );
      console.log('YAMNet model loaded successfully');
      
      // Load class map from the local file
      await this.loadClassMap();
    } catch (error) {
      console.error('Error loading YAMNet model:', error);
      throw new Error('Failed to load YAMNet model');
    }
  }

  async loadClassMap() {
    try {
      const classMapPath = path.join(__dirname, '../data/yamnet_class_map.json');
      
      // Check if the class map file exists, create directory if not
      if (!fs.existsSync(path.dirname(classMapPath))) {
        fs.mkdirSync(path.dirname(classMapPath), { recursive: true });
      }
      
      // If file doesn't exist, create it with the class map
      if (!fs.existsSync(classMapPath)) {
        // Fetch class map from TensorFlow site or use built-in list
        // This is a simplified class map, in a real app you would fetch from TF Hub
        const builtInClassMap = Array(521).fill(0).map((_, i) => `Class_${i}`);
        fs.writeFileSync(classMapPath, JSON.stringify(builtInClassMap, null, 2));
        this.classMap = builtInClassMap;
      } else {
        // Read existing class map
        const classMapData = fs.readFileSync(classMapPath, 'utf8');
        this.classMap = JSON.parse(classMapData);
      }
      
      console.log(`Loaded ${this.classMap.length} audio classes`);
    } catch (error) {
      console.error('Error loading class map:', error);
      // Create a default class map
      this.classMap = Array(521).fill(0).map((_, i) => `Class_${i}`);
    }
  }

  async start() {
    if (this.running) {
      console.log('Emergency sound detector is already running');
      return;
    }

    // Load model if not already loaded
    if (!this.model) {
      await this.loadModel();
    }

    this.running = true;
    console.log('Starting emergency sound detection...');

    // Initialize microphone
    this.micInstance = mic({
      rate: String(this.sampleRate),
      channels: '1',
      debug: false,
      device: 'default',
      fileType: 'wav'
    });

    const micInputStream = this.micInstance.getAudioStream();
    const wavInstance = new wav.Reader();
    
    // Set up microphone data handling
    wavInstance.on('format', (format) => {
      console.log('Audio format:', format);
      wavInstance.on('data', (data) => this.processAudioChunk(data));
    });
    
    micInputStream.pipe(wavInstance);
    this.micInstance.start();
    
    // Set up periodic detection
    this.detectionInterval = setInterval(() => {
      this.detectEmergencySounds();
    }, DETECTION_INTERVAL);
    
    console.log('Emergency sound detection started');
  }

  processAudioChunk(chunk) {
    // Push audio data into buffer
    for (let i = 0; i < chunk.length / 2; i++) {
      // Convert 16-bit PCM to float in [-1, 1]
      const sample = chunk.readInt16LE(i * 2) / 32768.0;
      this.audioBuffer.push(sample);
    }
    
    // Keep only the latest samples needed for YAMNet
    if (this.audioBuffer.length > this.sampleRate) {
      this.audioBuffer = this.audioBuffer.slice(-this.sampleRate);
    }
  }

  async detectEmergencySounds() {
    if (!this.running || this.audioBuffer.length < this.sampleRate / 2) {
      return;
    }

    try {
      // Create tensor from audio buffer
      const audioTensor = tf.tensor1d(this.audioBuffer);
      
      // Reshape tensor for YAMNet input (batch_size=1, num_samples)
      const reshapedAudio = audioTensor.reshape([1, -1]);
      
      // Get YAMNet predictions
      const output = await this.model.predict(reshapedAudio);
      const scores = await output[0].array(); // Format: [batch_size, num_frames, num_classes]
      
      // Average the scores across frames for each class
      const avgScores = Array(scores[0][0].length).fill(0);
      for (let i = 0; i < scores[0].length; i++) {
        for (let j = 0; j < scores[0][i].length; j++) {
          avgScores[j] += scores[0][i][j] / scores[0].length;
        }
      }
      
      // Check for emergency sounds
      const detections = this.checkEmergencySounds(avgScores);
      
      // Clean up tensors
      tf.dispose([audioTensor, reshapedAudio, ...output]);
      
      // If emergency sounds detected, emit detection event
      if (detections.length > 0) {
        this.emit('detection', detections);
      }
    } catch (error) {
      console.error('Error during emergency sound detection:', error);
    }
  }

  checkEmergencySounds(scores) {
    const detections = [];
    
    // Check each emergency sound category
    for (const [category, classIndices] of Object.entries(EMERGENCY_CLASSES)) {
      // Find the maximum score among the class indices for this category
      const maxScore = Math.max(...classIndices.map(index => scores[index] || 0));
      
      if (maxScore >= DETECTION_THRESHOLD) {
        // Find the class with the highest score
        const maxIndex = classIndices.reduce((maxIdx, idx) => 
          (scores[idx] > scores[maxIdx] ? idx : maxIdx), classIndices[0]);
        
        detections.push({
          category,
          class: this.classMap[maxIndex] || `Class_${maxIndex}`,
          score: maxScore,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return detections;
  }

  stop() {
    if (!this.running) {
      console.log('Emergency sound detector is not running');
      return;
    }

    // Stop microphone
    if (this.micInstance) {
      this.micInstance.stop();
      this.micInstance = null;
    }

    // Clear detection interval
    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    // Reset state
    this.running = false;
    this.audioBuffer = [];
    console.log('Emergency sound detection stopped');
  }
}

module.exports = { EmergencySoundDetector }; 