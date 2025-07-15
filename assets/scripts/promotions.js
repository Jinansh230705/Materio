// Promotion Modal Display Script
// This script handles loading and displaying promotional modals from promo.json

let promoData = null;
let currentImageIndex = 0;
let imageRotationTimer = null;

// Load promotion data when page loads
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, attempting to load promotion...');
  loadAndDisplayPromotion();
});

async function loadAndDisplayPromotion() {
  try {
    console.log('Starting to load promotion data...');
    
    // Add cache busting to ensure we get the latest data
    const timestamp = new Date().getTime();
    const response = await fetch(`/assets/data/promo.json?t=${timestamp}`);
    
    console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      console.log('No promotion data found or fetch failed');
      return;
    }

    promoData = await response.json();
    console.log('Loaded promotion data:', promoData);
    
    // Check if promotion should be displayed
    if (shouldDisplayPromotion(promoData)) {
      console.log('Promotion should be displayed, calling displayPromotionModal...');
      displayPromotionModal(promoData);
    } else {
      console.log('Promotion not displayed due to conditions');
    }
  } catch (error) {
    console.error('Error loading promotion data:', error);
  }
}

function shouldDisplayPromotion(data) {
  console.log('Checking if promotion should be displayed...');
  console.log('Promotion data:', data);
  
  // Don't show if disabled
  if (!data.enabled) {
    console.log('Promotion disabled - not showing');
    return false;
  }
  console.log('✓ Promotion is enabled');

  // Check if it's a limited time offer
  if (data.isLimitedOffer && data.startDate && data.endDate) {
    const now = new Date();
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    console.log('Checking date range:', { now, startDate, endDate });
    
    // Don't show if current time is outside the offer period
    if (now < startDate || now > endDate) {
      console.log('Promotion outside date range - not showing');
      return false;
    }
    console.log('✓ Promotion is within date range');
  } else {
    console.log('✓ Not a limited time offer, no date restrictions');
  }

  // Check if user selected "Don't show again"
  const dontShowAgain = localStorage.getItem('promoDoNotShowAgain');
  if (dontShowAgain === 'true') {
    console.log('User selected "Don\'t show again" - not showing');
    return false;
  }
  console.log('✓ User has not selected "Don\'t show again"');

  console.log('✓ All checks passed - promotion should be displayed');
  return true;
}

function displayPromotionModal(data) {
  console.log('displayPromotionModal called with data:', data);
  
  const modal = document.getElementById('promoModal');
  if (!modal) {
    console.error('❌ Promotion modal element not found - check if main.html includes the modal');
    return;
  }
  console.log('✓ Modal element found:', modal);

  // Update modal content
  updateModalContent(modal, data);
  
  // Show the modal with proper centering
  console.log('Setting modal to display: flex for proper centering...');
  setTimeout(() => {
    // Add classes for proper display and body scroll prevention
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    console.log('✓ Promotion modal should now be visible and centered');
    console.log('Modal computed style display:', getComputedStyle(modal).display);
    console.log('Modal style display:', modal.style.display);
  }, 1000);
  
  // Setup image rotation if multiple images
  if (data.images && data.images.length > 1) {
    console.log('Setting up image rotation for', data.images.length, 'images');
    setupImageRotation(data.images, data.imageRotationInterval || 5000);
  }
}

