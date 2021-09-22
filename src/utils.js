import {config} from "./config.js";

const play = async file => {
    try {
        var mediaEl = await new Audio(file);
    } catch (error) {
        console.warn('BAC error: ', error);
        return;
    }

    mediaEl.addEventListener("canplaythrough", event => {
        mediaEl.volume = 0.1;
        mediaEl.play();

        console.log('Sound played.')
    });
}

let playSoundAlreadyCalled = false;

export const utils = {
    //    TODO animate icon on play
    playSound: async function () {
        console.log('utils.playSound called');
        // something with calling scripts multiple times
        if(playSoundAlreadyCalled) return;
        playSoundAlreadyCalled = true;

        const tabs = await chrome.tabs.query({active: true})
        const activeTab = tabs[0];

        // if user is on internal chrome tab chrome:// we can't play the sound

        // attempts tp play sound on the options page that expects local path to the file
        // TODO find how to detect internal extension page
        if (!activeTab?.url || !activeTab.url.startsWith('http')) {
            console.log('It is NOT a "normal" tab. activeTab.url', activeTab.url)
            await play(config.soundFile);
            return;
        }

        // normal tab - play
        console.log('It is a "normal" tab we are trying to play within the executeScript')
        const soundFile = chrome.runtime.getURL(config.soundFile);
        // const serializedPlayFunc = play.toString();
        await chrome.scripting.executeScript({
            target: {tabId: activeTab.id},
            // DAMN Eval is not allowed!!
            // args: [soundFile, serializedPlayFunc],
            // func: async (soundFile, serializedPlayFunc) => await new Function( 'return ' + serializedPlayFunc)().apply(null, [soundFile])

            args: [soundFile],
            func: async soundFile => {
                console.log('execute script started');
                try {
                    var mediaEl = await new Audio(soundFile);
                } catch (error) {
                    console.warn('BAC error: ', error);
                    return;
                }

                mediaEl.addEventListener("canplaythrough", event => {
                    mediaEl.volume = 0.1;
                    mediaEl.play();

                    console.log('Sound played in execute script.')
                });
            }
        })
    },
}
