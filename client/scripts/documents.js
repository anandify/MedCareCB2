// src/scripts/documents.js

export function initializeDocuments() {
    return `
        <h2>Documents</h2>
        <form id="uploadForm">
            <label for="fileUpload">Upload Document:</label>
            <input type="file" id="fileUpload" name="fileUpload" accept=".txt,.pdf,.docx" required>
            <button type="submit">Upload</button>
        </form>
        <div id="uploadedContent"></div>
    `;
}

// Event listener for file upload
document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('uploadForm');
    if (uploadForm) {
        uploadForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const fileInput = e.target.fileUpload;
            const file = fileInput.files[0];
            if (file) {
                // Handle file parsing here
                const reader = new FileReader();
                reader.onload = function(event) {
                    const content = event.target.result;
                    document.getElementById('uploadedContent').textContent = content;
                };
                reader.readAsText(file); // This can be adjusted for different file types
            }
        });
    }
});
