// src/scripts/chat.js

import bot from '../assets/doctorsahab.svg';
import user from '../assets/pregnant_lady_adobe_express.svg';
import { displayLoader, removeLoader, typeText } from './utils.js'; // Import the functions

// Display a welcome message
export async function displayWelcomeMessage() {
    const welcomeMessages = [
        "👋 Hi there! Welcome to Mamta! How can I assist you today?",
        "👋 Hi, I'm Mamta, your personalized pregnancy assistant, Ask me anything!",
        "👋 Hi there! Mamta is here to assist you with your pregnancy questions. Feel free to ask!",
        "🌸 Hello! Welcome to Mamta. Let me know how I can help you with your pregnancy journey.",
    ];
    const welcomeMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    const chatContainer = document.querySelector('#chat_container');
    const uniqueId = generateUniqueId();
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId);
    const messageDiv = document.getElementById(uniqueId);
    const intervalId = displayLoader(messageDiv);

    setTimeout(() => {
        removeLoader(messageDiv, intervalId); // Clear the loader after 2.5 seconds
        typeText(messageDiv, welcomeMessage);
    }, 2500);
}

// Generate a unique ID for each message div
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    return `id-${timestamp}-${randomNumber.toString(16)}`;
}

// Create the chat message element
function chatStripe(isAi, value, uniqueId) {
    return (
        `<div class="wrapper ${isAi ? 'ai' : ''}">
            <div class="chat">
                <div class="profile">
                    <img src=${isAi ? bot : user} alt="${isAi ? 'bot' : 'user'}" />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>`
    );
}
