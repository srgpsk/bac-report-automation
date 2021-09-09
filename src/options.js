import {config} from "./config.js";

// event listeners
document.getElementById('play-sound').addEventListener('click', play_sound);
document.getElementById('save').addEventListener('click', save_options);
document.addEventListener('DOMContentLoaded', restore_options);

// set options page title
document.getElementById('title').innerText = `${config.name} options`;

function play_sound() {
    const soundFile = config.manifest.web_accessible_resources[0].resources.find(e => e.includes('mp3'));
    if (soundFile) {
        new Audio(soundFile).play();
        //    TODO animate icon on play
        // this.querySelector("path:nth-of-type(1)").classList.toggle("invisible");
    }
}

const options = {};

function save_options() {
    let hasError = false;
    const nodes = document.querySelectorAll('input');

    for (let element of nodes.values()) {
        let value = 'checkbox' === element.type ? element.checked : element.value;
        if(element.required && !element.value) {
            hasError = true;
            break;
        }

        options[element.id] = value;
    }

    if(hasError) {
        show_status(error);
        return;
    }

    chrome.storage.sync.set(options, () => show_status(success));
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

function show_status(f) {
    const status = document.getElementById('status');
    const nodes = document.querySelectorAll('input[required]');
    const cleanUp = () => setTimeout(function () {
        status.textContent = '';
    }, 1500);

    return f(status, nodes, cleanUp);
}

function error(status, nodes, cleanUp) {
    status.innerText = 'All required fields should be set.';
    status.style.color = 'red';
    nodes.forEach(el => el.classList.add('error'));
}

function success(status, nodes, cleanUp) {
    status.innerText = 'Options saved.';
    status.style.color = '#007bff';
    nodes.forEach(el => el.classList.remove('error'));
    cleanUp();
}