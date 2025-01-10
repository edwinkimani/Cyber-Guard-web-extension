chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateSSLInfo") {
    console.log(request.sslInfo);
    updateSSLInfo(request.sslInfo);
  }
});


function updateSSLInfo(sslInfo) {
  const sslInfoDiv = document.getElementById("ssl_info");
  const spinner = sslInfoDiv.querySelector(".spinner-border");

  if (spinner) {
      spinner.style.display = "none";
  }

  if (sslInfo) {
      const { isValid, issuedTo, issuedBy, validityPeriod, error } = sslInfo;

      let status = "Invalid Do not use the site";
      let statusClass = "text-danger";
      let validPeriod = "N/A - N/A";

      if (validityPeriod) {
          validPeriod = `${validityPeriod.validFrom} - ${validityPeriod.validTo}`;
      }

      if (isValid) {
          status = "Valid";
          statusClass = "text-success";
      }

      document.getElementById("issued_to").textContent = issuedTo || "N/A";
      document.getElementById("issued_by").textContent = issuedBy || "N/A";
      document.getElementById("valid_period").textContent = validPeriod;
      document.getElementById("is_valid").textContent = status;

      const statusElement = document.getElementById("is_valid");
      statusElement.classList.remove("text-success", "text-danger");
      statusElement.classList.add(statusClass);

      if (error) {
          const errorDiv = document.createElement("div");
          errorDiv.className = "alert alert-warning mt-2";
          errorDiv.textContent = `Error: ${error}`;
          sslInfoDiv.appendChild(errorDiv);
      }

      sslInfoDiv.classList.remove("alert-info");
      sslInfoDiv.classList.add(statusClass === "text-success" ? "alert-success" : "alert-danger");
  } else {
      sslInfoDiv.classList.remove("alert-info");
      sslInfoDiv.classList.add("alert-danger");
      sslInfoDiv.innerHTML = "No SSL information available.";
  }
}


// Trigger SSL check on page load (optional)
chrome.runtime.sendMessage({ action: "getSSLInfo" });

document.addEventListener("DOMContentLoaded", function () {
  const httpToggle = document.getElementById("httpToggle");

  // Load saved settings from chrome.storage when the popup is opened
  chrome.storage.sync.get(["http"], function (data) {
    if (data.http !== undefined) {
      httpToggle.checked = data.http; // Set the toggle based on saved setting
    }
  });

  // Save the adblocker setting when the user toggles the switch
  httpToggle.addEventListener("change", function () {
    const http = httpToggle.checked;
    chrome.storage.sync.set({ http }, function () {
      console.log("http setting saved.");
    });
  });
});
