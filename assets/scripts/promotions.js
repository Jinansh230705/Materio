// Promotion Modal Display Script
// This script handles loading and displaying promotional modals from promo.json

let promoData = null;
let currentImageIndex = 0;
let imageRotationTimer = null;

// Load promotion data when script loads (works with both DOMContentLoaded and lazy loading)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    loadAndDisplayPromotion();
  });
} else {
  // DOM already loaded (lazy loaded script)
  loadAndDisplayPromotion();
}

async function loadAndDisplayPromotion() {
  try {
    // console.log('Starting to load promotion data...');
    
    // Add cache busting to ensure we get the latest data
    const timestamp = new Date().getTime();
    const response = await fetch(`/assets/data/promo.json?t=${timestamp}`);
    
    // console.log('Fetch response status:', response.status);
    
    if (!response.ok) {
      // console.log('No promotion data found or fetch failed');
      return;
    }

    promoData = await response.json();
    // console.log('Loaded promotion data:', promoData);
    
    // Check if promotion should be displayed
    if (shouldDisplayPromotion(promoData)) {
      displayPromotionModal(promoData);
    }
  } catch (error) {
    console.error('Error loading promotion data:', error);
  }
}

function shouldDisplayPromotion(data) {
  // console.log('Checking if promotion should be displayed...');
  // console.log('Promotion data:', data);
  
  // Don't show if disabled
  if (!data.enabled) {
    // console.log('Promotion disabled - not showing');
    return false;
  }
  // console.log('✓ Promotion is enabled');

  // Check if it's a limited time offer
  if (data.isLimitedOffer && data.startDate && data.endDate) {
    const now = new Date();
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    // Don't show if current time is outside the offer period
    if (now < startDate || now > endDate) {
      return false;
    }
    // console.log('✓ Promotion is within date range');
  } else {
    // console.log('✓ Not a limited time offer, no date restrictions');
  }

  // Check if user selected "Don't show again"
  const dontShowAgain = localStorage.getItem('promoDoNotShowAgain');
  if (dontShowAgain === 'true') {
    // console.log('User selected "Don\'t show again" - not showing');
    return false;
  }
  // console.log('✓ User has not selected "Don\'t show again"');

  // Check frequency settings
  if (!checkFrequency(data.frequency, data.customFrequencyHours)) {
    return false;
  }

  // console.log('✓ All checks passed - promotion should be displayed');
  return true;
}

function checkFrequency(frequency, customFrequencyHours) {
  // Default to "once" if no frequency specified
  if (!frequency) {
    frequency = "once";
  }

  const now = new Date().getTime();
  const lastShown = localStorage.getItem('promoLastShown');
  const lastShownTime = lastShown ? parseInt(lastShown, 10) : 0;
  
  // Frequency-based logic
  switch (frequency) {
    case "once":
      // Show only once - if already shown, don't show again
      if (lastShown) {
        return false;
      }
      break;
      
    case "custom":
      // Custom frequency in hours
      if (!customFrequencyHours || customFrequencyHours <= 0) {
        // If custom is set but no valid hours, default to "once"
        if (lastShown) {
          return false;
        }
      } else {
        const customDelay = customFrequencyHours * 60 * 60 * 1000;
        if (lastShown && (now - lastShownTime) < customDelay) {
          return false;
        }
      }
      break;
      
    case "every-3hr":
      // Show every 3 hours
      const threeHours = 3 * 60 * 60 * 1000;
      if (lastShown && (now - lastShownTime) < threeHours) {
        return false;
      }
      break;
      
    case "every-6hr":
      // Show every 6 hours
      const sixHours = 6 * 60 * 60 * 1000;
      if (lastShown && (now - lastShownTime) < sixHours) {
        return false;
      }
      break;
      
    case "every-12hr":
      // Show every 12 hours
      const twelveHours = 12 * 60 * 60 * 1000;
      if (lastShown && (now - lastShownTime) < twelveHours) {
        return false;
      }
      break;
      
    case "daily":
      // Show once per day
      const oneDay = 24 * 60 * 60 * 1000;
      if (lastShown && (now - lastShownTime) < oneDay) {
        return false;
      }
      break;
      
    case "every-3days":
      // Show once every 3 days (max conservative frequency)
      const threeDays = 3 * 24 * 60 * 60 * 1000;
      if (lastShown && (now - lastShownTime) < threeDays) {
        return false;
      }
      break;
      
    case "random":
      // Aggressive random mode - 30% chance for 6 hours, otherwise 3-12 hours
      // Check if "remind me later" is set (this is used by random mode)
      const remindLaterTime = localStorage.getItem('promoRemindLaterTime');
      if (remindLaterTime) {
        const reminderTime = parseInt(remindLaterTime, 10);
        if (now < reminderTime) {
          return false;
        } else {
          // Time has passed, remove the reminder
          localStorage.removeItem('promoRemindLaterTime');
        }
      }
      break;
      
    default:
      // Unknown frequency - default to "once"
      if (lastShown) {
        return false;
      }
  }
  
  return true;
}

