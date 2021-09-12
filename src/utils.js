import {config} from "./config.js";

export const utils = {
    //    TODO animate icon on play
    playSound: async function () {
        const tabs = await chrome.tabs.query({active: true})
        const activeTab = tabs[0];

        // if user is on internal chrome tab we can't play the sound
        // attempts tp play sound the options page that expects local path to the file
        // TODO find how to detect internal extension page
        if (!activeTab?.url || !activeTab.url.startsWith('http')) {
            await new Audio(config.soundFile).play();
            return;
        }

        const soundFile =  chrome.runtime.getURL(config.soundFile);
        await chrome.scripting.executeScript({
            target: {tabId: activeTab.id},
            args: [soundFile],
            func: (soundFile) => {
                new Audio(soundFile).play();
            }
        })
    },

}


