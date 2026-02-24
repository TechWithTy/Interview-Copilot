import {useState, useRef} from 'react';
import type {FC} from 'react';
import styles from './Options.module.scss';

const Options: FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      chunksRef.current = [];
      setDownloadUrl(null);
      
      // Request system/tab audio (usually via getDisplayMedia)
      // Firefox will prompt "Share screen" and requires video, but we only record audio.
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });
      
      // Stop the video track because we only want audio
      displayStream.getVideoTracks().forEach(track => {
        track.enabled = false;
        track.stop();
      });

      // Request microphone audio
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });

      // Combine both streams
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      
      // Only proceed if display stream actually has audio tracks (user checked "Share Audio")
      const displayAudioTrack = displayStream.getAudioTracks()[0];
      if (displayAudioTrack) {
        audioCtx.createMediaStreamSource(new MediaStream([displayAudioTrack])).connect(dest);
      }
      
      const micAudioTrack = micStream.getAudioTracks()[0];
      if (micAudioTrack) {
        audioCtx.createMediaStreamSource(new MediaStream([micAudioTrack])).connect(dest);
      }

      const mediaRecorder = new MediaRecorder(dest.stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        
        // Stop all tracks
        displayStream.getTracks().forEach(t => t.stop());
        micStream.getTracks().forEach(t => t.stop());
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording', err);
      alert('Failed to start recording. Make sure you allow microphone and system audio permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  return (
    <div className={styles.options} style={{ padding: '20px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Interview Copilot Recorder</h1>
      <p>This extension page allows you to capture browser tab output and your microphone input simultaneously.</p>
      
      <div style={{ marginTop: '30px' }}>
        {!isRecording ? (
          <button 
            data-testid="start-recording"
            onClick={startRecording}
            style={{ padding: '10px 20px', background: '#28a745', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Start Recording
          </button>
        ) : (
          <button 
            data-testid="stop-recording"
            onClick={stopRecording}
            style={{ padding: '10px 20px', background: '#dc3545', color: 'white', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
            Stop Recording
          </button>
        )}
      </div>

      {downloadUrl && (
        <div style={{ marginTop: '20px' }} data-testid="download-section">
          <p>Recording finished!</p>
          <a data-testid="download-link" href={downloadUrl} download="interview_audio.webm" style={{ color: '#007bff' }}>
            Download Recording
          </a>
        </div>
      )}
    </div>
  );
};

export default Options;

