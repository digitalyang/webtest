const messageForm = document.querySelector("#messageForm");
const messageName = document.querySelector("#messageName");
const messageContent = document.querySelector("#messageContent");
const messagesList = document.querySelector("#messagesList");
const clearMessagesButton = document.querySelector("#clearMessagesButton");
const messagesApi = "/api/messages";

function escapeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderMessages(messages) {
  if (messages.length === 0) {
    messagesList.innerHTML = '<p class="empty-state">还没有留言，来写第一条吧。</p>';
    return;
  }

  messagesList.innerHTML = messages.map((message) => `
    <article class="message-item">
      <div class="message-meta">
        <strong>${escapeText(message.name)}</strong>
        <time>${escapeText(message.time)}</time>
      </div>
      <p>${escapeText(message.content)}</p>
    </article>
  `).join("");
}

async function loadMessages() {
  messagesList.innerHTML = '<p class="empty-state">正在加载留言...</p>';

  try {
    const response = await fetch(messagesApi);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "留言加载失败。");
    }

    renderMessages(data.messages || []);
  } catch (error) {
    messagesList.innerHTML = `<p class="empty-state">${escapeText(error.message)}</p>`;
  }
}

if (messageForm && messagesList) {
  loadMessages();

  messageForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const name = messageName.value.trim();
    const content = messageContent.value.trim();

    if (!name || !content) {
      showToast("请先填写昵称和留言内容。");
      return;
    }

    try {
      const response = await fetch(messagesApi, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, content })
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "留言发布失败。");
      }

      messageForm.reset();
      showToast("留言发布成功。");
      await loadMessages();
    } catch (error) {
      showToast(error.message);
    }
  });

  clearMessagesButton.addEventListener("click", () => {
    showToast("公开留言不能在前端直接清空。");
  });
}
