import {config} from './config.js';
import {utils} from "./utils.js";

// event listeners
document.getElementById('play-sound').addEventListener('click', utils.playSound);
document.getElementById('save').addEventListener('click', saveOptions);
document.addEventListener('DOMContentLoaded', restoreOptions);

// set options page title
document.getElementById('title').innerText = `${config.name} options`;

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
    populateActions();

    chrome.storage.sync.get(null, function (items) {
        console.log('stored items: ', items);

        const setValue = (element, value) => {
            console.log(element)
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

function populateActions() {
    const actions = [];
    config.actions.forEach(action => {
        const element = document.createElement('option');
        element.value = action;
        element.innerText = action;

        actions.push(element);
    });

    document.getElementById('default-action').append(...actions);
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
