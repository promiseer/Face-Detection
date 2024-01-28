document.addEventListener('DOMContentLoaded', async () => {


  const video = document.getElementById("video");
  const captureButton = document.getElementById('captureButton');
  const retakeButton = document.getElementById('retakeButton');
  let capturedImage = null;

  const videoContainer = document.getElementById("video-container");
  const MODEL_URI = "/models";
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URI),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URI),
    faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI),
    faceapi.nets.ageGenderNet.loadFromUri(MODEL_URI),
  ])
    .then(playVideo)
    .catch((err) => {
      console.log(err);
    });

  function playVideo() {
    if (!navigator.mediaDevices) {
      console.error("mediaDevices not supported");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 360, ideal: 720, max: 1080 },
        },
        audio: false,
      })
      .then(function (stream) {
        video.srcObject = stream;
      })
      .catch(function (err) {
        console.log(err);
      });
  }
  video.addEventListener("play", () => {
    // Creating the canvas
    const canvas = faceapi.createCanvasFromMedia(video);

    // This will force the use of a software (instead of hardware accelerated)
    // Enable only for low configurations
    canvas.willReadFrequently = true;
    videoContainer.appendChild(canvas);

    // Resizing the canvas to cover the video element
    const canvasSize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, canvasSize);

    setInterval(async () => {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      // Set detections size to the canvas size

      const DetectionsArray = faceapi.resizeResults(detections, canvasSize);
      canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
      if (DetectionsArray.length > 0 && DetectionsArray.length < 2) {
        detectionsDraw(canvas, DetectionsArray);
      } else if (DetectionsArray.length > 1) {
        // Draw a label if multiple faces are detected

        const ctx = canvas.getContext('2d');
        ctx.font = '20px Arial';
        ctx.fillStyle = 'red';

        // Calculate center position
        const centerX = canvas.width / 2 - ctx.measureText('Multiple faces detected').width / 2;
        const centerY = canvas.height / 2 + 30; // Adjust vertical position

        ctx.fillText('Multiple faces detected', centerX, centerY);
      } else {
        // Draw a label for "No face detected"
        const ctx = canvas.getContext('2d');
        ctx.font = '20px Arial';
        ctx.fillStyle = 'red';
        const centerX = canvas.width / 2 - ctx.measureText('No face detected').width / 2;
        const centerY = canvas.height / 2;
        ctx.fillText('No face detected!', centerX, centerY);
      }


    }, 10)
  });

  // Drawing our detections above the video
  function detectionsDraw(canvas, DetectionsArray) {
    // Addjust the size of the detection canvas
    faceapi.draw.drawDetections(canvas, DetectionsArray);
    // faceapi.draw.drawFaceLandmarks(canvas, DetectionsArray);
    faceapi.draw.drawFaceExpressions(canvas, DetectionsArray);

    // Drawing AGE and GENDER
    DetectionsArray.forEach((detection) => {
      const box = detection.detection.box;
      const drawBox = new faceapi.draw.DrawBox(box, {
        label: `${Math.round(detection.age)}y, ${detection.gender}`,
      });
      drawBox.draw(canvas);
    });
  }

  // Add click event for the capture button
  captureButton.addEventListener('click', async () => {
    // Capture an image from the video stream
    const canvas = faceapi.createCanvasFromMedia(video);

    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
    if (detections.length > 0) {
      video.pause();
      capturedImage = new Image();
      capturedImage.src = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = capturedImage.src;
      downloadLink.download = 'captured_image.png';

      // Trigger a click on the anchor to initiate the download
      downloadLink.click();
      // Show the retake button and hide the capture button
      captureButton.style.display = 'none';
      retakeButton.style.display = 'inline-block';
    } else {
      alert('No face detected. Try again.');
    }


  });

  // Add click event for the retake button
  retakeButton.addEventListener('click', () => {
    // Hide the retake button and show the capture button
    video.play();

    retakeButton.style.display = 'none';
    captureButton.style.display = 'inline-block';

    // Remove the captured image
    if (capturedImage) {
      capturedImage.remove();
      capturedImage = null;
    }
  });

})