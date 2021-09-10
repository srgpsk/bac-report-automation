import {config} from './config.js';

// event listeners
document.getElementById('play-sound').addEventListener('click', playSound);
document.getElementById('save').addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);

// set options page title
document.getElementById('title').innerText = `${config.name} options`;

function playSound() {
    const soundFile = config.manifest.web_accessible_resources[0].resources.find(e => e.includes('mp3'));
    if (soundFile) {
        new Audio(soundFile).play();
        //    TODO animate icon on play
        // this.querySelector('path:nth-of-type(1)').classList.toggle('invisible');
    }
}

const options = {};

function saveOptions() {
    let hasError = false;
    const nodes = document.querySelectorAll('[name]');

    for (let element of nodes.values()) {
        let value = 'checkbox' === element.type ? element.checked : element.value;
        if (element.required && !element.value) {
            hasError = true;
            break;
        }

        // handle array of names
        if (element.name.includes('[]') && !options.hasOwnProperty(element.name)) {
            options[element.name] = [];
        }
        Array.isArray(options[element.name]) ? options[element.name].push(value) : options[element.name] = value;
    }

    if (hasError) {
        showStatus(error);
        return;
    }
    // chrome.storage.sync.clear();
    chrome.storage.sync.set(options, () => showStatus(success));
}

function restoreOptions() {
    chrome.storage.sync.get(null, function (items) {
        console.log('stored items: ', items);

        const setValue = (element, value) => {
            const attr = 'checkbox' === element.type ? 'checked' : 'value';
            element[attr] = value;
        }

        for (const itemsKey in items) {
            let selector = `[name="${itemsKey}"]`;

            // handle inputs with name[]
            if (itemsKey.includes('[]')) {
                items[itemsKey].forEach((value, index) => {
                    const valueSelector = selector + `[value="${index}"]`;
                    const element = document.querySelector(valueSelector);
                    setValue(element, value);
                });

                // exit array traversal
                continue;
            }

            // scalar values set
            const element = document.querySelector(selector);
            setValue(element, items[itemsKey])
        }
    });
}

function showStatus(f) {
    const status = document.getElementById('status');
    const nodes = document.querySelectorAll('[required]');
    const cleanUp = () => setTimeout(function () {
        status.textContent = '';
    }, 1500);

    return f(status, nodes, cleanUp);
}

function error(status, nodes) {
    status.innerText = 'All required fields should be set.';
    status.style.color = 'red';
    nodes.forEach(el => !el.value && el.classList.add('error'));
}

function success(status, nodes, cleanUp) {
    status.innerText = 'Options saved.';
    status.style.color = '#007bff';
    nodes.forEach(el => el.classList.remove('error'));
    cleanUp();
}
