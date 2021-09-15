import {config} from "./config.js";
import {utils} from "./utils.js";

// TODO handle promises where available
let createdTabId;

// listeners
chrome.storage.onChanged.addListener(storageValueChangedListener)
chrome.alarms.onAlarm.addListener(alarmListener);
chrome.notifications.onButtonClicked.addListener(defaultActionListener)
chrome.tabs.onUpdated.addListener(tabUpdateListener)
chrome.tabs.onRemoved.addListener(() => {});

function storageValueChangedListener(changes, areaName) {
    if (!changes.hasOwnProperty('notificationTime') || 'sync' !== areaName) {
        return;
    }

    console.log('changes ', changes);

    // re-schedule alarm on time update in options
    const [timeHours, timeMinutes] = changes.notificationTime.newValue.split(':');
    scheduleAlarm(+timeHours, +timeMinutes);
}

function scheduleAlarm(hours, minutes) {
    const alarmDate = new Date();
    alarmDate.setHours(hours);
    alarmDate.setMinutes(minutes);
    alarmDate.setSeconds(0);

    // if time passed in params is in the past. We schedule the alarm for the next day
    const day = Date.now() > alarmDate.getTime() ? alarmDate.getDate() + 1 : alarmDate.getDate();
    alarmDate.setDate(day);

    chrome.alarms.create(config.alarmName, {when: alarmDate.getTime()});
    console.log('Alarm scheduled on ', alarmDate.toString());
}

async function alarmListener(alarm) {
    log('Alarm listener executed. Alarm object: ', alarm);

    if (config.alarmName !== alarm.name) {
        return false;
    }

    // fire notification only during selected days
    const options = await config.getOptionsAsync();
    const currentDay = new Date().getDay();
    if (!options['notificationDays[]'][currentDay]) {
        return;
    }

    // browser may delay the alarm, so for the next day we set it at the original time
    const [timeHours, timeMinutes] = options.notificationTime.split(':');
    scheduleAlarm(+timeHours, +timeMinutes);

    // global config is immutable
    const notificationOptions = {};
    Object.assign(notificationOptions, config.notification.options);
    notificationOptions.buttons[0].title = options.defaultAction;

    showNotification(
        config.notification.name,
        notificationOptions,
        function () {
            log('Notification showed. Can play: ' + options.canPlay);
            if (!options.canPlay) {
                return;
            }
            utils.playSound();
        });
}

async function defaultActionListener() {
    log('Default action called');

    let tab = await chrome.tabs.create({url: config.formUrl})
    if (!tab.url) await onTabUrlUpdated(tab.id); // chrome bug

    createdTabId = tab.id;
    await injectcode(tab.id);
}

function tabUpdateListener(tabId, changeInfo, tab) {
    if (tabId !== createdTabId || changeInfo.status !== 'complete') {
        return;
    }

    console.log('tab updated', tabId, changeInfo, tab)
    injectcode(tabId)
}

function injectcode(tabId) {
    const inputData = config.inputData;
    return chrome.scripting.executeScript({
            target: {tabId: tabId},
            args: [inputData],
            func: (inputData) => {

                console.info('code injected')
                document.body.style.backgroundColor = 'red';

                // let visualControl;
                const pageHistoryString = document.querySelector('[name=pageHistory]').value;
                const pageId = pageHistoryString.slice(pageHistoryString.lastIndexOf(',') + 1);

                console.info(pageId)

                if (!inputData.hasOwnProperty(pageId)) {
                    console.error(`Page Id ${pageId} not found in INPUT_DATA`);
                    return;
                }

                inputData[pageId].inputs.forEach(dataObject => {

                    console.info('selector: ', dataObject.selector, 'element by selector: ', document.querySelector(dataObject.selector));

                    const element = document.querySelector(dataObject.selector);
                    element.value = dataObject.value;

                    // visual control elements need user-like interactions
                    if ('hidden' === element.getAttribute('type')) {
                        return;
                    }

                    // visualControl = element;
                    const eventType = element.getAttribute('role') === 'radio' ? 'click' : 'input';
                    element.dispatchEvent(new Event(eventType, {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    }))
                });

                // const observationTarget = visualControl.hasAttribute('jsaction') ? visualControl : visualControl.closest('[jsaction]');
                // const observer = new MutationObserver(function (mutationsList, observer) {
                //     console.log('callback that runs when observer is triggered', mutationsList, observer);
                // });
                //
                // console.info('visualControl: ', visualControl, 'observationTarget: ', observationTarget);
                //
                // observer.observe(observationTarget, {attributeFilter: ['class']});

                setTimeout(() => {
                    // click Next/Submit button
                    const buttons = document.querySelectorAll('.freebirdFormviewerViewNavigationLeftButtons [role="button"]');
                    buttons[buttons.length - 1].click();
                }, 500)
            },
        },
        (injectionResults) => {
            for (const frameResult of injectionResults)
                console.log('Frame Title: ' + frameResult.result);
        });
}

function showNotification(name, options, callback) {
    chrome.notifications.create(
        name,
        options,
        callback
    );
}

function log(message, ...args) {
    if (!config.debug) {
        return false;
    }

    console.info('BAC survey log: ', message, args.length ? args : '');
}

// chrome bug
function onTabUrlUpdated(tabId) {
    return new Promise((resolve, reject) => {
        const onUpdated = (id, info) => id === tabId && info.url && done(true);
        const onRemoved = id => id === tabId && done(false);
        chrome.tabs.onUpdated.addListener(onUpdated);
        chrome.tabs.onRemoved.addListener(onRemoved);

        function done(ok) {
            chrome.tabs.onUpdated.removeListener(onUpdated);
            chrome.tabs.onRemoved.removeListener(onRemoved);
            (ok ? resolve : reject)();
        }
    });
}





