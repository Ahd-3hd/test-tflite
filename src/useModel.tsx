import { useEffect, useRef } from "react";

export function useModel(modelPath: string) {
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    // `type: 'classic'` is important because your script uses importScripts()
    const worker = new Worker("/worker.js", { type: "classic" });
    worker.onmessage = (e) => {
      switch (e.data.type) {
        case "init-done":
          console.log("Model loaded");
          break;
        case "prediction":
          console.log("Scores:", e.data.scores);
          break;
        case "error":
          console.error(e.data.error);
          break;
      }
    };
    worker.postMessage({ type: "init", modelPath });
    workerRef.current = worker;

    return () => {
      worker.terminate();
    };
  }, [modelPath]);
}
