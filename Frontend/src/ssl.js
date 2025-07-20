// Format date from "Jul  6 17:07:52 2025 GMT" to "Jul 6, 2025"
function formatCertificateDate(dateString) {
  if (!dateString || dateString === "N/A") return "N/A";
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString;
  }
}

// Calculate days remaining until expiration
function calculateDaysRemaining(validTo) {
  if (!validTo || validTo === "N/A") return null;
  
  try {
    const expirationDate = new Date(validTo);
    const today = new Date();
    const diffTime = expirationDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (e) {
    console.error("Error calculating days remaining:", e);
    return null;
  }
}

function updateSSLInfo(sslInfo) {
  const loadingSpinner = document.getElementById("ssl_loading");
  const detailsSection = document.getElementById("ssl_details");
  
  // Hide loading spinner
  if (loadingSpinner) {
    loadingSpinner.style.display = "none";
  }
  
  // Show details section
  if (detailsSection) {
    detailsSection.style.display = "block";
    detailsSection.classList.add("fade-in");
  }

  if (sslInfo) {
    const { 
      isValid, 
      issuedTo, 
      issuedBy, 
      validityPeriod = {},
      domain,
      error 
    } = sslInfo;

    // Update domain name
    document.getElementById("ssl_domain").textContent = domain || issuedTo || "N/A";

    // Update certificate details with formatted dates
    document.getElementById("issued_to").textContent = issuedTo || "N/A";
    document.getElementById("issued_by").textContent = issuedBy || "N/A";
    document.getElementById("valid_from").textContent = formatCertificateDate(validityPeriod.validFrom);
    document.getElementById("expires_on").textContent = formatCertificateDate(validityPeriod.validTo);
    
    // Calculate and display days remaining
    const daysRemaining = calculateDaysRemaining(validityPeriod.validTo);
    const daysRemainingElement = document.getElementById("days_remaining");
    if (daysRemaining !== null && daysRemaining >= 0) {
      daysRemainingElement.textContent = `${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'} remaining`;
    } else {
      daysRemainingElement.textContent = "N/A";
    }

    // Update status
    const statusElement = document.getElementById("is_valid");
    statusElement.classList.remove("valid", "invalid", "expiring");
    
    if (isValid) {
      if (daysRemaining !== null && daysRemaining <= 7) {
        statusElement.textContent = "EXPIRING SOON";
        statusElement.classList.add("expiring");
      } else {
        statusElement.textContent = "VALID";
        statusElement.classList.add("valid");
      }
    } else {
      statusElement.textContent = "INVALID";
      statusElement.classList.add("invalid");
    }

    // Show error if present
    if (error) {
      const errorDiv = document.createElement("div");
      errorDiv.className = "alert alert-warning mt-3";
      errorDiv.innerHTML = `<i class="fas fa-exclamation-triangle me-2"></i> ${error}`;
      detailsSection.appendChild(errorDiv);
    }
  } else {
    // No SSL info available
    const errorDiv = document.createElement("div");
    errorDiv.className = "alert alert-danger mt-3";
    errorDiv.innerHTML = `<i class="fas fa-times-circle me-2"></i> No SSL information available for this page`;
    detailsSection.appendChild(errorDiv);
  }
}

// Message listener for SSL info updates
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSSLInfo") {
    console.log("Received SSL Info:", request.sslInfo);
    updateSSLInfo(request.sslInfo);
  }
});

// Initialize the extension
document.addEventListener("DOMContentLoaded", function() {
  // Request SSL info when the popup loads
  chrome.runtime.sendMessage({ action: "getSSLInfo" });

  // Handle HTTP toggle switch
  const httpToggle = document.getElementById("httpToggle");
  const mixedContentToggle = document.getElementById("mixedContentToggle");

  // Load saved settings
  chrome.storage.sync.get(["http", "mixedContent"], function(data) {
    if (data.http !== undefined) {
      httpToggle.checked = data.http;
    }
    if (data.mixedContent !== undefined) {
      mixedContentToggle.checked = data.mixedContent;
    }
  });

  // Save HTTP setting
  httpToggle.addEventListener("change", function() {
    const http = httpToggle.checked;
    chrome.storage.sync.set({ http }, function() {
      console.log("HTTP setting saved:", http);
      chrome.runtime.sendMessage({
        action: "updateBlockingSettings",
        settings: { http }
      });
    });
  });

  // Save mixed content setting
  mixedContentToggle.addEventListener("change", function() {
    const mixedContent = mixedContentToggle.checked;
    chrome.storage.sync.set({ mixedContent }, function() {
      console.log("Mixed content setting saved:", mixedContent);
      chrome.runtime.sendMessage({
        action: "updateBlockingSettings",
        settings: { mixedContent }
      });
    });
  });
});