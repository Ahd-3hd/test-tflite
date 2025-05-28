/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef } from "react";

export interface Prediction {
  name: string;
  confidence: number;
}

const MODEL_PATH = "/ebike-ff-mpz.tflite";
const MODEL_WIDTH = 224;
const MODEL_HEIGHT = 224;
const CLASSES = [
  "parked_with_no_obstruction",
  "image_quality_too_poor",
  "no_bike",
  "parking_bay_major_violation",
  "too_close_up",
  "local_violation",
  "bike_view_obstructed",
  "too_far_away",
  "parking_bay_minor_violation",
  "bike_rack",
  "in_road",
  "parking_bay_no_violation",
  "on_tactile_paving",
  "pavement_obstruction",
  "blocking_entrance",
  "off_pavement_and_off_road",
  "blocking_vehicle_access",
  "near_movable_object",
  "abandoned_with_no_obstruction",
  "near_fixed_object",
  "ground_not_visible",
];

export function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    let worker: Worker;

    async function setupWebcam(): Promise<HTMLVideoElement> {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Webcam not supported");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      const video = videoRef.current!;
      video.srcObject = stream;
      return new Promise((res) => (video.onloadedmetadata = () => res(video)));
    }

    async function initWorker() {
      worker = new Worker("/worker.js", { type: "classic" });
      await new Promise<void>((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.type === "init-done") resolve();
          if (e.data.type === "error") reject(new Error(e.data.error));
        };
        worker.postMessage({ type: "init", modelPath: MODEL_PATH });
      });
    }

    async function predictLoop() {
      if (!videoRef.current) return;
      const bitmap = await createImageBitmap(videoRef.current);
      worker.postMessage(
        { type: "predict", bitmap, width: MODEL_WIDTH, height: MODEL_HEIGHT },
        [bitmap]
      );
    }

    async function main() {
      try {
        await initWorker();
        await setupWebcam();

        worker.onmessage = (e) => {
          if (e.data.type === "prediction") {
            const preds: Prediction[] = e.data.scores
              .map((c: number, i: number) => ({
                name: CLASSES[i],
                confidence: c,
              }))
              .sort((a: any, b: any) => b.confidence - a.confidence);

            if (preRef.current) {
              preRef.current.innerText = JSON.stringify(preds, null, 2);
            }

            predictLoop();
          }
        };

        predictLoop();
      } catch (err: any) {
        console.error(err);
        if (preRef.current) {
          preRef.current.innerText = `Error: ${err.message}`;
        }
      }
    }

    main();

    return () => {
      if (worker) worker.terminate();
      const tracks =
        // eslint-disable-next-line react-hooks/exhaustive-deps
        (videoRef.current?.srcObject as MediaStream)?.getTracks() || [];
      tracks.forEach((t) => t.stop());
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <h1>Bike Violation Detector</h1>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        width={640}
        height={480}
        style={{ border: "1px solid #ccc" }}
      />
      <h2>Top Predictions</h2>
      <pre
        ref={preRef}
        style={{ textAlign: "left", maxHeight: 300, overflow: "auto" }}
      ></pre>
    </div>
  );
}

export default App;
