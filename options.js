const options = {};
const manifest = chrome.runtime.getManifest();

// set options page title
document.getElementById('title').innerText = `${manifest.name} options`;

// event listeners
document.getElementById('play-sound').addEventListener('click', play_sound);
document.getElementById('save').addEventListener('click', save_options);
document.addEventListener('DOMContentLoaded', restore_options);


function play_sound() {
    const soundFile = manifest.web_accessible_resources[0].resources.find(e => e.includes('mp3'));
    if (soundFile) {
        new Audio(soundFile).play();
        //    TODO animate icon on play
        // this.querySelector("path:nth-of-type(1)").classList.toggle("invisible");

    }
}

function save_options() {
    document.querySelectorAll('input').forEach(element => options[element.id] = 'checkbox' === element.type ? element.checked : element.value);

    chrome.storage.sync.set(options, function () {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = 'Options saved.';
        setTimeout(function () {
            status.textContent = '';
        }, 1500);
    });
}

function restore_options() {
    chrome.storage.sync.get(null, function (items) {
        console.log(items)
        for (const itemsKey in items) {
            const element = document.getElementById(itemsKey);
            const attr = 'checkbox' === element.type ? 'checked' : 'value';
            element[attr] = items[itemsKey];
        }
    });
}
