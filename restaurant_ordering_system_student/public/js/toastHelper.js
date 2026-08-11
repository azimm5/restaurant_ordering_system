function showToast(message, redirectUrl = null, reloadFn = null, style = 'success') {
  // Show toast for 3 seconds
  const toastElement = document.getElementById('successToast');
  const toastBody = document.getElementById('toastMessage');

  // Reset classes to a clean base
  toastElement.className = 'toast align-items-center border-0';

  // Apply style
  if (style === 'warning') {
    toastElement.classList.add('text-dark', 'bg-warning');
  } else {
    toastElement.classList.add('text-white', 'bg-success');
  }

  // Inject message
  toastBody.textContent = message;

  const toast = new bootstrap.Toast(toastElement, { delay: 2000 });
  toast.show();

  // perform action
  setTimeout(() => {
    if (redirectUrl) {
      window.location.href = redirectUrl;
    } else if (typeof reloadFn === 'function') {
      reloadFn(); // e.g. fetchMyFeedback()
    }
  }, 2000);
}