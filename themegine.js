
document.addEventListener('DOMContentLoaded', (event) => {
    const themeSwitch = document.getElementById('themeSwitch');
    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.body.classList.add('expresso');
            document.body.classList.remove('thermal');
        } else {
            document.body.classList.add('thermal');
            document.body.classList.remove('expresso');
        }
    });

    // Set initial theme based on user preference or default to light theme
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        themeSwitch.checked = true;
        document.body.classList.add('expresso');
    } else {
        document.body.classList.add('thermal');
    }
});