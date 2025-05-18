document.addEventListener('DOMContentLoaded', () => {
    const conversationLog = document.getElementById('conversation-log');
    const voiceStatus = document.getElementById('voice-status');
    const voiceIndicator = document.getElementById('voice-indicator');
    const waveContainer = voiceIndicator.querySelector('.wave-container');
    
    let conversationHistory = [];
    let isListening = false;
    let isProcessing = false;
    let recorder;
    let silenceTimer = null;
    let silenceTimeout = 1000; // Increased from 500ms to 1000ms for better speech completion
    let audioLevel = 0;
    let listeningTimeout = null;
    let maxListeningTime = 15000; // Increased from 8000ms to 15000ms for longer recordings
    let audioContext;
    let audioQueue = [];
    let isPlayingAudio = false;
    let isSpeaking = false;
    let silenceCount = 0;
    let speechThreshold = 12; // Slightly reduced from 15 to increase sensitivity
    let lastAudioBlob = null; // Cache the last audio response
    let lastResponseText = null; // Cache the last response text
    let earlyProcessingTimer = null; // Timer for early processing of longer speech
    let speechStartTime = null; // Track when speech starts
    let earlyProcessingThreshold = 5000; // Increased from 3000ms to 5000ms
    let preferredLanguage = 'en'; // Default language is English
    let consecutiveErrors = 0; // Track consecutive errors for better error handling
    let minSpeechDuration = 300; // Minimum speech duration in ms to consider it valid
    
    // Initialize audio context for playback
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContext();
    } catch (e) {
        console.error('Web Audio API is not supported in this browser');
    }

    // API endpoints
    const API_VOICE_URL = '/api/voice-chat';
    const API_STREAM_SPEECH_URL = '/api/stream-speech';

    // Initialize recorder
    const initRecorder = () => {
        if (recorder) return;
        
        // Check if MicRecorder is loaded
        if (typeof MicRecorder === 'undefined') {
            console.error('MicRecorder is not loaded');
            return;
        }
        
        // Create recorder instance
        recorder = new MicRecorder({
            bitRate: 128,
            format: 'mp3'
        });
    };

    // Initialize recorder when the page loads
    initRecorder();

    // Add initial assistant message to conversation history
    conversationHistory.push({
        role: 'assistant',
        content: "Thank you for calling Joe's Pizza. How can I help you with your order today?"
    });

    // Function to add a message to the conversation log
    function addMessageToLog(content, role, data = null) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', role);
        
        const messageContent = document.createElement('div');
        messageContent.classList.add('message-content');
        
        // For assistant messages that might contain JSON, try to parse and display structured
        if (role === 'assistant') {
            let jsonData = null;
            try {
                // Try to parse content as JSON
                jsonData = JSON.parse(content);
                
                // If successful, display in a structured way
                if (jsonData) {
                    messageContent.textContent = content;
                    
                    // Add a section to display parsed data
                    const dataDisplay = document.createElement('div');
                    dataDisplay.classList.add('json-data');
                    dataDisplay.innerHTML = `
                        <h4>Parsed JSON:</h4>
                        <pre>${JSON.stringify(jsonData, null, 2)}</pre>
                    `;
                    messageDiv.appendChild(dataDisplay);
                }
            } catch (e) {
                // Not JSON, display as is
                messageContent.textContent = content;
            }
        } else {
            messageContent.textContent = content;
        }
        
        // If we have specific data to display (from server response)
        if (data) {
            const dataDisplay = document.createElement('div');
            dataDisplay.classList.add('json-data');
            dataDisplay.innerHTML = `
                <h4>Collected Emergency Data:</h4>
                <pre>${JSON.stringify(data, null, 2)}</pre>
                <div class="emergency-info">
                    <div class="info-section ${data.emergency_type ? 'has-data' : ''}">
                        <span class="label">Emergency Type:</span> 
                        <span class="value">${data.emergency_type || 'Not yet identified'}</span>
                    </div>
                    <div class="info-section ${data.threat_details ? 'has-data' : ''}">
                        <span class="label">Threat Details:</span> 
                        <span class="value">${data.threat_details || 'Unknown'}</span>
                    </div>
                    <div class="info-section ${data.injuries ? 'has-data' : ''}">
                        <span class="label">Injuries:</span> 
                        <span class="value">${data.injuries || 'Unknown'}</span>
                    </div>
                    <div class="info-section ${data.people_involved ? 'has-data' : ''}">
                        <span class="label">People Involved:</span> 
                        <span class="value">${data.people_involved || 'Unknown'}</span>
                    </div>
                    <div class="info-section ${data.urgency ? 'has-data' : ''}">
                        <span class="label">Urgency:</span> 
                        <span class="value">${data.urgency || 'Unknown'}</span>
                    </div>
                    <div class="info-section ${data.safety_info ? 'has-data' : ''}">
                        <span class="label">Safety Information:</span> 
                        <span class="value">${data.safety_info || 'None provided'}</span>
                    </div>
                </div>
            `;
            messageDiv.appendChild(dataDisplay);
        }
        
        messageDiv.appendChild(messageContent);
        conversationLog.appendChild(messageDiv);
        
        // Scroll to the bottom of the conversation
        conversationLog.scrollTop = conversationLog.scrollHeight;
        
        // Add to conversation history
        conversationHistory.push({ role, content });
    }

    // Function to play streamed audio from text
    async function playStreamedAudio(text) {
        // If this is the same text as last time, use cached audio when available
        if (text === lastResponseText && lastAudioBlob) {
            console.log('Using cached audio response');
            return playAudioBlob(lastAudioBlob);
        }

        updateVoiceStatus('AI is responding...');
        
        try {
            const startTime = performance.now();
            console.log('Starting audio playback for text:', text);
            
            // Fetch audio data
            console.log('Fetching audio from:', API_STREAM_SPEECH_URL);
            const response = await fetch(API_STREAM_SPEECH_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Audio response error:', response.status, errorText);
                throw new Error(`Network response was not ok: ${response.status} ${errorText}`);
            }
            
            console.log('Audio response received, status:', response.status);
            console.log('Content-Type:', response.headers.get('Content-Type'));
            
            // Get the audio data as an array buffer
            const arrayBuffer = await response.arrayBuffer();
            console.log('Received audio buffer of size:', arrayBuffer.byteLength, 'bytes in', 
                         (performance.now() - startTime).toFixed(2), 'ms');
            
            if (arrayBuffer.byteLength === 0) {
                throw new Error('Received empty audio buffer');
            }
            
            // Cache the response
            const blob = new Blob([arrayBuffer], { type: 'audio/mpeg' });
            lastAudioBlob = blob;
            lastResponseText = text;
            
            // Play the audio
            return await playAudioBlob(blob);
            
        } catch (error) {
            console.error('Error playing audio:', error);
            isPlayingAudio = false;
            updateVoiceStatus('Error playing audio. Listening...');
            return false;
        }
    }
    
    // Helper function to play an audio blob
    async function playAudioBlob(blob) {
        const audioUrl = URL.createObjectURL(blob);
        
        // Create an audio element to play the MP3
        const audioElement = new Audio(audioUrl);
        
        // Preload the audio
        audioElement.preload = 'auto';

        // Set up event handlers
        audioElement.onplay = () => {
            console.log('Audio playback started');
            isPlayingAudio = true;
        };
        
        audioElement.onended = () => {
            console.log('Audio playback ended');
            isPlayingAudio = false;
            URL.revokeObjectURL(audioUrl); // Clean up the blob URL
            updateVoiceStatus('Listening...');
        };
        
        audioElement.onerror = (e) => {
            console.error('Audio playback error:', e);
            isPlayingAudio = false;
            URL.revokeObjectURL(audioUrl);
            updateVoiceStatus('Error playing audio. Listening...');
        };
        
        // Try to speed up playback start by preloading
        try {
            await new Promise((resolve, reject) => {
                audioElement.oncanplaythrough = resolve;
                audioElement.onerror = reject;
                // Set a timeout in case oncanplaythrough never fires
                setTimeout(resolve, 300);
            });
        } catch (e) {
            console.log('Preload waiting timed out, trying to play anyway');
        }
        
        // Start playback
        console.log('Starting audio playback');
        isPlayingAudio = true;
        await audioElement.play();
        
        // Wait for the audio to finish playing
        await new Promise((resolve) => {
            audioElement.addEventListener('ended', resolve);
        });
        
        return true;
    }

    // PCM Player class for efficient audio streaming
    class PCMPlayer {
        constructor(option) {
            this.init(option);
        }
        
        init(option) {
            const defaultOption = {
                inputCodec: 'Int16',
                channels: 1,
                sampleRate: 24000,
                flushingTime: 100
            };
            
            this.option = Object.assign({}, defaultOption, option);
            this.samples = new Float32Array();
            this.flushingTime = this.option.flushingTime;
            this.firstPlay = true;
            this.isPlaying = false;
            
            // Make sure we have a valid audio context
            if (!audioContext || audioContext.state === 'closed') {
                try {
                    window.AudioContext = window.AudioContext || window.webkitAudioContext;
                    audioContext = new AudioContext();
                    console.log('PCMPlayer: Created new AudioContext');
                } catch (e) {
                    console.error('PCMPlayer: Failed to create AudioContext', e);
                }
            } else {
                console.log(`PCMPlayer: Using existing AudioContext, state: ${audioContext.state}`);
            }
            
            // Use the global audio context
            this.audioCtx = audioContext;
            
            // Resume the audio context if it's suspended
            if (this.audioCtx.state === 'suspended') {
                this.audioCtx.resume().then(() => {
                    console.log('PCMPlayer: AudioContext resumed');
                }).catch(err => {
                    console.error('PCMPlayer: Failed to resume AudioContext', err);
                });
            }
            
            this.gainNode = this.audioCtx.createGain();
            this.gainNode.gain.value = 1;
            this.gainNode.connect(this.audioCtx.destination);
            this.startTime = this.audioCtx.currentTime;
            
            console.log(`PCMPlayer: Initialized with sampleRate=${this.option.sampleRate}, channels=${this.option.channels}, currentTime=${this.startTime}`);
            
            // Clear any existing interval
            if (this.interval) {
                clearInterval(this.interval);
            }
            
            // Set up periodic flushing
            this.interval = setInterval(() => {
                this.flush();
            }, this.flushingTime);
        }
        
        feed(data) {
            if (!this.isPlaying) {
                this.isPlaying = true;
            }
            
            // Ensure data is an ArrayBuffer or Uint8Array
            const buffer = data instanceof Uint8Array ? data.buffer : data;
            
            // Calculate the number of samples in the buffer
            const numSamples = Math.floor(buffer.byteLength / 2); // 16-bit = 2 bytes per sample
            console.log(`PCMPlayer: Processing ${numSamples} samples from ${buffer.byteLength} bytes`);
            
            // Create a new Float32Array to hold the audio samples
            const tmp = new Float32Array(this.samples.length + numSamples);
            tmp.set(this.samples, 0);
            
            // Convert data to Float32Array based on inputCodec
            if (this.option.inputCodec === 'Int16') {
                const dataView = new DataView(buffer);
                const float32 = new Float32Array(numSamples);
                
                // Debug the first few samples
                if (numSamples > 0) {
                    const debugSamples = Math.min(5, numSamples);
                    console.log('First few Int16 samples:');
                    for (let i = 0; i < debugSamples; i++) {
                        const int16 = dataView.getInt16(i * 2, true); // true for little-endian
                        console.log(`Sample ${i}: ${int16} (${int16 / 32768})`);
                    }
                }
                
                for (let i = 0; i < numSamples; i++) {
                    // Get 16-bit PCM value (little-endian)
                    const int16 = dataView.getInt16(i * 2, true);
                    // Convert to float in range [-1.0, 1.0]
                    float32[i] = int16 / 32768;
                }
                
                tmp.set(float32, this.samples.length);
            } else {
                // Add other codec support if needed
                console.warn('Using non-Int16 codec, this may not work correctly');
                tmp.set(new Float32Array(buffer), this.samples.length);
            }
            
            this.samples = tmp;
            
            // Force a flush of audio data immediately instead of waiting for the interval
            this.flush();
        }
        
        flush() {
            if (!this.isPlaying || this.samples.length === 0) {
                return;
            }
            
            console.log(`PCMPlayer: Flushing ${this.samples.length} samples`);
            
            // Create an audio buffer
            const bufferSource = this.audioCtx.createBufferSource();
            const audioBuffer = this.audioCtx.createBuffer(
                this.option.channels,
                this.samples.length,
                this.option.sampleRate
            );
            
            // Fill the audio buffer with our samples
            const audioData = audioBuffer.getChannelData(0);
            audioData.set(this.samples);
            
            // Connect the buffer to the audio context output
            bufferSource.buffer = audioBuffer;
            bufferSource.connect(this.gainNode);
            
            // Play the audio
            bufferSource.start(this.startTime);
            console.log(`PCMPlayer: Starting playback at time ${this.startTime}`);
            
            // Update start time for next flush
            this.startTime += audioBuffer.duration;
            console.log(`PCMPlayer: Buffer duration: ${audioBuffer.duration}s, next start time: ${this.startTime}`);
            
            // Clear the sample buffer
            this.samples = new Float32Array();
        }
        
        destroy() {
            this.isPlaying = false;
            this.samples = new Float32Array();
            clearInterval(this.interval);
            this.audioCtx = null;
        }
    }

    // Function to show typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.classList.add('typing-indicator');
        typingDiv.id = 'typing-indicator';
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('span');
            typingDiv.appendChild(dot);
        }
        
        conversationLog.appendChild(typingDiv);
        conversationLog.scrollTop = conversationLog.scrollHeight;
    }

    // Function to remove typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    // Function to update voice status
    function updateVoiceStatus(message) {
        voiceStatus.textContent = message;
    }

    // Function to set up audio analyzer for voice activity detection
    function setupVoiceActivityDetection() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            console.error('getUserMedia not supported');
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                const audioContext = new AudioContext();
                const analyser = audioContext.createAnalyser();
                const microphone = audioContext.createMediaStreamSource(stream);
                const javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
                
                // Improve frequency analysis for speech
                analyser.smoothingTimeConstant = 0.3; // Reduced from 0.5 for better sensitivity
                analyser.fftSize = 1024;
                
                microphone.connect(analyser);
                analyser.connect(javascriptNode);
                javascriptNode.connect(audioContext.destination);
                
                // Frames counter for more sophisticated detection
                let consecutiveSpeechFrames = 0;
                let consecutiveSilenceFrames = 0;
                const silenceFramesThreshold = 25; // Increased from 10 for better pause handling
                const speechFramesThreshold = 3; // Reduced from 5 to detect speech faster
                
                // Enhanced processing variables
                let potentialEndOfSpeech = false;
                let naturalPauseDetected = false;
                let pauseStartTime = null;
                let pauseDurationThreshold = 800; // Milliseconds to allow natural pauses
                
                javascriptNode.onaudioprocess = function() {
                    const array = new Uint8Array(analyser.frequencyBinCount);
                    analyser.getByteFrequencyData(array);
                    
                    // Focus on frequency range most common for human speech (300Hz - 3000Hz)
                    // This is a rough approximation given the FFT bins
                    const speechStartBin = Math.floor(300 * analyser.fftSize / audioContext.sampleRate);
                    const speechEndBin = Math.floor(3000 * analyser.fftSize / audioContext.sampleRate);
                    
                    // Calculate average in speech frequency range
                    let speechValues = 0;
                    for (let i = speechStartBin; i < speechEndBin && i < array.length; i++) {
                        speechValues += array[i];
                    }
                    
                    const speechBinCount = Math.min(speechEndBin - speechStartBin, array.length - speechStartBin);
                    audioLevel = speechValues / (speechBinCount || 1); // Avoid division by zero
                    
                    // Only check for speech activity if we're actively listening
                    if (isListening && !isProcessing && !isPlayingAudio) {
                        // If there's speech (above threshold)
                        if (audioLevel > speechThreshold) {
                            consecutiveSpeechFrames++;
                            consecutiveSilenceFrames = 0;
                            potentialEndOfSpeech = false;
                            naturalPauseDetected = false;
                            pauseStartTime = null;
                            
                            // User is speaking with sufficient confidence
                            if (consecutiveSpeechFrames >= speechFramesThreshold) {
                                // User is speaking, reset silence timer
                                if (silenceTimer) {
                                    clearTimeout(silenceTimer);
                                    silenceTimer = null;
                                }
                                
                                if (!isSpeaking) {
                                    isSpeaking = true;
                                    console.log('Speech started');
                                    speechStartTime = Date.now();
                                    
                                    // Set up early processing for long speech
                                    if (earlyProcessingTimer) {
                                        clearTimeout(earlyProcessingTimer);
                                    }
                                    
                                    earlyProcessingTimer = setTimeout(() => {
                                        if (isSpeaking && Date.now() - speechStartTime > earlyProcessingThreshold) {
                                            console.log('Speech duration threshold reached - early processing');
                                            stopListeningAndProcess();
                                        }
                                    }, earlyProcessingThreshold);
                                }
                                
                                // Activate the wave animation
                                waveContainer.classList.add('active');
                            }
                        } else {
                            // No speech detected
                            consecutiveSpeechFrames = 0;
                            consecutiveSilenceFrames++;
                            
                            // Track potential end of speech with natural pauses
                            if (isSpeaking) {
                                if (!naturalPauseDetected) {
                                    naturalPauseDetected = true;
                                    pauseStartTime = Date.now();
                                } else if (Date.now() - pauseStartTime > pauseDurationThreshold) {
                                    // Pause exceeded natural pause threshold, might be end of speech
                                    potentialEndOfSpeech = true;
                                }
                                
                                // Continuous silence after speech - with improved detection for sentence completion
                                if ((consecutiveSilenceFrames >= silenceFramesThreshold && potentialEndOfSpeech) || 
                                    (consecutiveSilenceFrames >= silenceFramesThreshold * 2)) { // Even longer silence is definite end
                                    
                                    // No sound, start silence timer if not already started
                                    waveContainer.classList.remove('active');
                                    
                                    if (!silenceTimer) {
                                        console.log('Potential end of speech detected, starting silence timer');
                                        silenceTimer = setTimeout(() => {
                                            // Silence detected for the threshold duration
                                            console.log('Silence confirmed, processing speech');
                                            isSpeaking = false;
                                            stopListeningAndProcess();
                                        }, silenceTimeout);
                                    }
                                } else {
                                    // Shorter pauses - keep animation but subdued
                                    waveContainer.classList.add('active');
                                    waveContainer.classList.add('paused');
                                }
                            } else if (!isSpeaking) {
                                // No animation if not speaking
                                waveContainer.classList.remove('active');
                                waveContainer.classList.remove('paused');
                            }
                        }
                    }
                };
                
                console.log('Enhanced voice activity detection set up');
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
            });
    }

    // Function to start listening
    function startListening() {
        if (!recorder || isProcessing || isListening || isPlayingAudio) return;
        
        isListening = true;
        updateVoiceStatus('Listening...');
        waveContainer.classList.add('active');
        
        // Set a maximum listening time
        listeningTimeout = setTimeout(() => {
            stopListeningAndProcess();
        }, maxListeningTime);
        
        // Reset speech tracking variables
        speechStartTime = null;
        
        // Clear any early processing timer
        if (earlyProcessingTimer) {
            clearTimeout(earlyProcessingTimer);
            earlyProcessingTimer = null;
        }
        
        recorder.start()
            .then(() => {
                console.log('Recording started');
            })
            .catch((error) => {
                console.error('Error starting recording:', error);
                isListening = false;
                waveContainer.classList.remove('active');
                updateVoiceStatus('Error: Could not start recording');
                clearTimeout(listeningTimeout);
                
                // Try to restart listening after a short delay
                setTimeout(startListening, 2000);
            });
    }

    // Function to stop listening and process audio
    function stopListeningAndProcess() {
        if (!isListening) return;
        
        // Clear timers
        if (silenceTimer) {
            clearTimeout(silenceTimer);
            silenceTimer = null;
        }
        
        if (listeningTimeout) {
            clearTimeout(listeningTimeout);
            listeningTimeout = null;
        }
        
        // Check if speech duration is too short - might be noise
        const speechDuration = speechStartTime ? (Date.now() - speechStartTime) : 0;
        if (speechDuration < minSpeechDuration) {
            console.log(`Speech duration (${speechDuration}ms) too short, likely noise - ignoring`);
            isListening = false;
            isSpeaking = false;
            silenceCount = 0;
            
            // Restart listening without processing
            setTimeout(() => {
                if (!isListening && !isProcessing && !isPlayingAudio) {
                    startListening();
                }
            }, 300);
            return;
        }
        
        isListening = false;
        isProcessing = true;
        isSpeaking = false;
        silenceCount = 0;
        waveContainer.classList.remove('active');
        updateVoiceStatus('Processing your message...');
        
        recorder.stop()
            .getMp3()
            .then(([buffer, blob]) => {
                // Create a File object
                const audioFile = new File(buffer, 'voice-message.mp3', {
                    type: blob.type,
                    lastModified: Date.now()
                });
                
                // Check if the file is very small (likely no speech)
                if (blob.size < 2500) { // Reduced from 5000 to 2500 to allow shorter speech
                    console.log('Audio file very small, likely no speech detected');
                    isProcessing = false;
                    setTimeout(startListening, 300);
                    return;
                }
                
                console.log('Processing audio of size:', blob.size, 'bytes, speech duration:', speechDuration + 'ms');
                
                // Process the audio file
                processVoiceMessage(audioFile);
            })
            .catch((error) => {
                console.error('Error stopping recording:', error);
                isProcessing = false;
                updateVoiceStatus('Error processing your message');
                
                // Try to restart listening after a short delay
                setTimeout(startListening, 1500); // Reduced from 3000ms
            });
    }

    // Function to process voice message - optimized for faster response
    async function processVoiceMessage(audioFile) {
        try {
            // Reset consecutive errors if we're processing a new message
            if (audioFile.size > 8000) {
                consecutiveErrors = 0;
            }
            
            showTypingIndicator();
            const processingStartTime = performance.now();
            
            // You can set role dynamically here - for now using a default
            const userRole = 'emergency operator'; // This could come from a UI element or be set dynamically
            
            // Create form data
            const formData = new FormData();
            formData.append('audio', audioFile);
            formData.append('conversationHistory', JSON.stringify(conversationHistory));
            formData.append('language', preferredLanguage);
            formData.append('role', userRole);
            
            console.log('Sending audio for processing...', {
                size: audioFile.size,
                language: preferredLanguage,
                role: userRole,
                speechDuration: speechStartTime ? (Date.now() - speechStartTime) : 'unknown'
            });
            
            const response = await fetch(API_VOICE_URL, {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            const processingTime = performance.now() - processingStartTime;
            console.log(`Received response from server in ${processingTime.toFixed(2)}ms`);
            
            removeTypingIndicator();
            
            if (data.error) {
                console.error('Error from server:', data.error);
                consecutiveErrors++;
                
                // Handle specific errors
                if (data.error.includes('No speech detected') || 
                    data.error.includes('Audio file too small') ||
                    data.error.includes('Unexpected language')) {
                    
                    // Don't show these technical errors to the user unless they happen repeatedly
                    if (consecutiveErrors > 2) {
                        addMessageToLog(`I'm having trouble hearing your order. Could you please speak clearly and try again?`, 'assistant');
                    }
                } else {
                    // Show other errors
                    addMessageToLog(`I apologize, but our ordering system is experiencing a brief delay. Could you please repeat your order?`, 'assistant');
                }
                
                isProcessing = false;
                updateVoiceStatus('Listening...');
                setTimeout(startListening, 300);
                return;
            }
            
            // Add user message with transcription
            addMessageToLog(data.transcription, 'user');
            
            // Add assistant message and play audio simultaneously
            // Also pass any extracted data fields for testing display
            addMessageToLog(data.message, 'assistant', data.data);
            
            // Start playback immediately without waiting
            // Use speech field if available, otherwise fall back to message
            const speechText = data.speech || data.message;
            playStreamedAudio(speechText)
                .then(() => {
                    console.log('Audio playback complete');
                })
                .catch(err => {
                    console.error('Error in audio playback:', err);
                });
            
            // Reset and prepare for next round - don't wait for audio to finish
            isProcessing = false;
            
            // Start listening again immediately, the audio playback
            // will set isPlayingAudio which will prevent actual recording
            // until the audio is done
            startListening();
            
        } catch (error) {
            console.error('Error in voice chat:', error);
            isProcessing = false;
            updateVoiceStatus('Error occurred. Trying again...');
            removeTypingIndicator();
            
            consecutiveErrors++;
            if (consecutiveErrors > 3) {
                addMessageToLog("I'm having trouble with our ordering system. Please try again in a moment or call our main store line if the issue persists.", 'assistant');
                consecutiveErrors = 0;
            }
            
            setTimeout(startListening, 1000);
        }
    }

    // Check for microphone permission and start the process
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(() => {
                console.log('Microphone permission granted');
                initRecorder();
                setupVoiceActivityDetection();
                
                // Start listening automatically after a delay
                setTimeout(() => {
                    startListening();
                }, 1000);
            })
            .catch((error) => {
                console.error('Microphone permission denied:', error);
                updateVoiceStatus('Microphone access denied. Please allow microphone access and reload the page.');
            });
    } else {
        console.error('getUserMedia not supported in this browser');
        updateVoiceStatus('Voice recording not supported in this browser. Please use a modern browser.');
    }

    // Optional: Add keyboard shortcut to manually trigger listening (for testing)
    document.addEventListener('keydown', (e) => {
        // Toggle voice with spacebar
        if (e.code === 'Space' && !e.repeat) {
            e.preventDefault();
            if (isListening) {
                stopListeningAndProcess();
            } else if (!isProcessing && !isPlayingAudio) {
                startListening();
            }
        }
    });
}); 