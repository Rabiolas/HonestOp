document.addEventListener('DOMContentLoaded', function () {
  const questionId = window.location.pathname.split('/').pop();

  fetch(`/api/question/${questionId}`)
    .then(r => r.json())
    .then(data => {
      const h = document.getElementById('questionText');
      h.innerText = data.question || 'Question not found.';
    });

  document.getElementById('submitButton').addEventListener('click', function () {
    const box = document.getElementById('opinionBox');
    const opinion = (box.value || '').trim();
    if (!opinion) {
      alert('Please write something first.');
      return;
    }

    fetch(`/api/submit-opinion/${questionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opinion })
    })
    .then(response => {
      if (response.ok) {
        alert('Opinion submitted successfully! Thank you.');
        box.value = '';
      } else {
        alert('Failed to submit opinion. Please try again.');
      }
    })
    .catch(() => alert('Network error submitting opinion.'));
  });
});
