document.addEventListener('keydown', function (e) {
    const key = e.key.toLowerCase();
    const isBlockedCombo =
        key === 'f12' ||
        (e.ctrlKey && e.shiftKey && ['i', 'j', 'c'].includes(key)) ||
        (e.ctrlKey && ['u'].includes(key));

    if (isBlockedCombo) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
}, true); // true = capture phase

// Disable right-click unless on input/textarea/contenteditable
document.addEventListener('contextmenu', function (e) {
    const target = e.target;
    if (
        target.tagName !== 'INPUT' &&
        target.tagName !== 'TEXTAREA' &&
        !target.isContentEditable
    ) {
        e.preventDefault();
    }
});

// Disable selection outside inputs
document.addEventListener('DOMContentLoaded', function () {
    const blockIfNotInput = (e) => {
        const tag = e.target.tagName;
        const editable = e.target.isContentEditable;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !editable) {
            e.preventDefault();
        }
    };

    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.mozUserSelect = 'none';
    document.body.style.msUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';
    document.body.style.webkitUserDrag = 'none';

    document.addEventListener('selectstart', blockIfNotInput);
    document.addEventListener('dragstart', blockIfNotInput);
    document.addEventListener('mouseup', function (e) {
        if (
            e.target.tagName !== 'INPUT' &&
            e.target.tagName !== 'TEXTAREA' &&
            !e.target.isContentEditable
        ) {
            window.getSelection().removeAllRanges();
        }
    });
});
