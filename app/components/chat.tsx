"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";
// @ts-expect-error - no types for this yet
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants";
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs";
import { getRoster, getSquads, getPlayerCard } from "../utils/roster";
import { getInventory } from "../utils/inventory";


type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  functionCallHandler?: (
    toolCall: RequiredActionFunctionToolCall
  ) => Promise<string>;
};

const Chat = ({
  functionCallHandler = () => Promise.resolve(""), // default to return empty string
}: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [playerCardData, setPlayerCardData] = useState(null);

  // Fetch conversation history for a specific thread
  const fetchConversationHistory = async (threadId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assistants/threads/${threadId}/messages`);
      const data = await response.json();
      //console.log("Fetched conversation history:", data);

      // Assuming the content is an array with `text` property
      const formattedMessages = (data.data || []).map(msg => ({
        role: msg.role,
        text: msg.content[0]?.text?.value || 'No content',  // Assuming msg.content is an array
      }));

      // Set the fetched messages as the initial message history
      setMessages(formattedMessages.reverse());
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      setLoading(false);
    }
  };

  // automatically scroll to bottom of chat
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // create a new threadID when chat component created
  useEffect(() => {
    const storedThreadId = localStorage.getItem('threadId');
    console.log("Stored thread ID:", storedThreadId);
    const createThread = async () => {
      if (storedThreadId) {
        setThreadId(storedThreadId);
        fetchConversationHistory(storedThreadId);  // Load conversation history
      } else {
        // Create a new thread
        const res = await fetch(`/api/assistants/threads`, {
          method: 'POST',
        });
        const data = await res.json();
        const newThreadId = data.threadId;
  
        setThreadId(newThreadId);
        localStorage.setItem('threadId', newThreadId);  // Store the thread ID in local storage
      }
    };
    createThread();
    fetchPlayerCardData();
  }, []);


  // Fetch player card data
  const fetchPlayerCardData = async () => {
    try {
      setLoading(true);
      const data = await getPlayerCard();
      setPlayerCardData(data);  // Store the player card data in state
      setLoading(false);
    } catch (error) {
      console.error("Error fetching player card data:", error);
      setLoading(false);
    }
  };

  const sendMessage = async (text) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );
    const stream = AssistantStream.fromReadableStream(response.body);
    console.log("Sending message:", text);
    handleReadableStream(stream);

    setMessages(prevMessages => [...prevMessages, { role: "user", text }]);
  };

  const submitActionResult = async (runId, toolCallOutputs) => {
    try {
      const response = await fetch(
        `/api/assistants/threads/${threadId}/actions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            runId: runId,
            toolCallOutputs: toolCallOutputs, // This should be an array of JSON-stringified outputs
          }),
        }
      );
  
      const stream = AssistantStream.fromReadableStream(response.body);
      handleReadableStream(stream);
    } catch (error) {
      console.error("Error submitting action result:", error);
    }
  };
  

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  /* Stream Event Handlers */

  // textCreated - create new assistant message
  const handleTextCreated = () => {
    appendMessage("assistant", "");
  };

  // textDelta - append text to last assistant message
  const handleTextDelta = (delta) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value);
    };
    if (delta.annotations != null) {
      annotateLastMessage(delta.annotations);
    }
  };

  // imageFileDone - show image in chat
  const handleImageFileDone = (image) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`);
  }

  // toolCallCreated - log new tool call
  const toolCallCreated = (toolCall) => {
    if (toolCall.type != "code_interpreter") return;
    appendMessage("code", "");
  };

  // toolCallDelta - log delta and snapshot for the tool call
  const toolCallDelta = (delta, snapshot) => {
    if (delta.type != "code_interpreter") return;
    if (!delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input);
  };

  // handleRequiresAction - handle function call
  const handleRequiresAction = async (
    event: AssistantStreamEvent.ThreadRunRequiresAction
  ) => {

    setLoading(true);
    setStatusMessage("Assistant is thinking...");

    console.log("Received event:", event);
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;
  
    // Loop over tool calls and call the appropriate function handler
    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        console.log("Handling tool call:", toolCall.function);
        setStatusMessage(`Assistant is thinking... (${toolCall.function.name})`);
        // Handle 'get_roster' function call
        if (toolCall.function.name === "get_roster") {
          console.log("Handling 'get_roster' function call");
          setStatusMessage("Fetching roster data...");
          console.log("Tool call arguments:", toolCall.function.arguments);
          const args = JSON.parse(toolCall.function.arguments);
          const rosterData = await getRoster(args.page, args.perPage); // Call your roster function
  
          // Return the proper output object for OpenAI
          return { output: JSON.stringify(rosterData), tool_call_id: toolCall.id };
        } 
        
        if (toolCall.function.name === "get_inventory") {
          console.log("Handling 'get_inventory' function call");
          setStatusMessage("Fetching inventory data...");
          const args = JSON.parse(toolCall.function.arguments);
          const inventoryData = await getInventory({
            page: args.page,
            perPage: args.perPage,
            itemFormat: args.itemFormat,
            statsFormat: args.statsFormat,
            pieceInfo: args.pieceInfo,
            lang: args.lang,
            itemType: args.itemType,
          }); // Call your inventory function
          if (inventoryData.error) {
            appendMessage("assistant", `Error: ${inventoryData.error}`);
            return;
          }
  
          // Return the proper output object for OpenAI
          return { output: JSON.stringify(inventoryData), tool_call_id: toolCall.id };
        }

              // Handle 'get_squads' function call
      if (toolCall.function.name === "get_squads") {
        console.log("Handling 'get_squads' function call");
        setStatusMessage("Fetching squad data...");
        const args = toolCall.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
        console.log("Parsed arguments for squads:", args); 
        const sinceParam = args.hasOwnProperty('since') && args.since !== null ? args.since : null;

        const squadData = await getSquads(sinceParam);
        if (squadData.error) {
          appendMessage("assistant", `Error: ${squadData.error}`);
          return;
        }

        return { output: JSON.stringify(squadData), tool_call_id: toolCall.id };
      }

        // Handle 'get_player_card' function call
        if (toolCall.function.name === "get_player_card") {
          console.log("Handling 'get_player_card' function call");
          setStatusMessage("Fetching player card data...");
          
          const playerCardData = await getPlayerCard(); // Call your player card function
          if (playerCardData.error) {
            appendMessage("assistant", `Error: ${playerCardData.error}`);
            return;
          }
          // Return the proper output object for OpenAI
          return { output: JSON.stringify(playerCardData), tool_call_id: toolCall.id };
        }
        
        // Return a default empty object for any unhandled tool calls
        return { output: JSON.stringify({}), tool_call_id: toolCall.id };
        
      })
    );

    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
    setLoading(false);
    setStatusMessage("");
  };

  // handleRunCompleted - re-enable the input form
  const handleRunCompleted = () => {
    setInputDisabled(false);
  };

  const handleReadableStream = (stream: AssistantStream) => {
    // messages
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);

    // image
    stream.on("imageFileDone", handleImageFileDone);

    // code interpreter
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    // events without helpers yet (e.g. requires_action and run.done)
    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action")
        handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  /*
    =======================
    === Utility Helpers ===
    =======================
  */

  const appendToLastMessage = (text) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
        text: lastMessage.text + text,
      };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role, text) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const annotateLastMessage = (annotations) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = {
        ...lastMessage,
      };
      annotations.forEach((annotation) => {
        if (annotation.type === 'file_path') {
          updatedLastMessage.text = updatedLastMessage.text.replaceAll(
            annotation.text,
            `/api/files/${annotation.file_path.file_id}`
          );
        }
      })
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
    
  }

  return (
    <div className={styles.chatContainer}>
      {loading && <p>Loading..</p>}
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form
        onSubmit={handleSubmit}
        className={`${styles.inputForm} ${styles.clearfix}`}
      >

        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder= {statusMessage ==='' ? "Enter your question" : statusMessage}
        />
        <button
          type="submit"
          className={styles.button}
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
