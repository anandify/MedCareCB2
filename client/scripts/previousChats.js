// src/scripts/previousChats.js

export function initializePreviousChats() {
    // Simulated previous chats (this should ideally come from a server or local storage)
    const previousChats = [
        { message: 'How do I manage morning sickness?', timestamp: '2024-06-01 10:00' },
        { message: 'What foods should I avoid during pregnancy?', timestamp: '2024-06-02 14:30' },
        { message: 'When should I see a doctor?', timestamp: '2024-06-03 09:15' }
    ];
    
    let chatList = '<h2>Previous Chats</h2><ul>';
    previousChats.forEach(chat => {
        chatList += `<li><strong>${chat.timestamp}:</strong> ${chat.message}</li>`;
    });
    chatList += '</ul>';
    
    return chatList;
}
