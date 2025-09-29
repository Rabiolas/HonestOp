document.getElementById('createButton').addEventListener('click', async function () {
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
      const linkContainer = document.getElementById('linkContainer');
      const shareLink = document.getElementById('shareLink');
      const summaryButton = document.getElementById('summaryButton');

      shareLink.value = window.location.origin + data.link;
      const qid = data.link.split('/').pop();
      const summaryLink = window.location.origin + `/summary/${qid}`;

      summaryButton.onclick = () => { window.location.href = summaryLink; };
      linkContainer.style.display = 'block';
    }
  } catch (err) {
    alert('Error creating question.');
  }
});
