interface WorkerEventData {
  type: string, code?: string, addLib?: any, key?: string, name?: string, readysignal?: string, payload?: any}
interface WorkerEvent {data: WorkerEventData}

function init() {

  //
  // const readModule = function(module: string) {
  //   if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][module] === undefined)
  //     throw `File not found: ${module}`;
  //   return Sk.builtinFiles["files"][module];
  // };

  //@keyboard, etc
  const state: Record<string, any> = {
    pressed_keys: [],
  }
  // list of ready js tasks
  const ready: Record<string, any> = {};
  //SharedArrayBuffers
  const sharedArrayBuffers: Record<string, Uint8Array | Uint32Array> = {}

  const sendMessage = (type: string, payload: any) => {
    self.postMessage(JSON.stringify({type, payload}));
  };

  // const b: number = a

  const customBuiltins = {
    show: function(payload: any)  {
      return sendMessage("show", {"show": payload}); //mayBe unwrap
    },
    waitFor: function(readysignal: string) {
      if(ready[readysignal]) {
        let payload = ready[readysignal];
        delete ready[readysignal];
        return payload;
      }
      else return false;
    },
    checkGlobals: function(keys: string[]) {
      let globals = {} as Record<string, any>;
      for(let k of keys) {
        globals[k] = k in self ? self[k as any] :  "__undefined__"
      }
      return sendMessage("evaluate", globals);
    },
    getWorkerState: function(key: string) {
      return state[key];
    },
    readShared: function(name: string, index: number) {
      if(!sharedArrayBuffers[name]) {
        console.warn(`${name} is not a shared buffer`);
        console.log(Object.keys(sharedArrayBuffers))
        return -1
      }
      return sharedArrayBuffers[name][index]
    },
    writeShared: function(name: string, index: number, value: number) {
      if(!sharedArrayBuffers[name]) {
        console.warn(`${name} is not a shared buffer`);
        return -1
      }
      if(sharedArrayBuffers[name] instanceof Uint8Array) {
        sharedArrayBuffers[name][index] = value < 0 ? 0 : value > 255 ? 255 : value // clip
      }
      else {
        sharedArrayBuffers[name][index] = value
      }
    },
    lib: (name: string) => {
      if(name in self) return self[name as keyof typeof self]
      else {sendMessage("error", `import: ${name} not found`)}
    },
    print: (...data: unknown[]) => {
      sendMessage('log', data.map(d=>String(d)).join(" "))
    },
    log: (...data: unknown[]) => {
      sendMessage('log', data.map(d=>String(d)).join(" "))
    },
    warn: (...data: unknown[]) => {
      sendMessage('log', data.map(d=>String(d)).join(" "))
    },
    sleep: (millis: number) => {
      const sab = new SharedArrayBuffer(4)
      const view = new Int32Array(sab)
      Atomics.wait(view, 0, 0, millis)
    }
  }

  const {show, waitFor, checkGlobals, getWorkerState, readShared, writeShared, lib, print, log, warn, sleep} = customBuiltins

  const run = async (code: string) => {
    try {
      /*__BAKEINCODE__*/
    }
    catch(e) {
      console.log(e, e.message, e.line);
      sendMessage("error", [e.message, e.stack])
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
    run(e: WorkerEvent) {run(e.data.code);},
    addLib(e: WorkerEvent) {
      for(let path in e.data.addLib) {
        // @ts-ignore
        self[path] = eval(e.data.addLib[path])
      }
    },
    event(e: WorkerEvent) {
      if(e.data.name === "keydown") state.pressed_keys.push(e.data.key);
      if(e.data.name === "keyup") state.pressed_keys = state.pressed_keys.filter((k: string)=>k!==e.data.key);
    },
    readysignal(e: WorkerEvent) {
      ready[e.data.readysignal as string] = {payload: e.data.payload};
    },
    addSharedArrayBuffer(e: WorkerEvent) {
      sharedArrayBuffers[e.data.name] = e.data.payload
    }
  }

  globalThis.addEventListener('message', (e: WorkerEvent) => {
    const type = e.data.type as keyof typeof messageHandlers;
    if(type in messageHandlers) {
      messageHandlers[type](e);
    }
    else {
      console.warn(`Unknown Data Type: ${type}`);
    }
  })
}

init()
