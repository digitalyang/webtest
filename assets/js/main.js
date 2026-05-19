function showToast(message) {
  const toast = document.querySelector("#toast");

  if (!toast) {
    return;
  }

  clearTimeout(window.webtestToastTimer);
  toast.textContent = message;
  toast.classList.add("show");
  window.webtestToastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}

function setupTestButtons() {
  document.querySelectorAll("[data-toast]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast(button.dataset.toast);
    });
  });
}

setupTestButtons();
