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

  statusEl.textContent = 'Analyzing...';

  try {
    const response = await fetch('https://polished-iota.vercel.app/api/analyze', {
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
              text: `You are Polished, a warm and encouraging AI confidence coach. Analyze this image carefully and give specific feedback on: 1) POSTURE — are they slouching, is their back straight, how are their shoulders positioned? 2) FACIAL EXPRESSION — do they look engaged, tense, neutral, approachable? 3) EYE CONTACT — are they looking at the camera or away? 4) BODY LANGUAGE — are their arms crossed, are they fidgeting, do they look open or closed off? Give 3 specific actionable tips referencing exactly what you see. Be direct, warm, and specific. Never be generic. Under 100 words.`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const newFeedback = document.createElement('p');
newFeedback.style.marginBottom = '12px';
newFeedback.style.borderBottom = '1px solid #333';
newFeedback.style.paddingBottom = '12px';
newFeedback.textContent = data.content[0].text;
feedbackBox.appendChild(newFeedback);
feedbackBox.scrollTop = feedbackBox.scrollHeight;
    statusEl.textContent = 'Next check in 15 seconds...';

  } catch (err) {
    feedbackBox.textContent = 'Could not analyze — check your connection.';
  }
}

startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', stopSession);
