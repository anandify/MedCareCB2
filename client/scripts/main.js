// src/scripts/main.js

import { displayWelcomeMessage } from './chat.js';
import { initializeLogin } from './login.js';
import { initializePreviousChats } from './previousChats.js';
import { initializeDocuments } from './documents.js';
import { displayLoader, removeLoader, typeText } from './utils.js'; // Import the functions

// Function to update menu content dynamically
function updateMenuDetails(section) {
    let content = '';
    switch (section) {
        case 'login':
            content = initializeLogin();
            break;
        case 'previousChats':
            content = initializePreviousChats();
            break;
        case 'documents':
            content = initializeDocuments();
            break;
        case 'about':
            content = '<h2>About</h2><p>About the application...</p>';
            break;
    }
    document.getElementById('menuDetails').innerHTML = content;
}

// Event listeners for menu interactions
document.getElementById('loginBtn').addEventListener('click', () => updateMenuDetails('login'));
document.getElementById('previousChatsBtn').addEventListener('click', () => updateMenuDetails('previousChats'));
document.getElementById('documentsBtn').addEventListener('click', () => updateMenuDetails('documents'));
document.getElementById('aboutBtn').addEventListener('click', () => updateMenuDetails('about'));

// Initialize welcome message
displayWelcomeMessage();

// Handling chat form submission
const form = document.querySelector('form');
const chatContainer = document.querySelector('#chat_container');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = new FormData(form);
    chatContainer.innerHTML += chatStripe(false, data.get('prompt'));

    form.reset();

    const uniqueId = generateUniqueId();
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId);

    chatContainer.scrollTop = chatContainer.scrollHeight;

    const messageDiv = document.getElementById(uniqueId);
    const intervalId = displayLoader(messageDiv);

    try {
        const response = await fetch('https://mamta-y6aj.onrender.com/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: data.get('prompt')
            })
        });

        removeLoader(messageDiv, intervalId);
        messageDiv.innerHTML = " ";

        if (response.ok) {
            const responseData = await response.json();
            const parsedData = responseData.bot.trim();
            typeText(messageDiv, parsedData);
        } else {
            const err = await response.text();
            messageDiv.innerHTML = "Something went wrong";
            alert(err);
        }
    } catch (error) {
        removeLoader(messageDiv, intervalId);
        messageDiv.innerHTML = "Something went wrong";
        console.error('Error:', error);
    }
});

form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e);
    }
});
