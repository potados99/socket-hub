(async function () {
  const id = await fetchString('/word');

  async function fetchString(url) {
    const response = await fetch(url);
    return await response.text();
  }

  function appendMessage(sender, message) {
    const messages = document.getElementById('messages');

    const item = buildMessage(sender, message);

    messages.appendChild(item);
    messages.scrollTo(0, messages.scrollHeight);
  }

  function buildMessage(sender, message) {
    const item = document.createElement('div');
    const isOutbound = sender === id;

    if (isOutbound) {
      item.className = 'message outbound';
    } else {
      item.className = 'message';

      const senderElement = document.createElement('div');
      senderElement.textContent = sender;
      senderElement.className = 'sender';
      item.appendChild(senderElement);
    }

    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.className = 'message';
    item.appendChild(messageElement);

    const datetimeElement = document.createElement('div');
    datetimeElement.textContent = new Date().toLocaleTimeString();
    datetimeElement.className = 'datetime';
    item.appendChild(datetimeElement);

    return item;
  }

  const socket = io({
    query: {
      id,
      room: 'chat'
    }
  });

  const form = document.getElementById('form');
  const input = document.getElementById('input');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (input.value) {
      socket.emit('chat', {sender: id, message: input.value});
      input.value = '';
    }
  });

  socket.on('chat', ({sender, message}) => {
    appendMessage(sender, message);
  });
})();




