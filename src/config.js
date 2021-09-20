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

    actions: [
        'Yes (includes outside of work)',
        'No - I worked on site, but didn\'t have any contact)',
        'No - I worked entirely remotely',
        'No - it was my day off, and I didn\'t see anybody',
    ],

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

    get notification() {
        return {
            name: `bac-survey-notification`,
            options: {
                type: 'basic',
                requireInteraction: true,
                title: this.manifest.name,
                message: 'When you click the button the action will be processed automatically if possible. Otherwise the new tab will show you the step that needs manual interaction.' ,
                iconUrl: "/assets/icon128.png",
                buttons: [
                    {
                        title: '' // will be populated dynamically with user selected default action
                    }
                ]
            }
        }
    },

});
