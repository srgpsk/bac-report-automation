document.getElementById('action').addEventListener('click', function () {
    chrome.runtime.sendMessage('fill-the-form', (response) => {
        console.log('got a message', response);
    });
});