function updateModalContent(modal, data) {
  console.log('Updating modal content:', data);

  // Update title (find the span with class promo-title, or update h2 directly)
  const titleSpan = modal.querySelector('.promo-title');
  const titleEl = modal.querySelector('h2');
  if (titleSpan) {
    titleSpan.textContent = data.title;
    console.log('Updated title span:', data.title);
  } else if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-bullhorn" style="margin-right: 10px;"></i>${data.title}`;
    console.log('Updated title element:', data.title);
  }

  // Update description
  const descriptionEl = modal.querySelector('.promo-description');
  if (descriptionEl) {
    descriptionEl.textContent = data.description;
    console.log('Updated description:', data.description);
  } else {
    // Fallback to first paragraph
    const paragraphs = modal.querySelectorAll('p');
    if (paragraphs.length > 0) {
      paragraphs[0].textContent = data.description;
      console.log('Updated description (fallback):', data.description);
    }
  }

  // Update and show image if available
  const imageEl = modal.querySelector('.promo-cover');
  if (imageEl && data.images && data.images.length > 0) {
    imageEl.src = data.images[0];
    imageEl.alt = data.title;
    imageEl.style.display = 'block';
    console.log('Updated and showed image:', data.images[0]);
  } else if (imageEl) {
    imageEl.style.display = 'none';
    console.log('Hidden image (no images available)');
  }

  // Update link and show/hide
  const linkEl = modal.querySelector('.promo-link, a[href]');
  const buttonTextEl = modal.querySelector('.promo-button-text');
  const buttonEl = modal.querySelector('#offerButton');
  
  if (linkEl && data.link) {
    linkEl.href = data.link;
    linkEl.style.display = 'inline-block';
    console.log('Updated and showed link:', data.link);
    
    if (buttonTextEl) {
      buttonTextEl.textContent = 'View Offer!';
    } else if (buttonEl) {
      buttonEl.innerHTML = '<i class="fa-solid fa-tag" style="margin-left: 5px; margin-right: 10px;"></i>View Offer!';
    }
  } else if (linkEl) {
    linkEl.style.display = 'none';
    console.log('Hidden link (no link provided)');
  }

  // Remove any existing date info
  const existingDateInfo = modal.querySelector('.promo-date-info');
  if (existingDateInfo) {
    existingDateInfo.remove();
  }

  // Add date information for limited time offers
  if (data.isLimitedOffer && data.startDate && data.endDate) {
    const endDate = new Date(data.endDate);
    const dateText = `Offer valid till ${endDate.toLocaleDateString()}`;
    
    // Create date info paragraph
    const dateEl = document.createElement('p');
    dateEl.className = 'promo-date-info';
    dateEl.style.fontStyle = 'italic';
    dateEl.style.color = '#888';
    dateEl.style.fontSize = '0.9em';
    dateEl.style.marginTop = '10px';
    dateEl.textContent = dateText;
    
    // Insert before the button link
    const buttonContainer = modal.querySelector('.promo-link, a[href]');
    if (buttonContainer && buttonContainer.parentNode) {
      buttonContainer.parentNode.insertBefore(dateEl, buttonContainer);
    } else {
      modal.querySelector('.promo-modal').appendChild(dateEl);
    }
    console.log('Added date info:', dateText);
  }
}

function setupImageRotation(images, interval) {
  if (!images || images.length <= 1) return;

  console.log('Setting up image rotation for', images.length, 'images');
  currentImageIndex = 0;
  
  // Clear any existing timer
  if (imageRotationTimer) {
    clearInterval(imageRotationTimer);
  }

  // Setup rotation timer
  imageRotationTimer = setInterval(() => {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    
    const imageEl = document.querySelector('#promoModal .promo-cover');
    if (imageEl) {
      // Add fade effect
      imageEl.style.opacity = '0.5';
      imageEl.style.transition = 'opacity 0.3s ease';
      
      setTimeout(() => {
        imageEl.src = images[currentImageIndex];
        imageEl.style.opacity = '1';
        console.log('Rotated to image:', images[currentImageIndex]);
      }, 300);
    }
  }, interval);
}

function closePromoModal() {
  const modal = document.getElementById('promoModal');
  if (modal) {
    // Check if "Don't show again" is checked
    const dontShowCheckbox = document.getElementById('dontShowAgainCheckbox');
    if (dontShowCheckbox && dontShowCheckbox.checked) {
      localStorage.setItem('promoDoNotShowAgain', 'true');
      console.log('User selected "Don\'t show again" - saved to localStorage');
    }
    
    // Hide modal and restore body scroll
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    console.log('Promotion modal closed');
  }

  // Clear image rotation timer
  if (imageRotationTimer) {
    clearInterval(imageRotationTimer);
    imageRotationTimer = null;
  }
}

// Remind me later function
function remindMeLater() {
  const modal = document.getElementById('promoModal');
  if (modal) {
    // Hide modal and restore body scroll
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    console.log('Promotion modal closed - remind me later');
  }

  // Clear image rotation timer
  if (imageRotationTimer) {
    clearInterval(imageRotationTimer);
    imageRotationTimer = null;
  }
  
  // Optional: Could set a temporary delay here if needed
  // For now, it will just show again on next page load
}

// Make functions globally available
window.closePromoModal = closePromoModal;
window.remindMeLater = remindMeLater;

// Make loadAndDisplayPromotion available globally for reloading
window.loadAndDisplayPromotion = loadAndDisplayPromotion;

// Function to force reload promotion data (called from profile.js)
window.reloadPromotionData = function() {
  console.log('🔄 Forcing promotion data reload...');
  loadAndDisplayPromotion();
};

// Manual test functions for debugging
window.testPromoModal = function() {
  console.log('Manual test: forcing promo modal to show...');
  const modal = document.getElementById('promoModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    console.log('Modal forced to show with proper centering');
  } else {
    console.error('Modal not found!');
  }
};

window.resetPromoSettings = function() {
  localStorage.removeItem('promoDoNotShowAgain');
  console.log('Promo settings cleared - modal will show again');
  loadAndDisplayPromotion();
};

window.forceLoadPromo = function() {
  console.log('Force loading promotion...');
  loadAndDisplayPromotion();
};

// Deprecated function for backward compatibility
window.clearDismissedPromos = function() {
  console.log('Note: clearDismissedPromos is deprecated, use resetPromoSettings instead');
  resetPromoSettings();
};
