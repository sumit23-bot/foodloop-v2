import { useState, useRef, useEffect } from 'react';
import { stampWatermarkOnImage } from '../utils/cameraGeotag';

export function useCameraCapture({ onCaptureCompleted, watermarkTitle = '🛡️ ClothesLoop Verified Live Proof' } = {}) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [isLiveCapture, setIsLiveCapture] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Stop camera when unmounting
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera API is not supported in this browser or context (requires HTTPS or localhost).');
        return;
      }

      let stream = null;
      try {
        // Try ideal environment-facing (mobile back camera)
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 640 }, height: { ideal: 480 } }
        });
      } catch (envErr) {
        console.warn('Environment camera failed, falling back to standard video device:', envErr);
        // Fallback to any available video camera (laptop webcam, front camera)
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;
      setIsCameraActive(true);
      setImagePreview('');

      const attachVideo = () => {
        if (videoRef.current) {
          if (videoRef.current.srcObject !== stream) {
            videoRef.current.srcObject = stream;
          }
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.warn('Video play warning:', e));
        }
      };

      attachVideo();
      setTimeout(attachVideo, 60);
      setTimeout(attachVideo, 180);
    } catch (err) {
      console.error('Camera access error:', err);
      alert('Camera access denied or unavailable: ' + err.message + '\n\nPlease check your browser camera permissions or click "Upload Photo" instead.');
    }
  };

  useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.muted = true;
      videoRef.current.play().catch(e => console.warn('Autoplay warning:', e));
    }
  }, [isCameraActive]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = async (coords) => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    let base64 = canvas.toDataURL('image/jpeg', 0.90);
    stopCamera();

    // Burn-in geotag watermark
    try {
      base64 = await stampWatermarkOnImage(base64, coords, watermarkTitle);
    } catch (err) {
      console.warn('Geotag stamp warning:', err);
    }

    setImagePreview(base64);
    setIsLiveCapture(true);
    if (onCaptureCompleted) onCaptureCompleted(base64, true);
    return base64;
  };

  const handleGalleryUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('❌ Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvt) => {
      const base64 = uploadEvt.target.result;
      stopCamera();
      setImagePreview(base64);
      setIsLiveCapture(false);
      if (onCaptureCompleted) onCaptureCompleted(base64, false);
    };
    reader.readAsDataURL(file);
  };

  const retakePhoto = () => {
    setImagePreview('');
    setIsLiveCapture(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return {
    isCameraActive,
    imagePreview,
    setImagePreview,
    isLiveCapture,
    setIsLiveCapture,
    videoRef,
    fileInputRef,
    startCamera,
    stopCamera,
    capturePhoto,
    handleGalleryUpload,
    retakePhoto
  };
}
