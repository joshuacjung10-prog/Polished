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
let transcript = '';
let recognition = null;
let speakingSeconds = 0;
let speakingInterval = null;
let previousFeedback = [];

function startSpeechRecognition() {
  if (!('webkitSpeechRecognition' in window)) return;
  recognition = new webkitSpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript + ' ';
      } else {
        interim += event.results[i][0].transcript;
      }
    }
  };

  recognition.onerror = () => {};
  recognition.onend = () => {
    if (stream) recognition.start();
  };

  recognition.start();
}

async function startSession() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    video.srcObject = stream;

    startBtn.style.display = 'none';
    stopBtn.style.display = 'block';
    timerEl.style.display = 'block';
    statusEl.textContent = 'Session active — speak naturally...';

    seconds = 0;
    speakingSeconds = 0;
    transcript = '';
    previousFeedback = [];

    timerInterval = setInterval(() => {
      seconds++;
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      timeEl.textContent = `${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);

    speakingInterval = setInterval(() => {
      if (transcript.trim().length > 0) speakingSeconds++;
    }, 1000);

    startSpeechRecognition();

    sessionInterval = setInterval(() => {
      if (speakingSeconds >= 10) {
        captureAndAnalyze();
      } else {
        statusEl.textContent = `Keep speaking — ${10 - speakingSeconds}s until first analysis...`;
      }
    }, 15000);

  } catch (err) {
    statusEl.textContent = 'Camera access denied — please allow camera permission.';
  }
}

function stopSession() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
  clearInterval(sessionInterval);
  clearInterval(timerInterval);
  clearInterval(speakingInterval);
  seconds = 0;
  speakingSeconds = 0;
  transcript = '';

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

  const currentTranscript = transcript.trim();
  transcript = '';

  statusEl.textContent = 'Analyzing...';

  const previousContext = previousFeedback.length > 0
    ? `Previous feedback given: ${previousFeedback.slice(-2).join(' | ')}. Do NOT repeat these points.`
    : 'This is the first analysis of the session.';

  try {
    const response = await fetch('https://polished-iota.vercel.app/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 400,
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
              text: `You are Polished, a professional AI confidence coach analyzing someone in real time.

What they said: "${currentTranscript || 'No speech detected yet'}"

${previousContext}

Analyze the image carefully and return in this EXACT format:
POSTURE_SCORE: [0-100]
EXPRESSION_SCORE: [0-100]
VOICE_SCORE: [0-100]
FEEDBACK: [Give 3 specific tips. Each tip must reference something specific you actually see or hear. Tip 1 about posture/body language. Tip 2 about facial expression/eye contact. Tip 3 about their speech — reference their actual words if available, comment on filler words, pace, clarity, or confidence. Never be generic. Never repeat previous feedback. Under 100 words total.]`
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
      const feedbackText = feedbackMatch[1].trim();
      previousFeedback.push(feedbackText);

      document.getElementById('empty-state').style.display = 'none';
      const entry = document.createElement('div');
      entry.className = 'feedback-entry';
      const now = new Date();
      entry.innerHTML = '<div class="feedback-time">' + now.toLocaleTimeString() + '</div>' + feedbackText;
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

document.getElementById('getStartedBtn').addEventListener('click', function() {
  document.getElementById('onboarding').style.display = 'none';
});