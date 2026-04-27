const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const feedbackBox = document.getElementById('feedback-box');
const statusEl = document.getElementById('status');
const timerEl = document.getElementById('timer');
const timeEl = document.getElementById('time');

let stream = null;
let sessionInterval = null;
let timerInterval = null;
let seconds = 0;

async function startSession() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    timerEl.style.display = 'block';
    feedbackBox.style.display = 'block';
    statusEl.textContent = 'Session active — AI is watching...';

    timerInterval = setInterval(() => {
      seconds++;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);

    sessionInterval = setInterval(captureAndAnalyze, 15000);
    setTimeout(captureAndAnalyze, 2000);

  } catch (err) {
    statusEl.textContent = 'Camera access denied — please allow camera permission.';
  }
}

function stopSession() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  clearInterval(sessionInterval);
  clearInterval(timerInterval);
  seconds = 0;

  startBtn.style.display = 'block';
  stopBtn.style.display = 'none';
  timerEl.style.display = 'none';
  statusEl.textContent = 'Session ended. Click start for a new session.';
}

async function captureAndAnalyze() {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0);
  const imageData = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

  feedbackBox.textContent = 'Analyzing...';

  try {
    const response = await fetch('https://polished.vercel.app/api/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: imageData
              }
            },
            {
              type: 'text',
              text: `You are Polished, a warm and encouraging AI confidence coach. Analyze this person's posture, facial expression, and body language. Give them 2-3 short, specific, actionable tips in a friendly tone. Focus on what they can immediately improve. Be specific not generic. Keep it under 80 words.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    feedbackBox.textContent = data.content[0].text;
    statusEl.textContent = 'Next check in 15 seconds...';

  } catch (err) {
    feedbackBox.textContent = 'Could not analyze — check your connection.';
  }
}

startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', stopSession);