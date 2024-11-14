// Event listener for adding a new keyword with optional expiration
function toggleTimeInputs() {
  const enableExpirationCheckbox = document.getElementById('enableTime');
  const timeInputs = document.getElementById('timeInputs');
  timeInputs.style.display = enableExpirationCheckbox.checked ? 'block' : 'none';
}
document.addEventListener('DOMContentLoaded', () => {
    const blockImagesCheckbox = document.getElementById('blockImagesCheckbox');
  
    if (blockImagesCheckbox) {
        // Set initial state from storage
        chrome.storage.sync.get(['blockImages'], (data) => {
            blockImagesCheckbox.checked = data.blockImages || false;
        });
  
        // Listen for changes to the checkbox
        blockImagesCheckbox.addEventListener('change', (event) => {
            const isChecked = event.target.checked;
  
            // Save the new state in chrome.storage
            chrome.storage.sync.set({ blockImages: isChecked });
        });
    }
  });
  const voiceCommandButton = document.getElementById('voiceCommand');
  const keywordInput = document.getElementById('keywordInput');
  let recognition;
  let recognizing = false;
  
  // Function to initiate speech synthesis (computer speaks)
  function speak(text, callback) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = callback; // Start recognition after speech ends
      window.speechSynthesis.speak(utterance);
  }
  
  if ('webkitSpeechRecognition' in window) {
      recognition = new webkitSpeechRecognition();
      recognition.lang = 'en-US';
      recognition.continuous = false;
      recognition.interimResults = true; // Enable interim results to show partial text
  
      // Start listening when the button is clicked
      voiceCommandButton.addEventListener('click', () => {
          if (recognizing) {
              recognition.stop();
              recognizing = false;
              voiceCommandButton.textContent = '🎤 voice ';
          } else {
              // Speak "Please say keyword to add" before starting recognition
              speak("Please say keyword to add", () => {
                  recognition.start();
                  recognizing = true;
                  voiceCommandButton.textContent = '🛑 Stop ';
                  keywordInput.value = ''; // Clear the input field when starting
              });
          }
      });
  
      // Handle speech recognition interim results
      recognition.onresult = function(event) {
          let interimText = '';
          let finalText = '';
  
          // Collect interim and final results
          for (let i = 0; i < event.results.length; i++) {
              if (event.results[i].isFinal) {
                  finalText += event.results[i][0].transcript;
              } else {
                  interimText += event.results[i][0].transcript;
              }
          }
  
          // Display interim text in the input field
          keywordInput.value = finalText + interimText;
  
          // Once recognition is final, add the keyword
          if (finalText) {
              addKeyword(finalText.trim()); // Add the final recognized keyword
              alert(`Added keyword: ${finalText.trim()}`); // Optional: Alert user
              recognizing = false;
              voiceCommandButton.textContent = '🎤 voice ';
              keywordInput.value = ''; // Clear input field after adding
          }
      };
  
      // Handle recognition errors
      recognition.onerror = function(event) {
          console.error('Speech recognition error:', event.error);
          recognizing = false;
          voiceCommandButton.textContent = '🎤 Voice ';
      };
  
      recognition.onend = function() {
          recognizing = false;
          voiceCommandButton.textContent = '🎤 Voice';
      };
  } else {
      console.warn("Speech Recognition not supported in this browser.");
      voiceCommandButton.disabled = true;
      voiceCommandButton.textContent = "Voice Command Not Supported";
  }
  


document.getElementById('enableTime').addEventListener('change', toggleTimeInputs);

document.getElementById('addKeyword').addEventListener('click', function() {
  let newKeyword = document.getElementById('keywordInput').value.trim();
  let hours = parseInt(document.getElementById('blockHours').value.trim()) || 0;
  let minutes = parseInt(document.getElementById('blockMinutes').value.trim()) || 0;
  let seconds = parseInt(document.getElementById('blockSeconds').value.trim()) || 0;

  if (newKeyword) {
      chrome.storage.sync.get({ keywords: [] }, function(data) {
          let keywords = data.keywords;

          // Check for duplicates
          if (!keywords.some(item => item.keyword === newKeyword)) {
              let expirationTime = null;

              // Calculate expiration time if any time is given
              if (hours || minutes || seconds) {
                  let currentTime = new Date().getTime();
                  let expirationDuration = (hours * 3600 + minutes * 60 + seconds) * 1000;
                  expirationTime = currentTime + expirationDuration;
              }

              // Push the keyword and expiration time into the array
              keywords.push({ 
                  keyword: newKeyword, 
                  expirationTime: expirationTime 
              });

              // Save to storage
              chrome.storage.sync.set({ keywords: keywords }, function() {
                  displayKeywords(keywords);
                  document.getElementById('keywordInput').value = ''; // Clear input
                  document.getElementById('blockHours').value = ''; // Clear hours
                  document.getElementById('blockMinutes').value = ''; // Clear minutes
                  document.getElementById('blockSeconds').value = ''; // Clear seconds
              });
          } else {
              alert('Keyword already exists.');
          }
      });
  }
});

// Function to display keywords in the list
function displayKeywords(keywords) {
  let keywordList = document.getElementById('keywordList');
  keywordList.innerHTML = ''; // Clear existing list

  let currentTime = Date.now(); 

  keywords.forEach((item, index) => {
    
      if (item.expirationTime && currentTime > item.expirationTime) {
          removeKeyword(index); // Remove expired keyword
      } else {
          let keywordItem = document.createElement('li');
          let keywordText = document.createElement('span');
          keywordText.textContent = item.keyword; // Access the keyword property

          // Show expiration time if it exists
          if (item.expirationTime) {
              let timeRemaining = item.expirationTime - currentTime;
              let hours = Math.floor(timeRemaining / (1000 * 60 * 60));
              let minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
              let seconds = Math.floor((timeRemaining % (1000 * 60)) / 1000);

              keywordText.textContent += ` (Expires in ${hours}h ${minutes}m ${seconds}s)`;
          }

          // Remove button for each keyword
          let removeBtn = document.createElement('button');
          removeBtn.classList.add('remove-btn');
          removeBtn.innerHTML = '&times;';
          removeBtn.addEventListener('click', function() {
              removeKeyword(index);
          });

          keywordItem.appendChild(keywordText);
          keywordItem.appendChild(removeBtn);
          keywordList.appendChild(keywordItem);
      }
  });
}

// Function to remove keyword from storage and display
function removeKeyword(index) {
  chrome.storage.sync.get({ keywords: [] }, function(data) {
      let keywords = data.keywords;
      keywords.splice(index, 1); // Remove the keyword at the given index

      chrome.storage.sync.set({ keywords: keywords }, function() {
          displayKeywords(keywords); // Refresh the display
      });
  });
}
chrome.storage.sync.get({ keywords: [] }, (data) => {
  displayKeywords(data.keywords);
});

// Periodic keyword refresh
document.getElementById('backLink').addEventListener('click', () => {
    // Send a message to navigate back to the originating tab
    chrome.runtime.sendMessage({ action: "navigateBackToOriginalTab" });
});

setInterval(function() {
  chrome.storage.sync.get({ keywords: [] }, function(data) {
      displayKeywords(data.keywords); // Refresh the list
  });
}, 60000);


