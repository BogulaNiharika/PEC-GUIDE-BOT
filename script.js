const routes = {
  "ai block": "AI Block is near the central library, beside the main entrance.",
  "aiml": "The AIML department is on the 2nd floor of the AI Block.",
  "ece": "ECE department is in Block B, adjacent to the auditorium.",
  "eee": "EEE department is located in Block C, opposite to the canteen.",
  "cse": "CSE is on the first floor of the main academic building.",
  "civil": "The Civil department is in the Civil Block near the workshop area.",
  "mechanical": "Mechanical branch is located in Block D near the sports ground."
};

const guideName = "Pragati Guide Bot";

window.onload = function () {
  const chatbox = document.getElementById("chatbox");
  const welcomeMessage = "Welcome to Pragati College! I will help you with guidance on the routes. 😊";
  addBotMessage(${guideName}: ${welcomeMessage});
  speak(welcomeMessage);

  document.getElementById("userInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      processInput();
    }
  });
};

function processInput() {
  const inputElem = document.getElementById("userInput");
  const input = inputElem.value.toLowerCase().trim();
  const chatbox = document.getElementById("chatbox");
  if (!input) return;

  chatbox.innerHTML += <div class="user-msg"><strong>You:</strong> ${escapeHTML(input)}</div>;

  let reply = "Sorry, I couldn't find info about that. Try asking about a department like 'Where is EEE?'";

  for (const key in routes) {
    if (input.includes(key)) {
      reply = routes[key];
      break;
    }
  }

  addBotMessage(${guideName}: ${reply});
  speak(reply);
  inputElem.value = "";
  chatbox.scrollTop = chatbox.scrollHeight;
}

function addBotMessage(text) {
  document.getElementById("chatbox").innerHTML += <div class="bot-msg"><strong>${guideName}:</strong> ${text.replace(${guideName}:, "").trim()}</div>;
}

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, (match) => {
    const escapeChars = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return escapeChars[match];
  });
}

// 🎤 Voice Input
function startListening() {
  if (!('webkitSpeechRecognition' in window)) {
    alert("Voice input not supported in this browser. Try Google Chrome!");
    return;
  }

  const recognition = new webkitSpeechRecognition();
  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.start();

  recognition.onresult = function (event) {
    const transcript = event.results[0][0].transcript;
    document.getElementById("userInput").value = transcript;
    processInput();
  };

  recognition.onerror = function (event) {
    alert("Voice input error: " + event.error);
  };
}

// 🔊 Voice Output
function speak(text) {
  if (!window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.pitch = 1.05;
  utterance.rate = 0.97;
  utterance.volume = 1;
  synth.cancel();
  synth.speak(utterance);
}