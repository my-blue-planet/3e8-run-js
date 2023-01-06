function init() {
    //
    // const readModule = function(module: string) {
    //   if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][module] === undefined)
    //     throw `File not found: ${module}`;
    //   return Sk.builtinFiles["files"][module];
    // };
    //@keyboard, etc
    const state = {
        pressed_keys: [],
    };
    // list of ready js tasks
    const ready = {};
    //SharedArrayBuffers
    const sharedArrayBuffers = {};
    const sendMessage = (type, payload) => {
        self.postMessage(JSON.stringify({ type, payload }));
    };
    // const b: number = a
    const customBuiltins = {
        show: function (payload) {
            return sendMessage("show", { "show": payload }); //mayBe unwrap
        },
        waitFor: function (readysignal) {
            if (ready[readysignal]) {
                let payload = ready[readysignal];
                delete ready[readysignal];
                return payload;
            }
            else
                return false;
        },
        checkGlobals: function (keys) {
            let globals = {};
            for (let k of keys) {
                globals[k] = k in self ? self[k] : "__undefined__";
            }
            return sendMessage("evaluate", globals);
        },
        getWorkerState: function (key) {
            return state[key];
        },
        readShared: function (name, index) {
            if (!sharedArrayBuffers[name]) {
                console.warn(`${name} is not a shared buffer`);
                console.log(Object.keys(sharedArrayBuffers));
                return -1;
            }
            return sharedArrayBuffers[name][index];
        },
        writeShared: function (name, index, value) {
            if (!sharedArrayBuffers[name]) {
                console.warn(`${name} is not a shared buffer`);
                return -1;
            }
            if (sharedArrayBuffers[name] instanceof Uint8Array) {
                sharedArrayBuffers[name][index] = value < 0 ? 0 : value > 255 ? 255 : value; // clip
            }
            else {
                sharedArrayBuffers[name][index] = value;
            }
        },
        lib: (name) => {
            if (name in self)
                return self[name];
            else {
                sendMessage("error", `import: ${name} not found`);
            }
        },
        print: (...data) => {
            sendMessage('log', data.map(d => String(d)).join(" "));
        },
        log: (...data) => {
            sendMessage('log', data.map(d => String(d)).join(" "));
        },
        warn: (...data) => {
            sendMessage('log', data.map(d => String(d)).join(" "));
        },
        sleep: (millis) => {
            const sab = new SharedArrayBuffer(4);
            const view = new Int32Array(sab);
            Atomics.wait(view, 0, 0, millis);
        }
    };
    const { show, waitFor, checkGlobals, getWorkerState, readShared, writeShared, lib, print, log, warn, sleep } = customBuiltins;
    const run = async (code) => {
        try {
            /*__BAKEINCODE__*/
        }
        catch (e) {
            console.log(e, e.message, e.line);
            sendMessage("error", [e.message, e.stack]);
        }
        //sendMessage("exit", {})
        // return Promise..then(
        //   function success(mod: any) {
        //     sendMessage('exit', {});
        //   },
        //   function fail(err: Error) {
        //     // console.log(err, JSON.stringify(err.traceback));
        //     sendMessage('error', err.toString());
        //   });
    };
    //
    // Sk.configure({
    //   read: readModule,
    //   __future__: Sk.python3,
    //   output: function (output: any) {
    //     sendMessage('log', output);
    //   }
    // });
    const messageHandlers = {
        run(e) { run(e.data.code); },
        addLib(e) {
            for (let path in e.data.addLib) {
                // @ts-ignore
                self[path] = eval(e.data.addLib[path]);
            }
        },
        event(e) {
            if (e.data.name === "keydown")
                state.pressed_keys.push(e.data.key);
            if (e.data.name === "keyup")
                state.pressed_keys = state.pressed_keys.filter((k) => k !== e.data.key);
        },
        readysignal(e) {
            ready[e.data.readysignal] = { payload: e.data.payload };
        },
        addSharedArrayBuffer(e) {
            sharedArrayBuffers[e.data.name] = e.data.payload;
        }
    };
    globalThis.addEventListener('message', (e) => {
        const type = e.data.type;
        if (type in messageHandlers) {
            messageHandlers[type](e);
        }
        else {
            console.warn(`Unknown Data Type: ${type}`);
        }
    });
}
init();