// Simple markdown parser for description
function parseMarkdown(text) {
  if (!text) return '';
  
  return text
    // Bold: **text** or __text__
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    
    // Italic: *text* or _text_
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    
    // Code: `code`
    .replace(/`(.+?)`/g, '<code style="background: rgba(0,0,0,0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>')
    
    // Links: [text](url)
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" style="color: #ff6b00; text-decoration: underline;">$1</a>')
    
    // Line breaks: newlines to <br>
    .replace(/\n/g, '<br>')
    
    // Numbered lists: 1. item
    .replace(/^(\d+)\.\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px;"><strong>$1.</strong> $2</div>')
    
    // Bullet points: - item or * item
    .replace(/^[-*]\s+(.+)$/gm, '<div style="margin: 8px 0; padding-left: 20px;">• $1</div>');
}

function displayPromotionModal(data) {
  // console.log('displayPromotionModal called with data:', data);
  
  const modal = document.getElementById('promoModal');
  if (!modal) {
    console.error('❌ Promotion modal element not found - check if main.html includes the modal');
    return;
  }
  // console.log('✓ Modal element found:', modal);

  // Update modal content
  updateModalContent(modal, data);
  
  // Show the modal with proper centering
  // console.log('Setting modal to display: flex for proper centering...');
  setTimeout(() => {
    // Add classes for proper display and body scroll prevention
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Record when the modal was shown (for frequency tracking)
    localStorage.setItem('promoLastShown', new Date().getTime().toString());
    
    // console.log('✓ Promotion modal should now be visible and centered');
    // console.log('Modal computed style display:', getComputedStyle(modal).display);
    // console.log('Modal style display:', modal.style.display);
  }, 1000);
  
  // Setup image rotation if multiple images
  if (data.images && data.images.length > 1) {
    // console.log('Setting up image rotation for', data.images.length, 'images');
    setupImageRotation(data.images, data.imageRotationInterval || 5000, data.imageAnimation);
  }

  // Debug function to check video controls
  debugVideoControls();
}

// Debug function to check video controls
function debugVideoControls() {
    console.log('=== VIDEO CONTROLS DEBUG ===');
    const modal = document.querySelector('.promo-modal');
    if (!modal) {
        console.error('Promo modal not found');
        return;
    }
    
    const video = modal.querySelector('.promo-video');
    
    if (video && video.style.display !== 'none') {
        forceShowVideoControls(modal);
    }
}

function updateModalContent(modal, data) {
  // console.log('Updating modal content:', data);

  // Update title (find the span with class promo-title, or update h2 directly)
  const titleSpan = modal.querySelector('.promo-title');
  const titleEl = modal.querySelector('h2');
  if (titleSpan) {
    titleSpan.textContent = data.title;
    // console.log('Updated title span:', data.title);
  } else if (titleEl) {
    titleEl.innerHTML = `<i class="fa-solid fa-bullhorn" style="margin-right: 10px;"></i>${data.title}`;
    // console.log('Updated title element:', data.title);
  }

  // Update description
  const descriptionEl = modal.querySelector('.promo-description');
  if (descriptionEl) {
    descriptionEl.innerHTML = parseMarkdown(data.description);
    // console.log('Updated description:', data.description);
  } else {
    // Fallback to first paragraph
    const paragraphs = modal.querySelectorAll('p');
    if (paragraphs.length > 0) {
      paragraphs[0].innerHTML = parseMarkdown(data.description);
      // console.log('Updated description (fallback):', data.description);
    }
  }

  // Update and show media (image or video) if available
  const imageEl = modal.querySelector('.promo-cover');
  const videoEl = modal.querySelector('.promo-video');
  const imageContainer = modal.querySelector('.promo-image');
  const modalContainer = modal.querySelector('.promo-modal');
  
  if (data.images && data.images.length > 0) {
    const firstMedia = data.images[0];
    const isVideo = isVideoFile(firstMedia);
    
    if (isVideo) {
      // Handle video
      if (videoEl) {
        setupVideoElement(videoEl, firstMedia);
        videoEl.style.display = 'block';
      }
      if (imageEl) {
        imageEl.style.display = 'none';
      }
    } else {
      // Handle image
      if (imageEl) {
        imageEl.src = firstMedia;
        imageEl.alt = data.title;
        imageEl.style.display = 'block';
      }
      if (videoEl) {
        videoEl.style.display = 'none';
      }
    }
    
    if (imageContainer) {
      imageContainer.style.display = 'flex';
    }
    if (modalContainer) {
      modalContainer.classList.remove('no-image');
    }
    // console.log('Updated and showed media:', firstMedia, isVideo ? '(video)' : '(image)');
  } else {
    if (imageEl) {
      imageEl.style.display = 'none';
    }
    if (videoEl) {
      videoEl.style.display = 'none';
    }
    if (imageContainer) {
      imageContainer.style.display = 'none';
    }
    if (modalContainer) {
      modalContainer.classList.add('no-image');
    }
    // console.log('Hidden media (no images available)');
  }

  // Hide video controls for images
  const controls = modal.querySelector('.video-controls');
  if (controls) controls.style.display = 'none';

  // Update buttons based on JSON configuration
  updateButtons(modal, data);

  // Update disclaimer based on JSON configuration
  updateDisclaimer(modal, data);

  // Update options based on JSON configuration
  updateOptions(modal, data);

  // Remove any existing date info
  const existingDateInfo = modal.querySelector('.promo-date-info');
  if (existingDateInfo) {
    existingDateInfo.remove();
  }

  // Add date information for limited time offers
  // Check if showDateInfo is explicitly set to true, or default to true for backward compatibility
  const shouldShowDateInfo = data.showDateInfo !== undefined ? data.showDateInfo : true;
  
  if (shouldShowDateInfo && data.isLimitedOffer && data.startDate && data.endDate) {
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
    // console.log('Added date info:', dateText);
  }
}

// Helper function to check if a file is a video
function isVideoFile(url) {
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  const urlLower = url.toLowerCase();
  return videoExtensions.some(ext => urlLower.endsWith(ext));
}

// Helper function to setup video element
function setupVideoElement(videoEl, videoSrc) {
  // Clear existing sources
  const sources = videoEl.querySelectorAll('source');
  sources.forEach(source => source.remove());
  
  // Determine video type
  const extension = videoSrc.split('.').pop().toLowerCase();
  let mimeType = 'video/mp4'; // default
  
  switch(extension) {
    case 'webm':
      mimeType = 'video/webm';
      break;
    case 'ogg':
    case 'ogv':
      mimeType = 'video/ogg';
      break;
    case 'mov':
      mimeType = 'video/quicktime';
      break;
    default:
      mimeType = 'video/mp4';
  }
  
  // Create and add source element
  const source = document.createElement('source');
  source.src = videoSrc;
  source.type = mimeType;
  videoEl.appendChild(source);
  
  // Set video attributes
  videoEl.muted = true;
  videoEl.autoplay = true;
  videoEl.loop = true;
  videoEl.playsInline = true;
  
  // Load the video
  videoEl.load();
        
  // Setup video controls after a short delay to ensure DOM is ready
  setTimeout(() => {
    setupVideoControls(modal);
  }, 100);
}

// Ensure video controls exist in DOM
function ensureVideoControlsExist(modal) {
    let controls = modal.querySelector('.video-controls');
    
    if (!controls) {
        console.log('Video controls not found, creating them...');
        const imageContainer = modal.querySelector('.promo-image');
        if (imageContainer) {
            controls = document.createElement('div');
            controls.className = 'video-controls';
            controls.style.display = 'none';
            
            const playBtn = document.createElement('button');
            playBtn.className = 'video-control-btn play-pause-btn';
            playBtn.title = 'Play/Pause';
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            
            const muteBtn = document.createElement('button');
            muteBtn.className = 'video-control-btn mute-unmute-btn';
            muteBtn.title = 'Mute/Unmute';
            muteBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
            
            controls.appendChild(playBtn);
            controls.appendChild(muteBtn);
            imageContainer.appendChild(controls);
            
            console.log('Video controls created and added to DOM');
        }
    }
    
    return controls;
}

function updateButtons(modal, data) {
  // Default values for buttons
  const defaults = {
    primary: {
      text: "View Offer",
      icon: "fa-solid fa-tag"
    },
    secondary: {
      text: "Remind me later",
      icon: "fa-solid fa-clock"
    }
  };

  // Update primary button
  let primaryButton = modal.querySelector('.promo-primary-btn');
  let primaryLink = modal.querySelector('.promo-link');
  let primaryIcon = modal.querySelector('.promo-primary-icon');
  let primaryText = modal.querySelector('.promo-button-text');
  
  if (data.buttons && data.buttons.primary && data.buttons.primary.show) {
    if (primaryLink && data.link && data.link !== 'null' && data.link !== null) {
      primaryLink.href = data.link;
      primaryLink.style.display = 'inline-block';
      
      // Handle hash anchor links (e.g., #quickSearchBox)
      if (data.link.startsWith('#')) {
        primaryLink.removeAttribute('target'); // Don't open in new tab
        
        // Remove any existing click handler
        primaryLink.replaceWith(primaryLink.cloneNode(true));
        
        // Re-query elements after cloning
        primaryLink = modal.querySelector('.promo-link');
        primaryButton = modal.querySelector('.promo-primary-btn');
        primaryIcon = modal.querySelector('.promo-primary-icon');
        primaryText = modal.querySelector('.promo-button-text');
        
        // Add click handler to close modal and scroll to element
        primaryLink.addEventListener('click', function(e) {
          e.preventDefault();
          closePromoModal();
          
          // Wait for modal close animation, then scroll to element
          setTimeout(() => {
            const targetElement = document.querySelector(data.link);
            if (targetElement) {
              targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              // Optional: focus the element if it's focusable
              if (targetElement.focus) {
                targetElement.focus();
              }
            }
          }, 300); // Adjust timing based on your modal close animation
        });
      } else {
        // For external links, keep target="_blank"
        primaryLink.setAttribute('target', '_blank');
      }
    } else if (primaryLink) {
      // If link is null or 'null', make button just close the modal
      primaryLink.style.display = 'inline-block';
      primaryLink.removeAttribute('href');
      primaryLink.style.cursor = 'pointer';
      
      // Remove any existing click handler
      primaryLink.replaceWith(primaryLink.cloneNode(true));
      primaryLink = modal.querySelector('.promo-link');
      
      // Add click handler to just close modal
      primaryLink.addEventListener('click', function(e) {
        e.preventDefault();
        closePromoModal();
      });
      primaryLink.style.display = 'none';
    }
    
    if (primaryIcon) {
      // Check if icon is provided and not a placeholder character
      const iconValue = data.buttons.primary.icon;
      const isValidIcon = iconValue && 
                         iconValue.trim() !== "" && 
                         iconValue !== "&#8206;" && 
                         iconValue !== "\u200E"; // Zero-width left-to-right mark
      
      if (isValidIcon) {
        primaryIcon.className = iconValue;
        primaryIcon.style.display = '';
      } else if (iconValue === "&#8206;" || iconValue === "\u200E" || iconValue === "") {
        // Hide icon if explicitly set to blank/placeholder
        primaryIcon.className = '';
        primaryIcon.style.display = 'none';
      } else {
        // Use default only if icon field is missing/undefined
        primaryIcon.className = defaults.primary.icon;
        primaryIcon.style.display = '';
      }
    }
    
    if (primaryText) {
      const buttonText = (data.buttons.primary.text && data.buttons.primary.text.trim() !== "") 
        ? data.buttons.primary.text 
        : defaults.primary.text;
      primaryText.textContent = buttonText;
    }
    
    if (primaryButton) {
      primaryButton.style.display = 'flex';
    }
    // console.log('Updated primary button with text:', primaryText?.textContent || defaults.primary.text);
  } else {
    if (primaryLink) {
      primaryLink.style.display = 'none';
    }
    // console.log('Hidden primary button');
  }
  
  // Update secondary button
  const secondaryButton = modal.querySelector('#remindLaterBtn');
  const secondaryIcon = modal.querySelector('.promo-secondary-icon');
  const secondaryText = modal.querySelector('.promo-secondary-text');
  
  if (data.buttons && data.buttons.secondary && data.buttons.secondary.show) {
    if (secondaryIcon) {
      // Check if icon is provided and not a placeholder character
      const iconValue = data.buttons.secondary.icon;
      const isValidIcon = iconValue && 
                         iconValue.trim() !== "" && 
                         iconValue !== "&#8206;" && 
                         iconValue !== "\u200E"; // Zero-width left-to-right mark
      
      if (isValidIcon) {
        secondaryIcon.className = iconValue;
        secondaryIcon.style.display = '';
      } else if (iconValue === "&#8206;" || iconValue === "\u200E" || iconValue === "") {
        // Hide icon if explicitly set to blank/placeholder
        secondaryIcon.className = '';
        secondaryIcon.style.display = 'none';
      } else {
        // Use default only if icon field is missing/undefined
        secondaryIcon.className = defaults.secondary.icon;
        secondaryIcon.style.display = '';
      }
    }
    
    if (secondaryText) {
      const buttonText = (data.buttons.secondary.text && data.buttons.secondary.text.trim() !== "") 
        ? data.buttons.secondary.text 
        : defaults.secondary.text;
      secondaryText.textContent = buttonText;
    }
    
    if (secondaryButton) {
      secondaryButton.style.display = 'flex';
    }
    // console.log('Updated secondary button with text:', secondaryText?.textContent || defaults.secondary.text);
  } else {
    if (secondaryButton) {
      secondaryButton.style.display = 'none';
    }
    // console.log('Hidden secondary button');
  }
}

function updateDisclaimer(modal, data) {
  // Default values for disclaimer
  const defaults = {
    text: "*Terms and conditions apply.",
    linkText: "Read more",
    linkUrl: "#"
  };

  const disclaimerContainer = modal.querySelector('.promo-disclaimer');
  const disclaimerText = modal.querySelector('.promo-disclaimer-text');
  const disclaimerLink = modal.querySelector('.promo-disclaimer-link');
  
  if (data.disclaimer && data.disclaimer.show) {
    if (disclaimerText) {
      const text = (data.disclaimer.text && data.disclaimer.text.trim() !== "") 
        ? data.disclaimer.text 
        : defaults.text;
      disclaimerText.textContent = text;
    }
    
    if (disclaimerLink) {
      const linkText = (data.disclaimer.linkText && data.disclaimer.linkText.trim() !== "") 
        ? data.disclaimer.linkText 
        : defaults.linkText;
      disclaimerLink.textContent = linkText;
      
      const linkUrl = (data.disclaimer.linkUrl && data.disclaimer.linkUrl.trim() !== "") 
        ? data.disclaimer.linkUrl 
        : defaults.linkUrl;
      disclaimerLink.href = linkUrl;
    }
    
    if (disclaimerContainer) {
      disclaimerContainer.style.display = 'block';
    }
    // console.log('Updated disclaimer with text:', disclaimerText?.textContent || defaults.text);
  } else {
    if (disclaimerContainer) {
      disclaimerContainer.style.display = 'none';
    }
    // console.log('Hidden disclaimer');
  }
}

function updateOptions(modal, data) {
  // Default values for options
  const defaults = {
    dontShowAgainText: "Don't show this again"
  };

  const optionsContainer = modal.querySelector('.promo-options');
  const checkboxText = modal.querySelector('.promo-checkbox-text');
  
  if (data.options && data.options.showDontShowAgain) {
    if (checkboxText) {
      const text = (data.options.dontShowAgainText && data.options.dontShowAgainText.trim() !== "") 
        ? data.options.dontShowAgainText 
        : defaults.dontShowAgainText;
      checkboxText.textContent = text;
    }
    
    if (optionsContainer) {
      optionsContainer.style.display = 'block';
    }
    // console.log('Updated options with text:', checkboxText?.textContent || defaults.dontShowAgainText);
  } else {
    if (optionsContainer) {
      optionsContainer.style.display = 'none';
    }
    // console.log('Hidden options');
  }
}

function setupImageRotation(images, interval, animationConfig) {
  if (!images || images.length <= 1) return;

  // console.log('Setting up image rotation for', images.length, 'images');
  currentImageIndex = 0;
  
  // Default animation configuration
  const defaultAnimation = {
    type: 'fade',
    duration: 600,
    direction: 'left'
  };
  
  const animation = { ...defaultAnimation, ...animationConfig };
  
  // Clear any existing timer
  if (imageRotationTimer) {
    clearInterval(imageRotationTimer);
  }

  // Setup rotation timer
  imageRotationTimer = setInterval(() => {
    currentImageIndex = (currentImageIndex + 1) % images.length;
    
    const imageEl = document.querySelector('#promoModal .promo-cover');
    const videoEl = document.querySelector('#promoModal .promo-video');
    const imageContainer = document.querySelector('#promoModal .promo-image');
    
    if (imageContainer) {
      // Apply custom animation
      applyMediaAnimation(imageEl, videoEl, imageContainer, images[currentImageIndex], animation);
      // console.log('Rotated to media with animation:', images[currentImageIndex], animation.type);
    }
  }, interval);
}

function applyMediaAnimation(imageEl, videoEl, container, newMediaSrc, animationConfig) {
  // Set animation duration as CSS custom property
  container.style.setProperty('--animation-duration', `${animationConfig.duration}ms`);
  
  const isVideo = isVideoFile(newMediaSrc);
  const activeEl = isVideo ? videoEl : imageEl;
  const inactiveEl = isVideo ? imageEl : videoEl;
  
  // Remove any existing animation classes from both elements
  const animationClasses = ['slide-left', 'slide-right', 'slide-up', 'slide-down', 'fade', 'fade-scale', 'cascade', 'flip', 'zoom', 'bounce'];
  if (imageEl) imageEl.classList.remove(...animationClasses);
  if (videoEl) videoEl.classList.remove(...animationClasses);
  
  // Determine animation class based on type and direction
  let animationClass = 'fade'; // default
  
  switch (animationConfig.type) {
    case 'slide':
      animationClass = `slide-${animationConfig.direction || 'left'}`;
      break;
    case 'fade':
      animationClass = 'fade';
      break;
    case 'fade-scale':
      animationClass = 'fade-scale';
      break;
    case 'cascade':
      animationClass = 'cascade';
      break;
    case 'flip':
      animationClass = 'flip';
      break;
    case 'zoom':
      animationClass = 'zoom';
      break;
    case 'bounce':
      animationClass = 'bounce';
      break;
    default:
      animationClass = 'fade';
  }
  
  // Hide current elements
  if (activeEl) activeEl.style.opacity = '0';
  if (inactiveEl) inactiveEl.style.display = 'none';
  
  setTimeout(() => {
    if (isVideo && videoEl) {
      // Handle video
      setupVideoElement(videoEl, newMediaSrc);
      videoEl.style.display = 'block';
      if (imageEl) imageEl.style.display = 'none';
    } else if (!isVideo && imageEl) {
      // Handle image
      imageEl.src = newMediaSrc;
      imageEl.style.display = 'block';
      if (videoEl) videoEl.style.display = 'none';
    }
    
    // Apply animation class to active element
    if (activeEl) {
      activeEl.classList.add(animationClass);
      activeEl.style.opacity = '1';
      
      // Remove animation class after animation completes
      setTimeout(() => {
        activeEl.classList.remove(animationClass);
      }, animationConfig.duration + 50);
    }
  }, 100);
}

function closePromoModal() {
  const modal = document.getElementById('promoModal');
  if (modal) {
    // Check if "Don't show again" is checked
    const dontShowCheckbox = document.getElementById('dontShowAgainCheckbox');
    if (dontShowCheckbox && dontShowCheckbox.checked) {
      localStorage.setItem('promoDoNotShowAgain', 'true');
      // console.log('User selected "Don\'t show again" - saved to localStorage');
    }
    
    // Stop any playing video and audio
    const video = modal.querySelector('.promo-video');
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.muted = true; // Ensure audio is muted
    }
    
    // Stop any audio elements
    const audios = modal.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Hide modal and restore body scroll
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // console.log('Promotion modal closed');
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
    // Stop any playing video and audio
    const video = modal.querySelector('.promo-video');
    if (video) {
      video.pause();
      video.currentTime = 0;
      video.muted = true; // Ensure audio is muted
    }
    
    // Stop any audio elements
    const audios = modal.querySelectorAll('audio');
    audios.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
    
    // Hide modal and restore body scroll
    modal.style.display = 'none';
    modal.classList.remove('show');
    document.body.classList.remove('modal-open');
    
    // console.log('Promotion modal closed - remind me later');
  }

  // Clear image rotation timer
  if (imageRotationTimer) {
    clearInterval(imageRotationTimer);
    imageRotationTimer = null;
  }
  
  // Set remind me later timestamp based on frequency setting
  let delayHours;
  
  if (promoData && promoData.frequency === "random") {
    // Random mode: 30% chance for 6 hours, otherwise 3-12 hours
    delayHours = Math.random() < 0.3 ? 6 : Math.floor(Math.random() * 10) + 3;
  } else {
    // For other frequency modes, use a default 6-hour delay for "remind me later"
    delayHours = 6;
  }
  
  const remindLaterTime = new Date().getTime() + (delayHours * 60 * 60 * 1000);
  localStorage.setItem('promoRemindLaterTime', remindLaterTime.toString());
  // console.log(`Remind me later set for ${delayHours} hours`);
}

