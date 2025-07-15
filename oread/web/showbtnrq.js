function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
  }

  function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.startsWith(name + '=')) {
        return cookie.substring(name.length + 1);
      }
    }
    return null;
  }

  function download(show) {
    const downloadButton = document.getElementById('downloadButton');
    const secondaryDownloadButton = document.getElementById('secondaryDownload');
    const editorModeSeparator = document.getElementById('editorModeSeparator');
  
    if (show) {
      downloadButton.removeAttribute('hidden');
      secondaryDownloadButton.removeAttribute('hidden');
      editorModeSeparator.removeAttribute('hidden');
      setCookie('downloadVisible', 'true', 3); 
    } else {
      downloadButton.setAttribute('hidden', true);
      secondaryDownloadButton.setAttribute('hidden', true);
      editorModeSeparator.setAttribute('hidden', true);
      setCookie('downloadVisible', 'false', 3); 
    }
  }
  document.addEventListener('DOMContentLoaded', () => {
    const downloadVisible = getCookie('downloadVisible');
    if (downloadVisible === 'true') {
      download(true);
    } else {
      download(false);
    }
  });