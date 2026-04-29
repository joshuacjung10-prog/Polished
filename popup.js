const video = document.getElementById('video');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
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

function setScore(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = val;
  el.className = 'card-score' + (val >= 80 ? ' good' : val >= 60 ? ' mid' : ' low');
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
      headers: { 'Content-Type': 'application/json' },
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
              text: `You are Polished, a professional AI confidence coach. Analyze this image and return your response in this exact format:
POSTURE_SCORE: [number 0-100]
EXPRESSION_SCORE: [number 0-100]
VOICE_SCORE: [number 0-100]
FEEDBACK: [2-3 specific actionable tips based exactly on what you see. Be direct and specific, never generic. Under 80 words.]`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const raw = data.content[0].text;

    const postureMatch = raw.match(/POSTURE_SCORE:\s*(\d+)/);
    const expressionMatch = raw.match(/EXPRESSION_SCORE:\s*(\d+)/);
    const voiceMatch = raw.match(/VOICE_SCORE:\s*(\d+)/);
    const feedbackMatch = raw.match(/FEEDBACK:\s*([\s\S]+)/);

    if (postureMatch) setScore('score-posture', postureMatch[1]);
    if (expressionMatch) setScore('score-expression', expressionMatch[1]);
    if (voiceMatch) setScore('score-voice', voiceMatch[1]);

    if (feedbackMatch) {
      document.getElementById('empty-state').style.display = 'none';
      const entry = document.createElement('div');
      entry.className = 'feedback-entry';
      const now = new Date();
      entry.innerHTML = '<div class="feedback-time">' + now.toLocaleTimeString() + '</div>' + feedbackMatch[1].trim();
      document.getElementById('feedback-panel').appendChild(entry);
      document.getElementById('feedback-panel').scrollTop = document.getElementById('feedback-panel').scrollHeight;
    }

    statusEl.textContent = 'Next check in 15 seconds...';

  } catch (err) {
    statusEl.textContent = 'Could not analyze — check your connection.';
  }
}

startBtn.addEventListener('click', startSession);
stopBtn.addEventListener('click', stopSession);
