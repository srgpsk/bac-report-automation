// TODO handle promises where available
let createdTabId;
const DEBUG = true;
const ALARM_NAME = 'bac-alarm';
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSc5L_sYsQFrO99g3b2XVbvOB6yC2O4XhdA1r6elGMrIvtw85Q/viewform';
const NOTIFICATION = {
    name: 'bac-survey-notification',
    options: {
        type: 'basic',
        requireInteraction: true,
        title: 'Close Encounters of the Third Kind',
        message: 'I worked entirely remotely and didn\'t meet anyone.',
        iconUrl: "/assets/icon16.png",
        buttons: [
            {
                title: 'Click to process automatically'
            }
        ]
    }
};
const INPUT_DATA = {
    0: {
        inputs: [
            {
                selector: '[name="entry.996775878"]',
                value: 'Serge Paskal'//'OPTIONS.user-name'
            },
            {
                selector: 'form .exportInput',
                value: 'Serge Paskal'//'OPTIONS.user-name'
            }
        ]
    },
    1: {
        inputs: [
            {
                selector: '[name="entry.1719434578_sentinel"]', // HZ. it generates a field without sentinel suffix somewhere inside
                value: 'Yes -- TODAY'
            },
            {
                selector: '[data-value="Yes -- TODAY"]',
                value: null
            }
        ]
    },
    3: {
        inputs: [
            {
                selector: '[name="entry.218650354_sentinel"]',
                value: 'No - I worked entirely remotely'
            },
            {
                selector: '[data-value="No - I worked entirely remotely"]',
                value: null
            }
        ]
    },

};

// listeners
chrome.alarms.onAlarm.addListener(alarm_listener);
chrome.notifications.onButtonClicked.addListener(default_action_listener)
chrome.tabs.onUpdated.addListener(tab_update_listener)
chrome.tabs.onRemoved.addListener(() => {})

function alarm_listener(alarm) {
    log('Alarm listener executed. Alarm object: ', alarm);

    if (ALARM_NAME !== alarm.name) {
        return false;
    }

    show_notification(alarm, () => {
        log('Notification showed');
        play_sound();
    });
}

async function default_action_listener() {
    log('Default action called');

    let tab = await chrome.tabs.create({url: FORM_URL})
    if (!tab.url) await onTabUrlUpdated(tab.id); // chrome bug

    createdTabId = tab.id;
    await inject_code(tab.id);
}

function tab_update_listener(tabId, changeInfo, tab) {
    if (tabId !== createdTabId || changeInfo.status !== 'complete') {
        return;
    }

    console.log('tab updated', tabId, changeInfo, tab)
    inject_code(tabId)
}

function inject_code(tabId) {
    return chrome.scripting.executeScript({
            target: {tabId: tabId},
            args: [INPUT_DATA],
            func: (INPUT_DATA) => {

                console.info('code injected')
                document.body.style.backgroundColor = 'red';

                // let visualControl;
                const pageHistoryString = document.querySelector('[name=pageHistory]').value;
                const pageId = pageHistoryString.slice(pageHistoryString.lastIndexOf(',') + 1);

                console.info(pageId)

                if (!INPUT_DATA.hasOwnProperty(pageId)) {
                    console.error(`Page Id ${pageId} not found in INPUT_DATA`);
                    return;
                }

                INPUT_DATA[pageId].inputs.forEach(dataObject => {

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

function show_notification(alarm, callback) {
    chrome.notifications.create(
        NOTIFICATION.name,
        NOTIFICATION.options,
        callback
    );
}

async function play_sound() {
    const tabs = await chrome.tabs.query({active: true})
    await chrome.scripting.executeScript({
        target: {tabId: tabs[0].id},
        func: () => {
            // TODO read from manifest! import options?
            new Audio(chrome.runtime.getURL('/assets/ringtone.mp3')).play();
        }
    })
}

function create_alarm(scheduledTime, periodInMinutes) {
    const alarmInfo = {};
    if (scheduledTime) {
        alarmInfo.scheduledTime = scheduledTime;
    }
    if (periodInMinutes) {
        alarmInfo.periodInMinutes = periodInMinutes;
    }

    chrome.alarms.create(ALARM_NAME, alarmInfo)
}

function log(message, ...args) {
    if (!DEBUG) {
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





