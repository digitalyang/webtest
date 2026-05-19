const messageForm = document.querySelector("#messageForm");
const messageName = document.querySelector("#messageName");
const messageContent = document.querySelector("#messageContent");
const messagesList = document.querySelector("#messagesList");
const clearMessagesButton = document.querySelector("#clearMessagesButton");
const storageKey = "webtest_guestbook_messages";

function getMessages() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveMessages(messages) {
  localStorage.setItem(storageKey, JSON.stringify(messages));
}

function renderMessages() {
  const messages = getMessages();

  if (messages.length === 0) {
    messagesList.innerHTML = '<p class="empty-state">还没有留言，来写第一条吧。</p>';
    return;
  }

  messagesList.innerHTML = messages.map((message) => `
    <article class="message-item">
      <div class="message-meta">
        <strong>${message.name}</strong>
        <time>${message.time}</time>
      </div>
      <p>${message.content}</p>
    </article>
  `).join("");
}

function escapeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

if (messageForm && messagesList) {
  renderMessages();

  messageForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = escapeText(messageName.value.trim());
    const content = escapeText(messageContent.value.trim());

    if (!name || !content) {
      showToast("请先填写昵称和留言内容。");
      return;
    }

    const messages = getMessages();
    messages.unshift({
      name,
      content,
      time: new Date().toLocaleString("zh-CN", { hour12: false })
    });
    saveMessages(messages.slice(0, 20));
    messageForm.reset();
    renderMessages();
    showToast("留言已保存到当前浏览器。");
  });

  clearMessagesButton.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    renderMessages();
    showToast("本地留言已清空。");
  });
}
