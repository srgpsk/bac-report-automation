// docs example
const storageCache = {};
const initStorageCache = getAllStorageSyncData().then(items => {
    Object.assign(storageCache, items);
});
function getAllStorageSyncData() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get(null, (items) => {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }
            resolve(items);
        });
    });
}

export const config = Object.freeze({
    debug: true,
    name: 'Close Encounters of the Third Kind',
    alarmName: `bac-alarm`,
    formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSc5L_sYsQFrO99g3b2XVbvOB6yC2O4XhdA1r6elGMrIvtw85Q/viewform',

    notification: {
        name: `bac-survey-notification`,
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
    },

    actions: [
        'Yes (includes outside of work)',
        'No - I worked on site, but didn\'t have any contact)',
        'No - I worked entirely remotely',
        'No - it was my day off, and I didn\'t see anybody',
    ],

    inputData: {
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
                    selector: '[name="entry.1719434578_sentinel"]',
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

    },

     getOptionsAsync: async function () {
        await initStorageCache;
        return storageCache;
    },

    get manifest() {
        return chrome.runtime.getManifest();
    },

    get soundFile() {
        return this.manifest.web_accessible_resources[0].resources.find(el => el.includes('mp3'));
    },

});