// Make functions globally available
window.closePromoModal = closePromoModal;
window.remindMeLater = remindMeLater;

// Make loadAndDisplayPromotion available globally for reloading
window.loadAndDisplayPromotion = loadAndDisplayPromotion;

// Function to force reload promotion data (called from profile.js)
window.reloadPromotionData = function() {
  // console.log('🔄 Forcing promotion data reload...');
  loadAndDisplayPromotion();
};

window.setupVideoControls = function(modal) {
  console.log('Setting up video controls...');
  const video = modal.querySelector('.promo-video');
  const controls = modal.querySelector('.video-controls');
  const playPauseBtn = modal.querySelector('.play-pause-btn');
  const muteBtn = modal.querySelector('.mute-unmute-btn');
  
  if (!video || !controls || !playPauseBtn || !muteBtn) {
    console.error('Missing video control elements');
    return;
  }
  
  // Show controls when video is visible
  if (video.style.display !== 'none') {
    controls.style.display = 'flex';
  } else {
    controls.style.display = 'none';
    return;
  }
  
  // Play/Pause functionality
  playPauseBtn.addEventListener('click', function() {
    if (video.paused) {
      video.play();
      playPauseBtn.querySelector('i').className = 'fa-solid fa-pause';
      playPauseBtn.title = 'Pause';
    } else {
      video.pause();
      playPauseBtn.querySelector('i').className = 'fa-solid fa-play';
      playPauseBtn.title = 'Play';
    }
  });
  
  // Mute/Unmute functionality
  muteBtn.addEventListener('click', function() {
    if (video.muted) {
      video.muted = false;
      muteBtn.querySelector('i').className = 'fa-solid fa-volume-high';
      muteBtn.title = 'Mute';
    } else {
      video.muted = true;
      muteBtn.querySelector('i').className = 'fa-solid fa-volume-xmark';
      muteBtn.title = 'Unmute';
    }
  });
  
  // Update play/pause button when video ends
  video.addEventListener('ended', function() {
    playPauseBtn.querySelector('i').className = 'fa-solid fa-play';
    playPauseBtn.title = 'Play';
  });
  
  // Auto-hide controls after 3 seconds of no interaction
  let hideControlsTimeout;
  const hideControls = () => {
    controls.style.opacity = '0.3';
  };
  
  const showControls = () => {
    controls.style.opacity = '1';
    clearTimeout(hideControlsTimeout);
    hideControlsTimeout = setTimeout(hideControls, 3000);
  };
  
  // Show controls on hover or interaction
  video.addEventListener('mouseenter', showControls);
  controls.addEventListener('mouseenter', showControls);
  video.addEventListener('mouseleave', () => {
    hideControlsTimeout = setTimeout(hideControls, 1000);
  });
  
  // Initial setup
  showControls();
}

