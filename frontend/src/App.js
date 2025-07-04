import React, { useState, useRef, useEffect } from "react";
import { Mic, Upload, FileAudio, Play, Pause, RotateCcw, Zap, Leaf, Activity, TrendingUp, CheckCircle, AlertCircle } from "lucide-react";

function App() {
  const [audio, setAudio] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingMode, setRecordingMode] = useState('live');
  const [audioLevel, setAudioLevel] = useState(0);
  const [showResults, setShowResults] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  // Request microphone permission and setup audio visualization
  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('Microphone permission granted');
      } catch (err) {
        console.log('Microphone permission denied or not available');
      }
    };

    requestMicrophonePermission();
  }, []);

  // Audio level visualization
  useEffect(() => {
    if (isRecording && streamRef.current) {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(streamRef.current);
      
      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;
      
      microphone.connect(analyser);
      analyserRef.current = analyser;
      
      const updateAudioLevel = () => {
        if (analyserRef.current) {
          const bufferLength = analyserRef.current.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteFrequencyData(dataArray);
          
          const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
          setAudioLevel(average / 255);
        }
        
        if (isRecording) {
          animationRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRecording]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setAudio(file);
    setError(null);
  };

  const startRecording = async () => {
    try {
      setError(null);
      setResult(null);
      setShowResults(false);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: 'audio/webm;codecs=opus' 
        });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const base64Data = reader.result;
            await processRecordedAudio(base64Data);
          } catch (err) {
            setError("Error processing recorded audio: " + err.message);
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError("Could not start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setAudioLevel(0);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processRecordedAudio = async (base64Data) => {
    setLoading(true);
    
    try {
      const response = await fetch("http://localhost:8000/api/process-audio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          audio_data: base64Data
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API Response:', data);
      setResult(data);
      setShowResults(true);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || "An error occurred while processing the audio");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    if (!audio) {
      setError("Please select an audio file");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setShowResults(false);

    try {
      const formData = new FormData();
      formData.append("audio", audio);

      const res = await fetch("http://localhost:8000/api/upload-audio", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log('API Response:', data);
      setResult(data);
      setShowResults(true);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || "An error occurred while processing the audio");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTotalEmissions = () => {
    if (!result?.emissions || !Array.isArray(result.emissions)) return 0;
    return result.emissions.reduce((total, item) => total + (item?.emission || 0), 0);
  };

  const getEmissionColor = (emission) => {
    if (emission < 1) return '#10b981'; // Green
    if (emission < 5) return '#f59e0b'; // Yellow
    if (emission < 10) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  const getEmissionLevel = (emission) => {
    if (emission < 1) return 'Low';
    if (emission < 5) return 'Moderate';
    if (emission < 10) return 'High';
    return 'Very High';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">EcoTracker</h1>
                <p className="text-sm text-gray-500">Carbon Footprint Analyzer</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button className="text-gray-500 hover:text-gray-700">
                <Activity className="w-5 h-5" />
              </button>
              <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors">
                View Reports
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Hero Section */}
            <div className="bg-white rounded-2xl shadow-sm p-8 mb-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  Track your carbon footprint
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                  Our mission is to make people realize that there is no <span className="text-green-600 font-semibold">Earth B</span>
                </p>
              </div>

              <div className="flex justify-center mb-8">
                <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="w-24 h-24 bg-green-600 rounded-full flex items-center justify-center">
                    <Leaf className="w-12 h-12 text-white" />
                  </div>
                </div>
              </div>

              <div className="text-center">
                <p className="text-gray-600 mb-6">How it works</p>
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">1</span>
                    </div>
                    <span className="text-sm text-gray-600">Input</span>
                  </div>
                  <div className="hidden sm:block w-12 h-px bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">2</span>
                    </div>
                    <span className="text-sm text-gray-600">Track</span>
                  </div>
                  <div className="hidden sm:block w-12 h-px bg-gray-300"></div>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">3</span>
                    </div>
                    <span className="text-sm text-gray-600">Improve</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recording Interface */}
            <div className="bg-white rounded-2xl shadow-sm p-8">
              <div className="flex items-center justify-center mb-8">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setRecordingMode('live')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      recordingMode === 'live'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Mic className="w-4 h-4" />
                    <span>Record Live</span>
                  </button>
                  <button
                    onClick={() => setRecordingMode('file')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      recordingMode === 'file'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>Upload File</span>
                  </button>
                </div>
              </div>

              {/* Live Recording */}
              {recordingMode === 'live' && (
                <div className="text-center">
                  <div className="mb-8">
                    <div className="relative inline-block">
                      {isRecording && (
                        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                      )}
                      <button
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={loading}
                        className={`relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200 ${
                          isRecording
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {isRecording ? (
                          <div className="w-6 h-6 bg-white rounded-sm"></div>
                        ) : (
                          <Mic className="w-8 h-8" />
                        )}
                      </button>
                    </div>
                  </div>

                  {isRecording && (
                    <div className="mb-8">
                      <div className="text-2xl font-mono font-bold text-gray-900 mb-2">
                        {formatTime(recordingTime)}
                      </div>
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                        <span className="text-sm text-gray-600">Recording...</span>
                      </div>
                      <div className="mt-4 max-w-xs mx-auto">
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all duration-100"
                            style={{ width: `${audioLevel * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-gray-600">
                    {isRecording 
                      ? "Speak clearly about your daily activities..."
                      : "Click the microphone to start recording"
                    }
                  </p>
                </div>
              )}

              {/* File Upload */}
              {recordingMode === 'file' && (
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 mb-6 hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-4">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <FileAudio className="w-8 h-8 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-lg font-medium text-gray-900">
                            {audio ? audio.name : "Choose audio file"}
                          </p>
                          <p className="text-sm text-gray-500">
                            MP3, WAV, M4A, OGG, FLAC up to 50MB
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <button
                    onClick={handleFileSubmit}
                    disabled={loading || !audio}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                      loading || !audio
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {loading ? 'Processing...' : 'Analyze Audio'}
                  </button>
                </div>
              )}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="bg-white rounded-2xl shadow-sm p-8 mt-8">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-4"></div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Analyzing your audio...
                  </h3>
                  <p className="text-gray-600">
                    Our AI is processing your data to calculate carbon emissions
                  </p>
                </div>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mt-8">
                <div className="flex items-center space-x-3">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results */}
            {showResults && result && (
              <div className="bg-white rounded-2xl shadow-sm p-8 mt-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Analysis Complete</h3>
                  <p className="text-gray-600">Here's your carbon footprint breakdown</p>
                </div>

                {/* Transcription */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">Transcription</h4>
                  <p className="text-gray-700 leading-relaxed">
                    {result.transcription || "No transcription available"}
                  </p>
                </div>

                {/* Emissions Breakdown */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-6">Emissions Breakdown</h4>
                  {result.emissions && Array.isArray(result.emissions) && result.emissions.length > 0 ? (
                    <div className="space-y-4">
                      {result.emissions.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: getEmissionColor(item?.emission || 0) }}
                            ></div>
                            <span className="font-medium text-gray-900">
                              {item?.activity || "Unknown activity"}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900">
                              {item?.emission || 0} kg CO₂e
                            </div>
                            <div className="text-sm text-gray-500">
                              {getEmissionLevel(item?.emission || 0)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No emissions data available
                    </div>
                  )}
                </div>

                {/* Total Emissions */}
                {result.emissions && Array.isArray(result.emissions) && result.emissions.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-6 text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">
                      Total Carbon Footprint
                    </h4>
                    <div className="text-4xl font-bold text-green-600 mb-2">
                      {getTotalEmissions().toFixed(2)}
                    </div>
                    <div className="text-lg text-gray-600">kg CO₂e</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Daily Average</span>
                  <span className="font-semibold text-gray-900">2.4 kg CO₂e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">This Month</span>
                  <span className="font-semibold text-gray-900">72.1 kg CO₂e</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Goal Progress</span>
                  <span className="font-semibold text-green-600">85%</span>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Tips</h3>
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">
                    Use public transport to reduce emissions by 45%
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-3 h-3 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">
                    Choose plant-based meals 3 times a week
                  </p>
                </div>
              </div>
            </div>

            {/* Achievement */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-6 text-white">
              <div className="text-center">
                <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <TrendingUp className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Good Choice!</h3>
                <p className="text-sm opacity-90">
                  You've reduced your carbon footprint by 12% this week
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;