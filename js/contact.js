(() => {
  const endpoint = 'https://cezmcskxx2.execute-api.us-east-1.amazonaws.com/contact';

  for (const form of document.querySelectorAll('[data-contact-form]')) {
    const button = form.querySelector('button[type="submit"]');
    const status = form.querySelector('[role="status"]');

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const fields = new FormData(form);
      const payload = Object.fromEntries(fields.entries());
      button.disabled = true;
      button.textContent = 'Sending…';
      status.textContent = '';
      status.classList.remove('contact-form__status--error');

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'The message could not be sent. Please try again.');
        form.reset();
        status.textContent = result.message;
      } catch (error) {
        status.textContent = error.message || 'The message could not be sent. Please try again.';
        status.classList.add('contact-form__status--error');
      } finally {
        button.disabled = false;
        button.textContent = 'Send message';
      }
    });
  }
})();
