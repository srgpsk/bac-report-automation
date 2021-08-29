// TODO handle promises where available

const DEBUG = true;
const ALARM_NAME = 'bac-alarm';
const NOTIFICATION = {
    name: 'bac-survey-notification',
    options: {
        type: 'basic',
        requireInteraction: true,
        title: 'Close Encounters of the Third Kind',
        message: 'I worked entirely remotely and didn\'t meet anyone.',
        // message: 'test',
        iconUrl: "/assets/icon16.png",
        buttons: [
            {
                title: 'Click to process automatically'
            }
        ]
    }
};

// if debug mode - reschedule alarm every time the worker called
if (DEBUG) {
    create_alarm(null, 0.1);
}

// listeners
chrome.alarms.onAlarm.addListener(alarm_listener);
chrome.notifications.onButtonClicked.addListener(default_action_listener)


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

function default_action_listener() {
    log('Default action called')

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





