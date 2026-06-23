  function showToast(message, redirectUrl = null, reloadFn = null) {
    // Inject backend message
    document.getElementById('toastMessage').textContent = message;

    // Show toast for 3 seconds
    const toastElement = document.getElementById('successToast');
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