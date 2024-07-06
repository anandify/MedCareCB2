// src/scripts/utils.js

// Display a loading animation with dots
export function displayLoader(element) {
    element.textContent = '';
    let loadInterval = setInterval(() => {
        element.textContent += '.';
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
    return loadInterval; // Return the interval ID for later use
}

// Remove the loading animation by clearing the interval
export function removeLoader(element, intervalId) {
    clearInterval(intervalId); // Stop the loading animation
    element.textContent = ''; // Clear the text content
}

// Simulate typing effect for a message
export function typeText(element, text) {
    let index = 0;
    const interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index);
            index++;
        } else {
            clearInterval(interval);
        }
    }, 20);
}
