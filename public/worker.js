importScripts(
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs/dist/tf.min.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm/dist/tf-backend-wasm.js",
  "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite/dist/tf-tflite.min.js"
);

let tfliteModel = null;

onmessage = async (e) => {
  try {
    if (e.data.type === "init") {
      tflite.setWasmPath(
        "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite/dist/"
      );
      await tf.setBackend("wasm");
      await tf.ready();
          tfliteModel = await tflite.loadTFLiteModel(e.data.modelPath, {
            numThreads: -1,
          });
      postMessage({ type: "init-done" });
    } else if (e.data.type === "predict" && tfliteModel) {
      console.log(tf.getBackend());
      const { bitmap, width, height } = e.data;

      const outputTensor = tf.tidy(() => {
        const img = tf.browser.fromPixels(bitmap);
        const input = tf.image.resizeBilinear(img, [height, width]);
        const batched = tf.expandDims(input, 0);
        const casted = tf.cast(batched, "int32");
        return tfliteModel.predict(casted);
      });

      const scores = await tf.squeeze(outputTensor).array();

      outputTensor.dispose();
      bitmap.close();

      postMessage({ type: "prediction", scores });
    }
  } catch (error) {
    postMessage({ type: "error", error: error.message });
  }
};
