document.addEventListener("DOMContentLoaded", function () {
    // Get references to all elements
    const advanceButton = document.getElementById("advanceButton");
    const authForm = document.getElementById("authForm");
    const clearButton = document.getElementById("clearButton");
    const myForm = document.getElementById("myForm");
    const backButton = document.getElementById("backButton");
    
    // Toggle authentication form visibility
    if (advanceButton && authForm) {
        advanceButton.addEventListener("click", function() {
            // Toggle the form display
            authForm.style.display = authForm.style.display === "none" ? "block" : "none";
            
            // Update button text based on form state
            const icon = advanceButton.querySelector("i");
            if (authForm.style.display === "block") {
                advanceButton.innerHTML = '<i class="fas fa-lock me-2"></i> Hide Advanced Access';
                icon.classList.replace("fa-lock-open", "fa-lock");
            } else {
                advanceButton.innerHTML = '<i class="fas fa-lock-open me-2"></i> Advanced Access';
                icon.classList.replace("fa-lock", "fa-lock-open");
            }
        });
    }

    // Clear form button
    if (clearButton && myForm) {
        clearButton.addEventListener("click", function() {
            myForm.reset();
        });
    }

    // Back button functionality
    if (backButton) {
        backButton.addEventListener("click", function(e) {
            e.preventDefault();
            redirectToNewTab();
        });
    }

    // Form submission
    if (myForm) {
        myForm.addEventListener("submit", function(e) {
            e.preventDefault();
            handleFormSubmission();
        });
    }

    // Redirect to browser's new tab page
    function redirectToNewTab() {
        const newTabUrls = [
            "chrome://newtab/",
            "edge://newtab/",
            "about:newtab",
            "about:blank"
        ];

        for (const url of newTabUrls) {
            try {
                window.location.href = url;
                return;
            } catch (e) {
                continue;
            }
        }
        
        window.open(newTabUrls[0], "_blank");
    }

    async function handleFormSubmission() {
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;
        const toastElement = document.getElementById("liveToast");
        const messageParagraph = document.querySelector(".message");

        try {
            const response = await fetch("http://127.0.0.1:8000/api/Authentication", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (data.validation) {
                // Show success message
                messageParagraph.textContent = "Authentication successful!";
                toastElement.classList.remove("bg-danger");
                toastElement.classList.add("bg-success");
                
                const toast = new bootstrap.Toast(toastElement);
                toast.show();

                // Redirect after delay
                setTimeout(() => {
                    redirectToNewTab();
                }, 2000);
            } else {
                showError("Authentication failed. Please try again.");
            }
        } catch (error) {
            console.error("Authentication error:", error);
            showError("Network error. Please try again later.");
        }
    }

    function showError(message) {
        const toastElement = document.getElementById("liveToast");
        const messageParagraph = document.querySelector(".message");
        
        messageParagraph.textContent = message;
        toastElement.classList.remove("bg-success");
        toastElement.classList.add("bg-danger");
        
        const toast = new bootstrap.Toast(toastElement);
        toast.show();
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const backButton = document.getElementById("backButton");
    
    if (backButton) {
        backButton.addEventListener("click", function(e) {
            e.preventDefault();
            redirectToNewTab();
        });
    }

    // Proper way to redirect to new tab in Chrome extension
    function redirectToNewTab() {
        // Option 1: Use chrome.tabs API (best solution)
        if (chrome.tabs) {
            chrome.tabs.create({ url: "chrome://newtab/" }, function(tab) {
                if (chrome.runtime.lastError) {
                    // Fallback if chrome://newtab/ fails
                    chrome.tabs.create({ url: "about:blank" });
                }
            });
            return;
        }

        // Option 2: For non-extension contexts (like regular web pages)
        try {
            // Try Edge first
            window.open("edge://newtab/", "_blank") ||
            // Then try Firefox
            window.open("about:newtab", "_blank") ||
            // Final fallback
            window.open("about:blank", "_blank");
        } catch (e) {
            console.error("Redirection failed:", e);
            // Ultimate fallback - create a blank page
            document.body.innerHTML = `
                <div style="text-align: center; padding: 2rem;">
                    <h2>Redirection failed</h2>
                    <p>Please open a new tab manually.</p>
                </div>
            `;
        }
    }
});