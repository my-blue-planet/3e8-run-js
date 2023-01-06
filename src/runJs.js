//@TODO check: almost duplicate of runPython
const WORKERCODE = "__MYWORKERCODE__";
// const blob = new Blob([WORKERCODE], {type: 'text/javascript'});
// const blobURL = window.URL.createObjectURL(blob);
const bakeinline = WORKERCODE.split("\n").findIndex(l => l.includes("/*__BAKEINCODE__*/"));
const getBlobURL = (bakeInCode) => {
    const bakedCode = WORKERCODE.replace("/*__BAKEINCODE__*/", bakeInCode);
    const blob = new Blob([bakedCode], { type: 'text/javascript' });
    return window.URL.createObjectURL(blob);
};
export function runJs(config) {
    const context = config.context || "play";
    const code = config.code || "";
    const outputElement = config.outputElement || document.createElement("div");
    const show = config.show || ((payload) => 0);
    const validator = config.validator || ((code) => false);
    const subscribers = config.subscribers || { sendReadySignal: (readySignal) => { }, addSharedArrayBuffer: () => { } };
    const addLib = config.addLib;
    const verbose = config.verbose;
    //console.log(code.indexOf("\r"), code.split("\n").slice(1).join("\n"), tj && tj.findAllErrors(code.split("\n").slice(1).join("\n")));
    if (verbose)
        console.log(config);
    try {
        const errorHandling = (w, msg, line) => {
            const codelines = code.split("\n").length;
            const errorLine = line && line - bakeinline;
            if (errorLine && errorLine < codelines) {
                outputElement.innerHTML += `<div class="warn">${msg} (line ${errorLine})</div>`;
            }
            else {
                outputElement.innerHTML += `<div class="warn">Unexpected end of code.</div>`;
                console.log({ msg, line });
            }
            closeWorker(w);
        };
        const w = new Worker(getBlobURL(code)); //blobURL); //{type: "module"} causes problems using import
        w.addEventListener('error', (ev) => errorHandling(w, ev.message, ev.lineno));
        outputElement.innerHTML = '';
        function closeWorker(w) {
            if (verbose)
                console.log("close");
            w.dispatchEvent(new CustomEvent("terminate"));
            w.terminate();
        }
        w.onmessage = function (event) {
            if (verbose)
                console.log(event);
            // @ts-ignore
            const { type, payload } = JSON.parse(event.data);
            if (type === 'exit') {
                closeWorker(w);
            }
            if (type === 'log') {
                payload.split("\n").filter((t) => t !== "").forEach((t) => {
                    const part = `<div class="log">${t}</div>`;
                    outputElement && outputElement.insertAdjacentHTML("beforeend", part);
                });
                if (verbose)
                    console.log(payload);
            }
            if (type === 'show') {
                show(payload);
            }
            if (type === 'evaluate') {
                validator(payload);
            }
            if (type === 'error') {
                const errorLineMatches = payload[1].match(/(?:on line |:)(\d{1,3})(?:\D|$)/);
                let errorLine = errorLineMatches && errorLineMatches.length && errorLineMatches[1];
                errorHandling(w, payload[0], errorLine && Number(errorLine));
                console.warn(payload);
            }
        };
        if (addLib) {
            if (verbose)
                console.log(addLib);
            w.postMessage({ type: "addLib", addLib });
        }
        if (subscribers)
            subscribers.sendReadySignal = (readysignal, payload) => {
                w.postMessage({ type: "readysignal", readysignal, payload });
            };
        if (subscribers)
            subscribers.addSharedArrayBuffer = (name, payload) => {
                w.postMessage({ type: "addSharedArrayBuffer", name, payload });
            };
        setTimeout(() => w.postMessage({ type: "run", code }), 10);
        //send keyboard events
        window.addEventListener("keydown", e => {
            w.postMessage({ type: "event", name: "keydown", key: e.key });
        });
        window.addEventListener("keyup", e => {
            w.postMessage({ type: "event", name: "keyup", key: e.key });
        });
        return w;
    }
    catch (e) {
        console.log("ToDo: handle errors here?");
        throw e;
    }
}
