import bot from './assets/doctorsahab.svg'
import user from './assets/pregnant_lady_adobe_express.svg'

const form = document.querySelector('form')
const chatContainer = document.querySelector('#chat_container')

let loadInterval

function loader(element) {
    element.textContent = ''

    loadInterval = setInterval(() => {
        // Update the text content of the loading indicator
        element.textContent += '.';

        // If the loading indicator has reached three dots, reset it
        if (element.textContent === '....') {
            element.textContent = '';
        }
    }, 300);
}

function typeText(element, text) {
    let index = 0

    let interval = setInterval(() => {
        if (index < text.length) {
            element.innerHTML += text.charAt(index)
            index++
        } else {
            clearInterval(interval)
        }
    }, 20)
}

// generate unique ID for each message div of bot
// necessary for typing text effect for that specific reply
// without unique ID, typing text will work on every element
function generateUniqueId() {
    const timestamp = Date.now();
    const randomNumber = Math.random();
    const hexadecimalString = randomNumber.toString(16);

    return `id-${timestamp}-${hexadecimalString}`;
}

function chatStripe(isAi, value, uniqueId) {
    return (
        `
        <div class="wrapper ${isAi && 'ai'}">
            <div class="chat">
                <div class="profile">
                    <img 
                      src=${isAi ? bot : user} 
                      alt="${isAi ? 'bot' : 'user'}" 
                    />
                </div>
                <div class="message" id=${uniqueId}>${value}</div>
            </div>
        </div>
    `
    )
}

const handleSubmit = async (e) => {
    e.preventDefault()

    const data = new FormData(form)

    // user's chatstripe
    chatContainer.innerHTML += chatStripe(false, data.get('prompt'))

    // to clear the textarea input 
    form.reset()

    // bot's chatstripe
    const uniqueId = generateUniqueId()
    chatContainer.innerHTML += chatStripe(true, " ", uniqueId)

    // to focus scroll to the bottom 
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // specific message div 
    const messageDiv = document.getElementById(uniqueId)

    // messageDiv.innerHTML = "..."
    loader(messageDiv)

    const response = await fetch('https://mamta-cj8n.onrender.com/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: data.get('prompt')
        })
    })

    clearInterval(loadInterval)
    messageDiv.innerHTML = " "

    if (response.ok) {
        const data = await response.json();
        const parsedData = data.bot.trim() // trims any trailing spaces/'\n' 

        typeText(messageDiv, parsedData)
    } else {
        const err = await response.text()

        messageDiv.innerHTML = "Something went wrong"
        alert(err)
    }
}

form.addEventListener('submit', handleSubmit)
form.addEventListener('keyup', (e) => {
    if (e.keyCode === 13) {
        handleSubmit(e)
    }
})

// const startButton = document.getElementById('micButton');
// const textarea = document.querySelector('prompt');

// const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
// const recognition = new SpeechRecognition();

// let isRecording = false; // Track the recording state

// recognition.continuous = true; // Keeps listening even if the user pauses

// recognition.onresult = (event) => {
//   const transcript = event.results[event.results.length - 1][0].transcript;
//   console.log('Recognized Speech:', transcript);
//   textarea.value = transcript;
// };

// startButton.addEventListener('click', () => {
//   if (!isRecording) {
//     recognition.start();
//     isRecording = true;
//     startButton.classList.add('active'); // Add a CSS class to indicate active state
//     startButton.querySelector('img').src = 'assets/mic2.svg'; // Change the image source
//   } else {
//     recognition.stop();
//     isRecording = false;
//     startButton.classList.remove('active'); // Remove the CSS class
//     startButton.querySelector('img').src = 'assets/mic.svg'; // Change the image source back to the original
//   }
// });

// Check for browser compatibility
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
    // Create a new SpeechRecognition object
    var recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
  
    // Set the recognition language
    recognition.lang = 'en-US';
  
    // Set interim results to improve responsiveness
    recognition.interimResults = true;
  
    // Define the event handlers for the recognition events
    recognition.onstart = function () {
      console.log('Speech recognition started...');
    };
  
    recognition.onresult = function (event) {
      var result = event.results[event.results.length - 1];
      var transcript = result[0].transcript;
      var confidence = result[0].confidence;
  
      // Display the result in the textarea
      var textarea = document.querySelector('textarea[name="prompt"]');
      textarea.value = transcript;
    };
  
    recognition.onerror = function (event) {
      console.error('Speech recognition error:', event.error);
    };
  
    recognition.onend = function () {
      console.log('Speech recognition ended.');
  
      // Add a small delay before sending the input
      setTimeout(function () {
        // Automatically click the send button
        var sendButton = document.querySelector('button[type="submit"]');
        sendButton.click();
      }, 1000); // 500ms delay
    };
  
    // Start or stop the recognition when the microphone button is clicked
    var isRecognizing = false;
    document.getElementById('micButton').addEventListener('click', function () {
      if (!isRecognizing) {
        recognition.start();
        isRecognizing = true;
      } else {
        recognition.stop();
        isRecognizing = false;
      }
    });
  } else {
    console.error('Speech recognition not supported.');
  }
  