(async function () {
  const id = await fetchString('/word');
  const room = 'chat';
  const chunkSize = 4000;

  const files = {};

  const socket = io({
    query: {
      id,
      room
    }
  });

  async function fetchString(url) {
    const response = await fetch(url);
    return await response.text();
  }

  function appendMessage(sender, message) {
    const messages = document.getElementById('messages');

    const item = buildMessage(sender, message);

    messages.appendChild(item);
    messages.scrollTo(0, messages.scrollHeight);

    return item;
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
    messageElement.className = 'message-content';
    item.appendChild(messageElement);

    const datetimeElement = document.createElement('div');
    datetimeElement.textContent = new Date().toLocaleTimeString();
    datetimeElement.className = 'datetime';
    item.appendChild(datetimeElement);

    return item;
  }

  function appendNotice(notice) {
    const messages = document.getElementById('messages');

    const item = buildNotice(notice);

    messages.appendChild(item);
    messages.scrollTo(0, messages.scrollHeight);

    return item;
  }

  function buildNotice(notice) {
    const item = document.createElement('div');
    item.className = 'notice';

    const noticeElement = document.createElement('div');
    noticeElement.textContent = notice;
    noticeElement.className = 'notice-content';
    item.appendChild(noticeElement);

    const datetimeElement = document.createElement('div');
    datetimeElement.textContent = new Date().toLocaleTimeString();
    datetimeElement.className = 'datetime';
    item.appendChild(datetimeElement);

    return item;
  }

  function sendFiles(files) {
    for (const file of files) {
      sendFile(file);
    }
  }

  function uuid() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }

  function sendFile(file) {
    const fileId = uuid();
    const message = appendMessage(id, `${file.name}`);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const payload = e.target.result;

      await socket.emitWithAck('chat-file', {
        type: 'file-header',
        name: file.name,
        mime: file.type,
        size: payload.length,
        sender: id,
        fileId: fileId
      });

      const chunks = splitString(payload, chunkSize);

      console.log(`${chunks.length} chunks.`);

      let seq = 0;
      let sent = 0;

      for (const chunk of chunks) {
        await socket.emitWithAck('chat-file', {
          type: 'file-body',
          seq: seq,
          chunk: chunk,
          sender: id,
          fileId: fileId
        });

        sent += chunk.length;

        const progress = 100 * sent / payload.length;

        message.querySelector('div.message-content').textContent = `${file.name} (${progress.toFixed(2)}%)`;
        seq++;
      }

      message.querySelector('div.message-content').textContent = `${file.name}`;
    };
    reader.readAsDataURL(file);

    console.log('Reading file...');
  }

  function splitString(str, N) {
    const arr = [];

    for (let i = 0; i < str.length; i += N) {
      arr.push(str.substring(i, i + N));
    }

    return arr;
  }

  function ondrop(ev) {
    console.log("File(s) dropped");

    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();

    const files = [];

    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      [...ev.dataTransfer.items].forEach((item, i) => {
        // If dropped items aren't files, reject them
        if (item.kind === "file") {
          const file = item.getAsFile();
          files.push(file);
          console.log(`… file[${i}].name = ${file.name}`);
        }
      });
    } else {
      // Use DataTransfer interface to access the file(s)
      [...ev.dataTransfer.files].forEach((file, i) => {
        files.push(file);
        console.log(`… file[${i}].name = ${file.name}`);
      });
    }

    sendFiles(files);
  }

  function ondragover(ev) {
    ev.preventDefault();
  }

  function initialize() {
    const form = document.getElementById('form');
    const input = document.getElementById('input');
    const messages = document.getElementById('messages');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (input.value) {
        socket.emit('chat', {sender: id, message: input.value});
        input.value = '';
      }
    });

    socket.on('chat-notice', (notice) => {
      appendNotice(notice);
    });

    socket.on('chat', ({sender, message}) => {
      appendMessage(sender, message);
    });

    socket.on('chat-file', (message, callback) => {
      const {type} = message;

      switch (type) {
        case 'file-header': {
          const {name, size, sender, fileId} = message;
          const messageElement = appendMessage(sender, name);
          files[fileId] = {name, size, received: 0, lastSeq: -1, chunks: [], messageElement};
          break;
        }
        case 'file-body': {
          const {seq, chunk, fileId} = message;

          const currentFile = files[fileId];

          if (seq - currentFile.lastSeq > 1) {
            console.error(`missing message! sequence ${currentFile.lastSeq + 1}~${seq - 1} is dropped!`);
          }

          currentFile.chunks.push(chunk);
          currentFile.received += chunk.length;
          currentFile.lastSeq = seq;

          const progress = 100 * currentFile.received / currentFile.size;

          currentFile.messageElement.querySelector('div.message-content').textContent = `${currentFile.name} (${progress.toFixed(2)}%)`;

          if (currentFile.received === currentFile.size) {
            currentFile.messageElement.querySelector('div.message-content').innerHTML = `<a download="${currentFile.name}" href="${currentFile.chunks.join('')}">${currentFile.name}</a>`;

            console.log('receive succeeded');
          }

          break;
        }
      }

      callback('got it');
    });

    form.ondrop = ondrop;
    form.ondragover = ondragover;

    messages.ondrop = ondrop;
    messages.ondragover = ondragover;
  }

  initialize();
})();




