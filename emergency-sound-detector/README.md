# Emergency Sound Detector

A real-time emergency sound detection system built with Node.js and TensorFlow.js using Google's YAMNet model. This application can detect various emergency sounds like fire alarms, screaming, crying, gunshots, glass breaking, and more.

## Features

- **Pre-trained Model**: Uses Google's YAMNet model for audio classification without requiring additional training
- **Real-time Detection**: Processes audio in real-time with low latency
- **Multiple Emergency Sounds**: Detects a variety of emergency situations including:
  - Alarms and sirens
  - Screaming and shouting
  - Crying and sobbing
  - Gunshots
  - Glass breaking
  - Explosions
  - Fire sounds
- **Web Interface**: Simple dashboard for monitoring detections
- **CLI Interface**: Command-line interface for headless usage
- **Adjustable Sensitivity**: Configure detection threshold to balance between false positives and missed detections

## Requirements

- Node.js 14.x or higher
- Microphone access
- Internet connection (for initial model download)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/emergency-sound-detector.git
   cd emergency-sound-detector
   ```

2. Install dependencies:
   ```
   npm install
   ```

## Usage

### Web Interface

1. Start the server:
   ```
   npm start
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

3. Use the web interface to start/stop detection and view alerts

### Command Line Interface

1. Run the CLI:
   ```
   node src/cli.js
   ```

2. Use the following commands:
   - `start` - Start emergency sound detection
   - `stop` - Stop detection
   - `status` - Check current status
   - `help` - Show help
   - `exit` - Exit the program

## API Endpoints

The system provides a simple REST API:

- `GET /api/start` - Start emergency sound detection
- `GET /api/stop` - Stop emergency sound detection 
- `GET /api/status` - Check current detection status

## How It Works

1. The application captures audio input from the device microphone
2. Audio is processed and fed into the YAMNet model in real-time
3. The model classifies the audio into one of 521 audio classes
4. Our system filters for emergency-related sounds
5. When an emergency sound is detected with confidence above the threshold, an alert is triggered

## Customization

You can adjust the detection threshold in `src/emergency-sound-detector.js` by modifying the `DETECTION_THRESHOLD` constant.

## Limitations

- Requires microphone access
- Background noise may cause false positives
- Detection accuracy depends on microphone quality and distance from sound source
- Initial model loading may take a few seconds

## License

MIT

## Acknowledgments

- [TensorFlow.js](https://www.tensorflow.org/js)
- [YAMNet Audio Event Classification Model](https://github.com/tensorflow/tfjs-models/tree/master/yamnet) 