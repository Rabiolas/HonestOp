document.addEventListener('DOMContentLoaded', function () {
  const questionId = window.location.pathname.split('/').pop();

  // show the question text
  fetch(`/api/question/${questionId}`)
    .then(r => r.ok ? r.json() : Promise.reject(new Error('Failed to load question')))
    .then(data => {
      if (data && data.question) {
        document.getElementById('summaryQuestion').innerText = data.question;
      }
    })
    .catch(() => { /* non-fatal */ });

  document.getElementById('getSummaryButton').addEventListener('click', async function () {
    const box = document.getElementById('summaryContent');
    box.innerText = 'Generating summary...';

    try {
      const res = await fetch(`/api/summarize/${questionId}`);
      if (!res.ok) {
        const text = await res.text(); // backend might send HTML on error
        box.innerText = `Error: ${text || 'Failed to generate summary.'}`;
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (data.summary) {
        box.innerText = data.summary;
      } else if (data.error) {
        box.innerText = `Error: ${data.error}`;
      } else {
        box.innerText = 'Not enough opinions to generate a summary.';
      }
    } catch (e) {
      box.innerText = 'Network error generating summary.';
    }
  });
});
