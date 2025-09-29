const createBtn = document.getElementById('createButton');
const linkContainer = document.getElementById('linkContainer');
const shareLink = document.getElementById('shareLink');

const counterCard = document.getElementById('counterCard');
const opinionCountEl = document.getElementById('opinionCount');

let currentQuestionId = null;
let pollTimer = null;

function startCounterPolling(qid) {
  currentQuestionId = qid;
  counterCard.style.display = 'block';

  async function tick() {
    try {
      const res = await fetch(`/api/opinion-count/${qid}`);
      if (!res.ok) return; // silently ignore
      const data = await res.json();
      if (typeof data.count === 'number') {
        opinionCountEl.textContent = data.count;
      }
    } catch (_) {
      // ignore network hiccups
    }
  }

  // run immediately, then every 3s
  tick();
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(tick, 3000);
}

createBtn.addEventListener('click', async function () {
  const questionEl = document.getElementById('questionBox');
  const question = (questionEl.value || '').trim();
  if (!question) return;

  try {
    const res = await fetch('/api/create-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    if (!res.ok) {
      const t = await res.text();
      alert('Failed to create question: ' + t);
      return;
    }
    const data = await res.json();
    if (data.link) {
      const qid = data.link.split('/').pop();
      shareLink.value = window.location.origin + data.link;
      linkContainer.style.display = 'block';

      // start live counter for this newly created question
      startCounterPolling(qid);
    }
  } catch (err) {
    alert('Network error creating question.');
  }
});
