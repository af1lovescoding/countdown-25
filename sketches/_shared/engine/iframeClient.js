


export function createIframeClient() {

    const isInIframe = window.self !== window.top

    const STATE = {
        WAITING: "waiting",
        RUNNING: "running",
        FINISHED: "finished"
    }

    let state = STATE.RUNNING
    if (isInIframe) {

        state = STATE.WAITING
        window.addEventListener(
            "message",
            async (event) => {
                if (event.data === "started" || (event.data && event.data.type === "started")) {
                    if (state === STATE.WAITING)
                        state = STATE.RUNNING
                    
                    // Handle cursor visibility
                    if (event.data && typeof event.data === "object" && "showCursor" in event.data) {
                        if (event.data.showCursor) {
                            document.body.classList.add("show-cursor")
                        } else {
                            document.body.classList.remove("show-cursor")
                        }
                    }
                }
            },
            false
        );
    }

    function sendFinishSignal() {
        console.log("sketch finished, starting the next one.");
        window.parent.postMessage("finished", "*");

        state = STATE.FINISHED
    }

    return {
        sendFinishSignal,
        STATE,
        getState: () => state
    }
}