// Simple force show video controls for testing
function forceShowVideoControls(modal) {
    console.log('Force showing video controls...');
    
    // Ensure controls exist
    let controls = modal.querySelector('.video-controls');
    
    if (!controls) {
        console.log('Creating video controls...');
        const imageContainer = modal.querySelector('.promo-image');
        if (imageContainer) {
            controls = document.createElement('div');
            controls.className = 'video-controls';
            controls.innerHTML = `
                <button class="video-control-btn play-pause-btn" title="Play/Pause">
                    <i class="fa-solid fa-pause"></i>
                </button>
                <button class="video-control-btn mute-unmute-btn" title="Mute/Unmute">
                    <i class="fa-solid fa-volume-high"></i>
                </button>
            `;
            imageContainer.appendChild(controls);
        }
    }
    
    if (controls) {
        controls.style.display = 'flex';
        controls.style.opacity = '1';
        controls.style.position = 'absolute';
        controls.style.bottom = '16px';
        controls.style.right = '16px';
        controls.style.zIndex = '1000';
        console.log('Video controls should now be visible');
        
        // Add basic click handlers
        const playBtn = controls.querySelector('.play-pause-btn');
        const muteBtn = controls.querySelector('.mute-unmute-btn');
        const video = modal.querySelector('.promo-video');
        
        if (playBtn && video) {
            playBtn.onclick = function() {
                if (video.paused) {
                    video.play();
                    playBtn.querySelector('i').className = 'fa-solid fa-pause';
                } else {
                    video.pause();
                    playBtn.querySelector('i').className = 'fa-solid fa-play';
                }
            };
        }
        
        if (muteBtn && video) {
            muteBtn.onclick = function() {
                if (video.muted) {
                    video.muted = false;
                    muteBtn.querySelector('i').className = 'fa-solid fa-volume-high';
                } else {
                    video.muted = true;
                    muteBtn.querySelector('i').className = 'fa-solid fa-volume-xmark';
                }
            };
        }
    }
}

