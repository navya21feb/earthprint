import React, { useState, useRef, useEffect } from "react";

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
    if (emission < 1) return '#22c55e'; // Green
    if (emission < 5) return '#f59e0b'; // Yellow
    if (emission < 10) return '#f97316'; // Orange
    return '#ef4444'; // Red
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      padding: '2rem 1rem'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)',
        zIndex: -1
      }} />
      
      {/* Glass Container */}
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
          padding: '2rem',
          textAlign: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50%',
            left: '-50%',
            width: '200%',
            height: '200%',
            background: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
            animation: 'slide 20s linear infinite'
          }} />
          <div style={{ position: 'relative', zIndex: 2 }}>
            <h1 style={{
              fontSize: '3rem',
              fontWeight: '800',
              margin: '0 0 0.5rem 0',
              textShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
              background: 'linear-gradient(45deg, #ffffff, #f0f9ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              🌍 EcoTracker
            </h1>
            <p style={{
              fontSize: '1.2rem',
              margin: 0,
              opacity: 0.9,
              fontWeight: '400'
            }}>
              AI-Powered Carbon Footprint Analysis
            </p>
          </div>
        </div>

        <div style={{ padding: '2rem' }}>
          {/* Mode Selection */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '2rem',
            gap: '1rem'
          }}>
            {[
              { value: 'live', label: '🎤 Record Live', icon: '🎙️' },
              { value: 'file', label: '📁 Upload File', icon: '📎' }
            ].map((mode) => (
              <button
                key={mode.value}
                onClick={() => setRecordingMode(mode.value)}
                style={{
                  padding: '1rem 2rem',
                  border: 'none',
                  borderRadius: '50px',
                  background: recordingMode === mode.value 
                    ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                  color: recordingMode === mode.value ? 'white' : '#64748b',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: recordingMode === mode.value 
                    ? '0 10px 25px rgba(59, 130, 246, 0.4)'
                    : '0 4px 12px rgba(0, 0, 0, 0.1)',
                  transform: recordingMode === mode.value ? 'translateY(-2px)' : 'translateY(0)'
                }}
              >
                {mode.icon} {mode.label}
              </button>
            ))}
          </div>

          {/* Live Recording Mode */}
          {recordingMode === 'live' && (
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: '#1e293b',
                textAlign: 'center'
              }}>
                🎙️ Voice Recording Studio
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
              }}>
                {/* Recording Button */}
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {isRecording && (
                    <div style={{
                      position: 'absolute',
                      width: '120px',
                      height: '120px',
                      borderRadius: '50%',
                      background: `conic-gradient(from 0deg, #ef4444 0deg, #ef4444 ${audioLevel * 360}deg, transparent ${audioLevel * 360}deg)`,
                      animation: 'pulse 2s infinite',
                      zIndex: 1
                    }} />
                  )}
                  
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={loading}
                    style={{
                      width: '100px',
                      height: '100px',
                      borderRadius: '50%',
                      border: 'none',
                      background: isRecording 
                        ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        : 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      fontSize: '2rem',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: isRecording 
                        ? '0 0 40px rgba(239, 68, 68, 0.6)'
                        : '0 10px 30px rgba(34, 197, 94, 0.4)',
                      transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                      zIndex: 2,
                      position: 'relative'
                    }}
                  >
                    {isRecording ? '⏹️' : '🎤'}
                  </button>
                </div>
                
                {/* Recording Stats */}
                {isRecording && (
                  <div style={{
                    textAlign: 'center',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: '15px',
                    padding: '1rem 2rem',
                    border: '2px solid rgba(239, 68, 68, 0.2)'
                  }}>
                    <div style={{
                      fontSize: '2rem',
                      fontWeight: '700',
                      color: '#ef4444',
                      marginBottom: '0.5rem'
                    }}>
                      {formatTime(recordingTime)}
                    </div>
                    <div style={{
                      fontSize: '1rem',
                      color: '#64748b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem'
                    }}>
                      <span style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: '#ef4444',
                        animation: 'blink 1s infinite'
                      }} />
                      Recording in progress...
                    </div>
                  </div>
                )}
                
                {/* Instructions */}
                <div style={{
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '1rem',
                  maxWidth: '400px',
                  lineHeight: '1.6'
                }}>
                  {isRecording ? (
                    <p>🗣️ <strong>Speak clearly</strong> about your daily activities for accurate carbon footprint analysis</p>
                  ) : (
                    <p>🎯 Click the microphone to start recording your daily activities</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* File Upload Mode */}
          {recordingMode === 'file' && (
            <div style={{
              background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: '#1e293b',
                textAlign: 'center'
              }}>
                📁 Upload Audio File
              </h3>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '1.5rem'
              }}>
                <div style={{
                  width: '100%',
                  maxWidth: '400px',
                  border: '2px dashed #cbd5e1',
                  borderRadius: '15px',
                  padding: '2rem',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.5)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      opacity: 0,
                      width: '100%',
                      height: '100%',
                      cursor: 'pointer'
                    }}
                  />
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📎</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>
                    {audio ? audio.name : 'Choose Audio File'}
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                    Support MP3, WAV, M4A, OGG, FLAC
                  </div>
                </div>
                
                <button
                  onClick={handleFileSubmit}
                  disabled={loading || !audio}
                  style={{
                    padding: '1rem 2rem',
                    borderRadius: '50px',
                    border: 'none',
                    background: loading || !audio 
                      ? 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'
                      : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: loading || !audio ? '#94a3b8' : 'white',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    cursor: loading || !audio ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: loading || !audio 
                      ? 'none'
                      : '0 10px 25px rgba(59, 130, 246, 0.4)',
                    transform: loading || !audio ? 'none' : 'translateY(-2px)'
                  }}
                >
                  {loading ? '⏳ Processing...' : '🚀 Analyze Audio'}
                </button>
              </div>
            </div>
          )}

          {/* Loading Animation */}
          {loading && (
            <div style={{
              background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
              borderRadius: '20px',
              padding: '2rem',
              marginBottom: '2rem',
              textAlign: 'center',
              border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
              <div style={{
                display: 'inline-block',
                width: '60px',
                height: '60px',
                border: '6px solid #e2e8f0',
                borderTop: '6px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '1rem'
              }} />
              <div style={{
                fontSize: '1.3rem',
                fontWeight: '600',
                color: '#1e40af',
                marginBottom: '0.5rem'
              }}>
                🧠 AI Analysis in Progress
              </div>
              <div style={{
                fontSize: '1rem',
                color: '#64748b'
              }}>
                Processing your audio for carbon footprint insights...
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={{
              background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
              borderRadius: '20px',
              padding: '1.5rem',
              marginBottom: '2rem',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                fontSize: '2rem',
                flexShrink: 0
              }}>⚠️</div>
              <div>
                <div style={{
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#dc2626',
                  marginBottom: '0.5rem'
                }}>
                  Oops! Something went wrong
                </div>
                <div style={{
                  fontSize: '1rem',
                  color: '#7f1d1d'
                }}>
                  {error}
                </div>
              </div>
            </div>
          )}

          {/* Results Display */}
          {showResults && result && (
            <div style={{
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              borderRadius: '20px',
              padding: '2rem',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              animation: 'slideUp 0.5s ease-out'
            }}>
              <h3 style={{
                fontSize: '1.8rem',
                fontWeight: '700',
                marginBottom: '1.5rem',
                color: '#14532d',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem'
              }}>
                🎯 Analysis Results
              </h3>

              {/* Transcription */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '15px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid rgba(34, 197, 94, 0.1)'
              }}>
                <h4 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#14532d',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📝 Transcription
                </h4>
                <p style={{
                  fontSize: '1rem',
                  lineHeight: '1.6',
                  color: result.transcription === "No speech detected" ? '#64748b' : '#1e293b',
                  fontStyle: result.transcription === "No speech detected" ? 'italic' : 'normal',
                  margin: 0
                }}>
                  {result.transcription || "No transcription available"}
                </p>
              </div>

              {/* Activities & Emissions */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '15px',
                padding: '1.5rem',
                marginBottom: '1.5rem',
                border: '1px solid rgba(34, 197, 94, 0.1)'
              }}>
                <h4 style={{
                  fontSize: '1.2rem',
                  fontWeight: '600',
                  color: '#14532d',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  📊 Activities & Emissions
                </h4>
                
                {result.emissions && Array.isArray(result.emissions) && result.emissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {result.emissions.map((item, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: 'rgba(255, 255, 255, 0.6)',
                        borderRadius: '10px',
                        border: '1px solid rgba(34, 197, 94, 0.1)',
                        transition: 'all 0.3s ease'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.8rem'
                        }}>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: getEmissionColor(item?.emission || 0)
                          }} />
                          <span style={{
                            fontSize: '1rem',
                            fontWeight: '500',
                            color: '#1e293b'
                          }}>
                            {item?.activity || "Unknown activity"}
                          </span>
                        </div>
                        <div style={{
                          fontSize: '1.1rem',
                          fontWeight: '700',
                          color: getEmissionColor(item?.emission || 0),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          {item?.emission || 0} <span style={{ fontSize: '0.9rem' }}>kg CO₂e</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    color: '#64748b',
                    fontStyle: 'italic',
                    padding: '2rem'
                  }}>
                    No emissions data available
                  </div>
                )}
              </div>

              {/* Total Emissions */}
              {result.emissions && Array.isArray(result.emissions) && result.emissions.length > 0 && (
                <div style={{
                  background: `linear-gradient(135deg, ${getEmissionColor(getTotalEmissions())}20 0%, ${getEmissionColor(getTotalEmissions())}10 100%)`,
                  borderRadius: '15px',
                  padding: '2rem',
                  textAlign: 'center',
                  border: `2px solid ${getEmissionColor(getTotalEmissions())}40`
                }}>
                  <h4 style={{
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    color: '#1e293b',
                    marginBottom: '1rem'
                  }}>
                    🌍 Total Carbon Footprint
                  </h4>
                  <div style={{
                    fontSize: '3rem',
                    fontWeight: '800',
                    color: getEmissionColor(getTotalEmissions()),
                    marginBottom: '0.5rem'
                  }}>
                    {getTotalEmissions().toFixed(2)}
                  </div>
                  <div style={{
                    fontSize: '1.2rem',
                    color: '#64748b',
                    fontWeight: '500'
                  }}>
                    kg CO₂e
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.8; }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes slideUp {
          from { 
            transform: translateY(20px); 
            opacity: 0; 
          }
          to { 
            transform: translateY(0); 
            opacity: 1; 
          }
        }
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }
          .header h1 {
            font-size: 2rem;
          }
          .mode-buttons {
            flex-direction: column;
            gap: 0.5rem;
          }
          .recording-studio {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default App;