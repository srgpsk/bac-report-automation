import {config} from "./config.js";
import {utils} from "./utils.js";

// TODO handle promises where available
let createdTabId;

// listeners
chrome.storage.onChanged.addListener(storageValueChangedListener)
chrome.alarms.onAlarm.addListener(alarmListener);
chrome.notifications.onButtonClicked.addListener(defaultActionListener)
chrome.tabs.onUpdated.addListener(tabUpdateListener)
chrome.tabs.onRemoved.addListener(() => {
});
chrome.runtime.onMessage.addListener(
    async function (request, sender, sendResponse) {
        if (request.lastPageReached) {
            await chrome.tabs.remove(request.tabId);
            chrome.runtime.port.disconnect(); // unload service worker
        }
    })


function storageValueChangedListener(changes, areaName) {
    console.log('changes ', changes);

    if (!changes.hasOwnProperty('notificationTime') || 'sync' !== areaName) {
        return;
    }

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
    const userOptions = await config.getOptionsAsync();
    const currentDay = new Date().getDay();
    if (!userOptions['notificationDays[]'][currentDay]) {
        return;
    }

    // browser may delay the alarm, so for the next day we set it at the original time
    const [timeHours, timeMinutes] = userOptions.notificationTime.split(':');
    scheduleAlarm(+timeHours, +timeMinutes);

    // global config is immutable
    const notificationOptions = {};
    Object.assign(notificationOptions, config.notification.options);
    notificationOptions.buttons[0].title = userOptions.defaultAction;

    showNotification(
        config.notification.name,
        notificationOptions,
        async function () {
            log('Notification showed. Can play: ' + userOptions.canPlay);
            if (!userOptions.canPlay) {
                return;
            }
            await utils.playSound();
        });
}

async function defaultActionListener() {
    log('Default action called');

    let tab = await chrome.tabs.create({url: config.formUrl,/* active: false*/})
    if (!tab.url) await onTabUrlUpdated(tab.id); // chrome bug

    createdTabId = tab.id;
    await injectCode(tab.id);
}

async function tabUpdateListener(tabId, changeInfo, tab) {
    if (tabId !== createdTabId || changeInfo.status !== 'complete') {
        return;
    }

    console.log('tab updated', tabId, changeInfo, tab)
    await injectCode(tabId)
}

async function injectCode(tabId) {
    const userOptions = await config.getOptionsAsync();
    const inputData = [
        {
            pageId: 0,
            value: userOptions.username,
            populateHidden: true,
            handleVisualByValue: false,
            selector: 'input[type="text"]',
        },
        {
            pageId: 1,
            value: 'Yes -- TODAY',
            populateHidden: true,
            handleVisualByValue: true,
        },
        {
            pageId: 3,
            value: userOptions.defaultAction,
            populateHidden: true,
            handleVisualByValue: true,
        },
        /*  {
              pageId: 4,
              value: '',
              populateHidden: false,
              handleVisualByValue: true,
          }*/
        {
            pageId: -3,
        }
    ];

    await chrome.scripting.insertCSS({
        target: {tabId: tabId},
        files: ['assets/content.css']
    });

    await chrome.scripting.executeScript({
            target: {tabId: tabId},
            args: [inputData, tabId],
            func: async (inputData, tabId) => {

                console.log('code injected');

                // last form page -> close the tab
                if (document.querySelector('.freebirdFormviewerViewResponseConfirmationMessage')) {
                    chrome.runtime.sendMessage({lastPageReached: true, tabId: tabId}, function (response) {
                        console.log(response);
                    });
                    return;
                }

                // thanks https://gist.github.com/jwilson8767/db379026efcbd932f64382db4b02853e
                const elementReadyAsync = function (selector) {
                    return new Promise((resolve, reject) => {
                        const element = document.querySelector(selector);
                        if (element) resolve(element);
                        new MutationObserver((mutationRecords, observer) => {
                            // Query for elements matching the specified selector
                            const element = document.querySelector(selector);
                            if (element) {
                                resolve(element);
                                //Once we have resolved we don't need the observer anymore.
                                observer.disconnect();
                            }
                        })
                            .observe(document.documentElement, {
                                childList: true,
                                subtree: true
                            });
                    });
                }
                const pageHistoryString = document.querySelector('[name=pageHistory]').value;
                const pageId = parseInt(pageHistoryString.slice(pageHistoryString.lastIndexOf(',') + 1));
                const sleep = time => new Promise(resolve => setTimeout(resolve, time))

                console.log('DOM pageId:', pageId, 'inputData ', inputData);
                console.log('Input Data loop starts here');

                const dataObject = inputData.find(dataObject => dataObject.pageId === pageId);
                console.log('pageId matched. dataObject in the Input Data: ', dataObject);

                // dumb fun
                document.forms[0].classList.add('stamp');

                // manually populate input[type=hidden] (sentinel)
                if (dataObject.populateHidden && !Array.isArray(dataObject.value)) {
                    // Array.from(document.querySelectorAll('input[type="hidden"]')).find(el => /^entry.*_sentinel$/.test(el.name)).value = dataObject.value;

                    // todo take a closer look on that sentinel
                    // for now set all hidden with one value
                    Array.from(document.querySelectorAll('input[type="hidden"]')).filter(el => /^entry.*/.test(el.name)).forEach(el => el.value = dataObject.value);
                }

                // the confirmation page doesn't have values to fill
                if (dataObject.hasOwnProperty('value')) {

                    await sleep(700);

                    // either we explicitly set the selector or we try to find the visual control by text value
                    let element;
                    if (dataObject.hasOwnProperty('selector')) {
                        element = await elementReadyAsync(dataObject.selector);
                        element.value = dataObject.value;
                    } else if (dataObject.handleVisualByValue) {
                        element = await elementReadyAsync(`[data-value="${dataObject.value}"]`);
                    }

                    // EXIT if we have data value but can't find a related element on the page
                    if (!element) {
                        console.error(`Element not found for pageId ${dataObject.pageId}`, 'selector: ', dataObject.selector, 'handleVisualByValue: ', dataObject.handleVisualByValue);
                        return;
                    }

                    await sleep(1000);

                    // emulate user action on form control
                    const eventType = element.getAttribute('role') === 'radio' ? 'click' : 'input';
                    element.dispatchEvent(new Event(eventType, {
                        view: window,
                        bubbles: true,
                        cancelable: true
                    }));
                }

                // mutation observer event fires multiple times after event with the same changes, so we need to wait anyway
                await sleep(700);

                // click Next/Submit button
                const buttons = document.querySelectorAll('.freebirdFormviewerViewNavigationLeftButtons [role="button"]');
                // const nextButtonIndex = buttons.length > 0 ? buttons.length - 1 : 0;
                buttons[buttons.length - 1].click();
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





