document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const passwordInput = document.getElementById('password');
  const togglePassword = document.getElementById('toggle-password');
  const strengthMeterFill = document.getElementById('strength-meter');
  const strengthText = document.getElementById('strength-text');
  const checkButton = document.getElementById('check-password-button');
  const outcomeMessage = document.getElementById('outcome-message');
  const spinner = document.getElementById('spinner');
  const criteriaItems = {
    length: document.getElementById('length-criteria'),
    uppercase: document.getElementById('uppercase-criteria'),
    lowercase: document.getElementById('lowercase-criteria'),
    number: document.getElementById('number-criteria'),
    special: document.getElementById('special-criteria')
  };

  // Toggle password visibility
  if (togglePassword) {
    togglePassword.addEventListener('click', function() {
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      togglePassword.innerHTML = type === 'password' ? '<i class="far fa-eye"></i>' : '<i class="far fa-eye-slash"></i>';
    });
  }

  // Real-time password strength evaluation
  passwordInput.addEventListener('input', function() {
    const password = passwordInput.value;
    const strength = calculatePasswordStrength(password);
    updateStrengthMeter(strength);
    updateCriteriaIndicators(password);
  });

  // Password strength calculation
  function calculatePasswordStrength(password) {
    if (!password) return 0;
    
    let strength = 0;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const specialChars = password.match(/[^A-Za-z0-9]/g) || [];
    const hasSpecial = specialChars.length > 0;
    const minLength = 12;
    
    // Length (max 2 points)
    if (password.length >= minLength) strength += 2;
    else if (password.length >= 8) strength += 1;
    
    // Character variety (max 4 points)
    if (hasUpper) strength++;
    if (hasLower) strength++;
    if (hasNumber) strength++;
    if (hasSpecial) strength++;
    
    // Bonus for multiple special chars
    if (specialChars.length >= 2) strength++;
    
    // Cap at 5 for our meter levels (0-5)
    return Math.min(strength, 5);
  }

  // Update the visual strength meter
  function updateStrengthMeter(strength) {
    // Reset classes
    strengthMeterFill.className = 'strength-meter-fill';
    
    // Update width and color based on strength (0-5)
    const strengthLevel = Math.min(Math.floor(strength / 2), 4); // Convert to 0-4 scale
    strengthMeterFill.classList.add(`strength-${strengthLevel}`);
    
    // Update text description
    const descriptions = [
      'Very Weak',
      'Weak',
      'Moderate',
      'Strong',
      'Very Strong',
      'Excellent'
    ];
    strengthText.textContent = `Strength: ${descriptions[strengthLevel]}`;
  }

  // Update criteria indicators
  function updateCriteriaIndicators(password) {
    if (!password) {
      // Reset all criteria if password is empty
      Object.values(criteriaItems).forEach(item => {
        item?.classList.remove('valid');
      });
      return;
    }

    const checks = {
      length: password.length >= 12,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };

    for (const [key, isValid] of Object.entries(checks)) {
      if (criteriaItems[key]) {
        criteriaItems[key].classList.toggle('valid', isValid);
      }
    }
  }

  // Password check button handler
  checkButton.addEventListener('click', async function() {
    const password = passwordInput.value.trim();
    
    if (!password) {
      showResult('Please enter a password to check', 'warning');
      return;
    }

    showLoading(true);
    
    try {
      const response = await fetch('http://127.0.0.1:8000/api/check-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      showLoading(false);
      displayResults(data);
      
    } catch (error) {
      showLoading(false);
      showResult(`Error checking password: ${error.message || 'Please try again later'}`, 'danger');
      console.error('Password check error:', error);
    }
  });

  // Display API results
  function displayResults(data) {
    let resultHTML = `
      <div class="d-flex align-items-center justify-content-center mb-2">
        <i class="fas ${data.isCompromised ? 'fa-times-circle text-danger' : 'fa-check-circle text-success'} me-2"></i>
        <strong>${data.message}</strong>
      </div>
    `;
    
    if (data.strengthFeedback) {
      resultHTML += `<div class="small text-muted mb-2">${data.strengthFeedback}</div>`;
    }
    
    if (data.similarPasswords?.length > 0) {
      resultHTML += `
        <div class="mt-2">
          <strong>Similar compromised passwords:</strong>
          <ul class="mt-1 mb-0">
            ${data.similarPasswords.map(pwd => 
              `<li>${pwd.word} (${pwd.similarity}% similar)</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    if (data.suggestions?.length > 0) {
      resultHTML += `
        <div class="mt-3">
          <strong>Suggestions for improvement:</strong>
          <ul class="mt-1">
            ${data.suggestions.map(suggestion => 
              `<li>${suggestion}</li>`
            ).join('')}
          </ul>
        </div>
      `;
    }
    
    outcomeMessage.innerHTML = resultHTML;
    outcomeMessage.className = `result-message ${data.isCompromised ? 'result-danger' : 'result-success'}`;
  }

  // Show loading spinner
  function showLoading(show) {
    if (spinner) spinner.style.display = show ? 'flex' : 'none';
    if (outcomeMessage) {
      outcomeMessage.textContent = '';
      outcomeMessage.className = 'result-message';
    }
    checkButton.disabled = show;
  }

  // Show result message
  function showResult(message, type) {
    if (outcomeMessage) {
      outcomeMessage.innerHTML = `
        <div class="d-flex align-items-center">
          <i class="fas ${type === 'danger' ? 'fa-exclamation-circle' : 'fa-info-circle'} me-2"></i>
          ${message}
        </div>
      `;
      outcomeMessage.className = `result-message result-${type}`;
    }
  }

  // Initialize
  updateStrengthMeter(0);
  updateCriteriaIndicators('');
});