"use client";
import { useRef, useEffect, useState } from "react";
import * as faceapi from "face-api.js";
export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [height, setHeight] = useState(720);
  const MODEL_URL =
    process.env.NEXT_PUBLIC_FACEAPI_MODEL_URL ||
    "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights";
  const constraints = {
    video: {
      width: 1280,
      height: height,
      frameRate: 120,
      facingMode: "user",
      rotate: 180,
    },
    audio: false,
  }
  let interval: NodeJS.Timeout;

  useEffect(() => {
    const updateConstraints = () => {
      const isMobile = window.innerWidth < 768;
      setHeight(isMobile ? 1280 : 720);
    };
    updateConstraints();
    window.addEventListener("resize", updateConstraints);

    const loadModels = async () => {
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]).then(() => {
        startVideo();
      }).catch(error => {
        console.error("Error loading models:", error);
      });
    }
    loadModels();
    return () => {
      window.removeEventListener("resize", updateConstraints);
      if (interval) {
        clearInterval(interval);
      }
      const stream = videoRef.current?.srcObject as MediaStream;
      if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  }, [])

  const startVideo =() => {
    const video = videoRef.current;
    
    if (video) {
      navigator.mediaDevices.getUserMedia(constraints).then(stream => {
        video.srcObject = stream;
      }).catch(error => {
        console.error("Error accessing camera:", error);
      });

      video.onloadedmetadata = () => {
        video.play();
        canvasSetup(video);
      }
       
    }
  }

  const canvasSetup = (video: HTMLVideoElement) => {
    const canvas = faceapi.createCanvasFromMedia(video);
    canvas.className = "absolute inset-0 w-full h-full rounded-2xl pointer-events-none";

    video.parentNode?.appendChild(canvas);
    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    if (!displaySize.width || !displaySize.height) {
      return;
    }

    canvas.width = displaySize.width;
    canvas.height = displaySize.height;
    faceapi.matchDimensions(canvas, displaySize);

    interval = setInterval(async () => {
      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceExpressions();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      canvas?.getContext("2d")?.clearRect(0 ,0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    }, 100)
  }
  

  


  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-indigo-50 to-sky-100 text-slate-900">
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-10 text-center sm:px-6 sm:pb-24 sm:pt-16">
        <h1 className="mb-5 text-3xl font-bold uppercase tracking-[0.12em] text-transparent bg-clip-text bg-linear-to-r from-sky-600 via-violet-600 to-fuchsia-600 sm:mb-6 sm:text-4xl sm:tracking-[0.2em]">
          FaceApp
        </h1>
        <div className="relative mx-auto w-full max-w-[860px]">
          <video
            autoPlay
            ref={videoRef}
            className="w-full h-[72vh] max-h-none rounded-2xl border border-slate-900/10 bg-white/80 shadow-[0_20px_60px_rgba(15,23,42,0.18),0_0_0_1px_rgba(59,130,246,0.18),0_0_50px_rgba(125,211,252,0.25)] sm:h-auto sm:max-h-[70vh] md:max-h-screen"
          />
        </div>
      </main>
    </div>
  );
}
