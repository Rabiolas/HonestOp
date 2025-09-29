const createBtn = document.getElementById('createButton');
const linkContainer = document.getElementById('linkContainer');
const shareLink = document.getElementById('shareLink');
const summaryBtn = document.getElementById('summaryButton');

const counterCard = document.getElementById('counterCard');
const opinionCountEl = document.getElementById('opinionCount');

let pollTimer = null;

function startCounterPolling(qid) {
  // Show the card (it might be inside linkContainer)
  if (counterCard) counterCard.style.display = 'block';

  async function tick() {
    try {
      const res = await fetch(`/api/opinion-count/${qid}`);
      if (!res.ok) return;
      const data = await res.json();
      if (typeof data.count === 'number' && opinionCountEl) {
        opinionCountEl.textContent = data.count;
      }
    } catch (_) {
      // ignore transient errors
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
  if (!question) {
    alert('Please type a question first.');
    return;
  }

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

      // show the share link
      shareLink.value = window.location.origin + data.link;
      linkContainer.style.display = 'block';

      // wire summary button
      if (summaryBtn) {
        const summaryLink = window.location.origin + `/summary/${qid}`;
        summaryBtn.onclick = () => { window.location.href = summaryLink; };
      }

      // start live counter
      startCounterPolling(qid);
    }
  } catch (err) {
    alert('Network error creating question.');
  }
});

