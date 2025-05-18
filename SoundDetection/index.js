// index.js
const tf = require('@tensorflow/tfjs-node');
const fetch = require('node-fetch');
const Mic = require('mic');
const wav = require('wav');

// 1-second window, 16 kHz × 2 bytes/sample
const WINDOW_BYTES = 16000 * 2;
const CONFIDENCE_THRESHOLD = 0.3;

// Emergency labels exactly as in YAMNet class-map CSV
const TARGET_EVENTS = new Set([
  'Smoke detector, smoke alarm',
  'Siren',
  'Fire truck, fire engine',
  'Screaming',
  'Gunshot, gunfire',
  'Crying, sobbing',
  'Shouting'
]);

// TF-Hub URLs
const MODEL_URL =
  'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1/model.json?tfjs-format=compressed';
const CLASS_MAP_CSV_URL =
  'https://storage.googleapis.com/audioset/yamnet/yamnet_class_map.csv';

async function loadClassMap() {
  const res = await fetch(CLASS_MAP_CSV_URL);
  if (!res.ok) throw new Error(`Failed to fetch class map (${res.status})`);
  const text = await res.text();
  return text
    .trim()
    .split('\n')
    .slice(1)
    .map(line => {
      // CSV columns: index,mid,display_name
      const cols = line.split(',');
      return cols.slice(2).join(',');
    });
}

async function main() {
  console.log('⏳ Loading YAMNet model from TF Hub…');
  const model = await tf.loadGraphModel(MODEL_URL);
  console.log('✅ Model loaded.');

  console.log('⏳ Fetching class-map…');
  const classMap = await loadClassMap();
  console.log(`✅ Loaded ${classMap.length} YAMNet classes.`);

  // Setup microphone → WAV reader
  const mic = Mic({
    rate: '16000',
    channels: '1',
    bitwidth: '16',
    encoding: 'signed-integer',
    fileType: 'wav'
  });
  const micStream = mic.getAudioStream();
  const reader = new wav.Reader();
  micStream.pipe(reader);

  let bufferQueue = [];
  reader.on('data', chunk => {
    bufferQueue.push(chunk);
    const total = bufferQueue.reduce((sum, b) => sum + b.length, 0);
    if (total >= WINDOW_BYTES) {
      const buf = Buffer.concat(bufferQueue);
      bufferQueue = [];
      classify(buf, model, classMap);
    }
  });

  reader.on('error', e => console.error('WAV reader error:', e));
  micStream.on('error', e => console.error('Mic error:', e));

  mic.start();
  console.log('🎤 Listening for emergency sounds…');
}

async function classify(buffer, model, classMap) {
  // PCM16 → Float32 in [–1,1]
  const pcm16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.length / 2);
  const float32 = Float32Array.from(pcm16, v => v / 32768);
  const input = tf.tensor(float32).expandDims(0); // shape [1, samples]

  // Run YAMNet: returns a Tensor of shape [1, frames, 521]
  const scores = model.predict(input);
  // Average over frames and classes dims → shape [521]
  const meanScores = scores.mean([1, 2]);
  const confidences = await meanScores.array();

  const detections = [];
  confidences.forEach((c, i) => {
    const label = classMap[i];
    if (c >= CONFIDENCE_THRESHOLD && TARGET_EVENTS.has(label)) {
      detections.push({ label, confidence: c });
    }
  });

  if (detections.length) {
    console.log('🚨 Emergency sounds detected:');
    detections
      .sort((a, b) => b.confidence - a.confidence)
      .forEach(d => {
        console.log(` - ${d.label} ${(d.confidence * 100).toFixed(1)}%`);
      });
  }

  tf.dispose([input, scores, meanScores]);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
