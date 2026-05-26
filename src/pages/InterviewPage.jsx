import React, { useState, useEffect, useRef } from "react";
import ChatBox from "../components/ChatBox";
import RoleSelector from "../components/RoleSelector";
import { sendInterviewMessage } from "../api/api";

export default function InterviewPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [role, setRole] = useState("Frontend Developer");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("role");
  const [listening, setListening] = useState(false);

  const bottomRef = useRef(null);
  const videoRef = useRef(null);
  const recognitionRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);

  // 🔥 CLEAN FUNCTION (single source of truth)
  const cleanText = (text) => {
    return text
      .replace(/📌.*?\n/g, "")
      .replace(/⚡.*?\n/g, "")
      .replace(/🚀.*?\n/g, "")
      .replace(/•/g, "")
      .replace(/Definition:|Key Points:|Use Case:/gi, "")
      .split("\n")
      .filter((line) => {
        const t = line.trim().toLowerCase();

        if (t.split(" ").length <= 3) return false;
        if (t.includes("key point")) return false;
        if (t.includes("used in real-world")) return false;
        if (t.includes("application")) return false;

        return true;
      })
      .join("\n")
      .replace(/\n{2,}/g, "\n")
      .trim();
  };

  // 🔽 Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🎥 CAMERA
  useEffect(() => {
    if (step !== "interview") return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
          };
        }
      } catch (err) {
        console.error("Camera error:", err);
      }
    };

    startCamera();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [step]);

  // 🎤 Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];

      if (!result.isFinal || isProcessingRef.current) return;

      isProcessingRef.current = true;

      const text = result[0].transcript;
      setInput(text);

      sendMessage(text);

      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    };

    recognitionRef.current = recognition;
  }, []);

  const speak = (text) => {
    if (!window.speechSynthesis) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

   window.speechSynthesis.cancel(); // stop previous
setTimeout(() => {
  window.speechSynthesis.speak(utterance);
}, 100);
  };

  const startListening = () => recognitionRef.current?.start();
  const stopListening = () => recognitionRef.current?.stop();

  // 🚀 Start Interview
  const startInterview = async () => {
    setStep("interview");
    setLoading(true);

    try {
      const data = await sendInterviewMessage({
        role,
       message: `
Start a REAL ${role} interview.

Rules:
- Ask ONLY ONE question
- DO NOT explain anything
- DO NOT give answers
- DO NOT give hints
- Just ask the question like a real interviewer

Example:
"Explain Virtual DOM in React"
`,
        history: [],
      });

      setMessages([{ role: "assistant", content: cleanText(data.reply) }]);
      const cleaned = cleanText(data.reply);
speak(cleaned);
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  // 💬 Send Message
  const sendMessage = async (customInput) => {
    if (step !== "interview") return;

    const text = customInput || input;
    if (!text.trim()) return;

    const userMsg = { role: "user", content: text };

    setInput("");
    setLoading(true);

    setMessages((prev) => {
      const updated = [...prev, userMsg];
      handleAIResponse(updated, text);
      return updated;
    });
  };

 const handleAIResponse = async (updatedMessages, text) => {
  try {
    let finalMessage = "";

    const lower = text.trim().toLowerCase();

    // ✅ skip logic
    if (lower.includes("next") || lower.includes("skip")) {
      finalMessage = `
Candidate skipped the question.

Do NOT explain the previous answer.
Just ask a new interview question.
`;
    } else {
      finalMessage = `
Candidate answer: ${text}

Your task:
1. Give feedback in 2-3 lines
2. Mention what is missing (1 line)
3. Do NOT give full solution
4. Then ask NEXT question
`;
    }

    // 🔥 THIS WAS MISSING
    const data = await sendInterviewMessage({
      role,
      message: finalMessage,
      history: updatedMessages,
    });

    const cleaned = cleanText(data.reply);

    const aiMsg = {
      role: "assistant",
      content: cleaned,
    };

    speak(cleaned);

    setMessages((prev) => [...prev, aiMsg]);
  } catch (err) {
    console.error(err);
  }

  setLoading(false);
};

return (
  <div className="h-screen flex flex-col bg-black text-white relative overflow-hidden">

    {/* 🌌 BACKGROUND */}
    <div className="absolute inset-0 -z-10">
      <div className="absolute top-1/3 left-1/2 w-[600px] h-[600px] bg-pink-500/20 blur-[120px] rounded-full -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-500/20 blur-[120px] rounded-full"></div>
    </div>

    {/* HEADER */}
    <div className="p-4 border-b border-white/10 flex justify-between items-center backdrop-blur-md bg-black/30">
      <h1 className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
        AI Interview
      </h1>
    </div>

    {/* MAIN */}
    <div className="flex-1 flex flex-col">

      {step === "role" && (
        <div className="flex flex-col items-center justify-center flex-1 gap-8">
          <h2 className="text-5xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            Crack Interviews with AI
          </h2>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-6 rounded-2xl">
            <RoleSelector role={role} setRole={setRole} />
          </div>

          <button
            onClick={startInterview}
            className="px-10 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:scale-105 transition"
          >
            Get Started
          </button>
        </div>
      )}

      {step === "interview" && (
        <>
          {/* 🎯 CENTER SECTION */}
          <div className="flex-1 flex flex-col justify-center items-center px-4">

            <div className="w-full max-w-6xl flex gap-8 items-center">

              {/* CAMERA */}
              <div className="w-72 backdrop-blur-xl bg-white/5 border border-white/10 p-3 rounded-2xl shadow-lg">
                <p className="text-gray-400 mb-2">You</p>

                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-48 object-cover rounded-lg bg-black"
                />
              </div>

              {/* CHAT */}
              <div className="flex-1 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl flex flex-col shadow-lg max-h-[60vh]">

                <p className="text-sm text-gray-400 p-4 border-b border-white/10">
                  🎯 Mock Interview ({role})
                </p>

                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  <ChatBox messages={messages} />

                  {loading && (
                    <p className="text-gray-400 animate-pulse">
                      🤖 Thinking...
                    </p>
                  )}

                  <div ref={bottomRef}></div>
                </div>

              </div>

            </div>
          </div>

          {/* 💬 INPUT (NOT STUCK TO BOTTOM NOW) */}
          <div className="pb-10 pt-4 flex justify-center">

            <div className="flex gap-3 w-full max-w-3xl">

              <input
                className="flex-1 p-3 bg-white/5 border border-white/10 rounded-xl outline-none text-white placeholder-gray-400 focus:border-pink-500 transition"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Answer like a pro..."
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              />

              <button
                onClick={listening ? stopListening : startListening}
                disabled={loading}
                className={`px-4 rounded-xl transition ${
                  listening
                    ? "bg-red-500 animate-pulse"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                🎤
              </button>

              <button
                onClick={() => sendMessage()}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 transition"
              >
                ➤
              </button>

            </div>
          </div>
        </>
      )}
    </div>
  </div>
);}