// Manual test functions for debugging
window.testPromoModal = function() {
  // console.log('Manual test: forcing promo modal to show...');
  const modal = document.getElementById('promoModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    // console.log('Modal forced to show with proper centering');
  } else {
    console.error('Modal not found!');
  }
};

window.resetPromoSettings = function() {
  localStorage.removeItem('promoDoNotShowAgain');
  // console.log('Promo settings cleared - modal will show again');
  loadAndDisplayPromotion();
};

window.forceLoadPromo = function() {
  // console.log('Force loading promotion...');
  loadAndDisplayPromotion();
};

// Deprecated function for backward compatibility
window.clearDismissedPromos = function() {
  // console.log('Note: clearDismissedPromos is deprecated, use resetPromoSettings instead');
  resetPromoSettings();
};

// Mobile swipe-down functionality for handle bar
function initMobileSwipeHandling() {
  const modal = document.getElementById('promoModal');
  if (!modal) return;

  let startY = 0;
  let currentY = 0;
  let isDragging = false;
  let initialTransform = 0;

  function handleTouchStart(e) {
    // Only handle touches on screens 400px and below
    if (window.innerWidth > 400) return;
    
    startY = e.touches[0].clientY;
    isDragging = true;
    initialTransform = 0;
    
    const modalElement = modal.querySelector('.promo-modal');
    if (modalElement) {
      modalElement.style.transition = 'none';
    }
  }

  function handleTouchMove(e) {
    if (!isDragging || window.innerWidth > 400) return;
    
    currentY = e.touches[0].clientY;
    const deltaY = currentY - startY;
    
    // Only allow downward dragging
    if (deltaY > 0) {
      const modalElement = modal.querySelector('.promo-modal');
      if (modalElement) {
        modalElement.style.transform = `translateY(${deltaY}px)`;
      }
    }
  }

  function handleTouchEnd(e) {
    if (!isDragging || window.innerWidth > 400) return;
    
    const deltaY = currentY - startY;
    const modalElement = modal.querySelector('.promo-modal');
    
    if (modalElement) {
      modalElement.style.transition = 'transform 0.3s ease';
      
      // If dragged down more than 100px, close the modal
      if (deltaY > 100) {
        modalElement.style.transform = 'translateY(100%)';
        setTimeout(() => {
          closePromoModal();
        }, 300);
      } else {
        // Snap back to original position
        modalElement.style.transform = 'translateY(0)';
      }
    }
    
    isDragging = false;
    startY = 0;
    currentY = 0;
  }

  // Add event listeners to the modal
  modal.addEventListener('touchstart', handleTouchStart, { passive: true });
  modal.addEventListener('touchmove', handleTouchMove, { passive: true });
  modal.addEventListener('touchend', handleTouchEnd, { passive: true });
}

// Initialize swipe handling when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  initMobileSwipeHandling();
});
