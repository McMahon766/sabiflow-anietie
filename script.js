// ======================
// CONFIG – CHANGE THIS
// ======================
const N8N_WEBHOOK_URL = "https://mcparvenu-n8n-thota1.hf.space/webhook-test/voice-complaint"; 
// ↑ Put your production webhook URL here


// ======================
// Elements
// ======================
const recordBtn = document.getElementById("recordBtn");
const btnText = document.getElementById("btn-text");
const statusText = document.getElementById("status-text");
const agentMessage = document.getElementById("agent-message");
const resultCard = document.getElementById("result-card");
const queueSection = document.getElementById("queue-section");
const taskQueue = document.getElementById("task-queue");

let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ======================
// Anietie Lines
// ======================
const lines = {
  greeting: "Hello, I’m Anietie. Tell me what’s going on and I’ll make sure the right team handles it.",
  processing: "I’m listening carefully… just a moment while I route this for you.",
  confirmation: "All done. I’ve created a ticket and sent it to the right team. Here’s the summary."
};

// ======================
// Recording Logic
// ======================
recordBtn.addEventListener("click", async () => {
  if (!isRecording) {
    startRecording();
  } else {
    stopRecording();
  }
});

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      audioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      sendToN8n(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;

    recordBtn.classList.add("recording");
    btnText.textContent = "Stop Recording";
    statusText.textContent = "Listening…";
    agentMessage.textContent = lines.greeting;
  } catch (err) {
    statusText.textContent = "Microphone access denied";
    console.error(err);
  }
}

function stopRecording() {
  mediaRecorder.stop();
  isRecording = false;

  recordBtn.classList.remove("recording");
  recordBtn.disabled = true;
  btnText.textContent = "Processing…";
  statusText.textContent = "Sending to Anietie…";
  agentMessage.textContent = lines.processing;
}

// ======================
// Send to n8n
// ======================
async function sendToN8n(audioBlob) {
  const formData = new FormData();
  formData.append("data", audioBlob, "complaint.webm"); // field name must match what n8n expects

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      body: formData
    });

    const result = await response.json();
    showResult(result);
  } catch (err) {
    statusText.textContent = "Something went wrong. Please try again.";
    recordBtn.disabled = false;
    btnText.textContent = "Start Recording";
    console.error(err);
  }
}

// ======================
// Display Result
// ======================
function showResult(data) {
  agentMessage.textContent = lines.confirmation;
  statusText.textContent = "";
  recordBtn.disabled = false;
  btnText.textContent = "Start Recording";

  // Fill result card
  document.getElementById("task-id").textContent = data.task_id || "—";
  document.getElementById("category").textContent = data.intent?.category || "—";
  document.getElementById("priority").textContent = data.action_taken?.priority || "—";
  document.getElementById("routed-to").textContent = data.action_taken?.routed_to || "—";
  document.getElementById("transcript").textContent = data.transcript || "—";

  resultCard.classList.remove("hidden");

  // Show queue if available
  if (data.task_queue && data.task_queue.length > 0) {
    taskQueue.innerHTML = "";
    data.task_queue.forEach(task => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${task.task_id} • ${task.category}</span>
        <span>${task.priority}</span>
      `;
      taskQueue.appendChild(li);
    });
    queueSection.classList.remove("hidden");
  }
}
