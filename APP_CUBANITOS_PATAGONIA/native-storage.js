(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // node_modules/@capacitor/core/dist/index.js
  var ExceptionCode, CapacitorException, getPlatformId, createCapacitor, initCapacitorGlobal, Capacitor, registerPlugin, WebPlugin, encode, decode, CapacitorCookiesPluginWeb, CapacitorCookies, readBlobAsBase64, normalizeHttpHeaders, buildUrlParams, buildRequestInit, CapacitorHttpPluginWeb, CapacitorHttp, SystemBarsStyle, SystemBarType, SystemBarsPluginWeb, SystemBars;
  var init_dist = __esm({
    "node_modules/@capacitor/core/dist/index.js"() {
      (function(ExceptionCode2) {
        ExceptionCode2["Unimplemented"] = "UNIMPLEMENTED";
        ExceptionCode2["Unavailable"] = "UNAVAILABLE";
      })(ExceptionCode || (ExceptionCode = {}));
      CapacitorException = class extends Error {
        constructor(message, code, data) {
          super(message);
          this.message = message;
          this.code = code;
          this.data = data;
        }
      };
      getPlatformId = (win) => {
        var _a, _b;
        if (win === null || win === void 0 ? void 0 : win.androidBridge) {
          return "android";
        } else if ((_b = (_a = win === null || win === void 0 ? void 0 : win.webkit) === null || _a === void 0 ? void 0 : _a.messageHandlers) === null || _b === void 0 ? void 0 : _b.bridge) {
          return "ios";
        } else {
          return "web";
        }
      };
      createCapacitor = (win) => {
        const capCustomPlatform = win.CapacitorCustomPlatform || null;
        const cap = win.Capacitor || {};
        const Plugins = cap.Plugins = cap.Plugins || {};
        const getPlatform = () => {
          return capCustomPlatform !== null ? capCustomPlatform.name : getPlatformId(win);
        };
        const isNativePlatform = () => getPlatform() !== "web";
        const isPluginAvailable = (pluginName) => {
          const plugin = registeredPlugins.get(pluginName);
          if (plugin === null || plugin === void 0 ? void 0 : plugin.platforms.has(getPlatform())) {
            return true;
          }
          if (getPluginHeader(pluginName)) {
            return true;
          }
          return false;
        };
        const getPluginHeader = (pluginName) => {
          var _a;
          return (_a = cap.PluginHeaders) === null || _a === void 0 ? void 0 : _a.find((h) => h.name === pluginName);
        };
        const handleError = (err) => win.console.error(err);
        const registeredPlugins = /* @__PURE__ */ new Map();
        const registerPlugin2 = (pluginName, jsImplementations = {}) => {
          const registeredPlugin = registeredPlugins.get(pluginName);
          if (registeredPlugin) {
            console.warn(`Capacitor plugin "${pluginName}" already registered. Cannot register plugins twice.`);
            return registeredPlugin.proxy;
          }
          const platform = getPlatform();
          const pluginHeader = getPluginHeader(pluginName);
          let jsImplementation;
          const loadPluginImplementation = async () => {
            if (!jsImplementation && platform in jsImplementations) {
              jsImplementation = typeof jsImplementations[platform] === "function" ? jsImplementation = await jsImplementations[platform]() : jsImplementation = jsImplementations[platform];
            } else if (capCustomPlatform !== null && !jsImplementation && "web" in jsImplementations) {
              jsImplementation = typeof jsImplementations["web"] === "function" ? jsImplementation = await jsImplementations["web"]() : jsImplementation = jsImplementations["web"];
            }
            return jsImplementation;
          };
          const createPluginMethod = (impl, prop) => {
            var _a, _b;
            if (pluginHeader) {
              const methodHeader = pluginHeader === null || pluginHeader === void 0 ? void 0 : pluginHeader.methods.find((m) => prop === m.name);
              if (methodHeader) {
                if (methodHeader.rtype === "promise") {
                  return (options) => cap.nativePromise(pluginName, prop.toString(), options);
                } else {
                  return (options, callback) => cap.nativeCallback(pluginName, prop.toString(), options, callback);
                }
              } else if (impl) {
                return (_a = impl[prop]) === null || _a === void 0 ? void 0 : _a.bind(impl);
              }
            } else if (impl) {
              return (_b = impl[prop]) === null || _b === void 0 ? void 0 : _b.bind(impl);
            } else {
              throw new CapacitorException(`"${pluginName}" plugin is not implemented on ${platform}`, ExceptionCode.Unimplemented);
            }
          };
          const createPluginMethodWrapper = (prop) => {
            let remove;
            const wrapper = (...args) => {
              const p = loadPluginImplementation().then((impl) => {
                const fn = createPluginMethod(impl, prop);
                if (fn) {
                  const p2 = fn(...args);
                  remove = p2 === null || p2 === void 0 ? void 0 : p2.remove;
                  return p2;
                } else {
                  throw new CapacitorException(`"${pluginName}.${prop}()" is not implemented on ${platform}`, ExceptionCode.Unimplemented);
                }
              });
              if (prop === "addListener") {
                p.remove = async () => remove();
              }
              return p;
            };
            wrapper.toString = () => `${prop.toString()}() { [capacitor code] }`;
            Object.defineProperty(wrapper, "name", {
              value: prop,
              writable: false,
              configurable: false
            });
            return wrapper;
          };
          const addListener = createPluginMethodWrapper("addListener");
          const removeListener = createPluginMethodWrapper("removeListener");
          const addListenerNative = (eventName, callback) => {
            const call = addListener({ eventName }, callback);
            const remove = async () => {
              const callbackId = await call;
              removeListener({
                eventName,
                callbackId
              }, callback);
            };
            const p = new Promise((resolve2) => call.then(() => resolve2({ remove })));
            p.remove = async () => {
              console.warn(`Using addListener() without 'await' is deprecated.`);
              await remove();
            };
            return p;
          };
          const proxy = new Proxy({}, {
            get(_, prop) {
              switch (prop) {
                // https://github.com/facebook/react/issues/20030
                case "$$typeof":
                  return void 0;
                case "toJSON":
                  return () => ({});
                case "addListener":
                  return pluginHeader ? addListenerNative : addListener;
                case "removeListener":
                  return removeListener;
                default:
                  return createPluginMethodWrapper(prop);
              }
            }
          });
          Plugins[pluginName] = proxy;
          registeredPlugins.set(pluginName, {
            name: pluginName,
            proxy,
            platforms: /* @__PURE__ */ new Set([...Object.keys(jsImplementations), ...pluginHeader ? [platform] : []])
          });
          return proxy;
        };
        if (!cap.convertFileSrc) {
          cap.convertFileSrc = (filePath) => filePath;
        }
        cap.getPlatform = getPlatform;
        cap.handleError = handleError;
        cap.isNativePlatform = isNativePlatform;
        cap.isPluginAvailable = isPluginAvailable;
        cap.registerPlugin = registerPlugin2;
        cap.Exception = CapacitorException;
        cap.DEBUG = !!cap.DEBUG;
        cap.isLoggingEnabled = !!cap.isLoggingEnabled;
        return cap;
      };
      initCapacitorGlobal = (win) => win.Capacitor = createCapacitor(win);
      Capacitor = /* @__PURE__ */ initCapacitorGlobal(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : {});
      registerPlugin = Capacitor.registerPlugin;
      WebPlugin = class {
        constructor() {
          this.listeners = {};
          this.retainedEventArguments = {};
          this.windowListeners = {};
        }
        addListener(eventName, listenerFunc) {
          let firstListener = false;
          const listeners = this.listeners[eventName];
          if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
          }
          this.listeners[eventName].push(listenerFunc);
          const windowListener = this.windowListeners[eventName];
          if (windowListener && !windowListener.registered) {
            this.addWindowListener(windowListener);
          }
          if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
          }
          const remove = async () => this.removeListener(eventName, listenerFunc);
          const p = Promise.resolve({ remove });
          return p;
        }
        async removeAllListeners() {
          this.listeners = {};
          for (const listener in this.windowListeners) {
            this.removeWindowListener(this.windowListeners[listener]);
          }
          this.windowListeners = {};
        }
        notifyListeners(eventName, data, retainUntilConsumed) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            if (retainUntilConsumed) {
              let args = this.retainedEventArguments[eventName];
              if (!args) {
                args = [];
              }
              args.push(data);
              this.retainedEventArguments[eventName] = args;
            }
            return;
          }
          listeners.forEach((listener) => listener(data));
        }
        hasListeners(eventName) {
          var _a;
          return !!((_a = this.listeners[eventName]) === null || _a === void 0 ? void 0 : _a.length);
        }
        registerWindowListener(windowEventName, pluginEventName) {
          this.windowListeners[pluginEventName] = {
            registered: false,
            windowEventName,
            pluginEventName,
            handler: (event) => {
              this.notifyListeners(pluginEventName, event);
            }
          };
        }
        unimplemented(msg = "not implemented") {
          return new Capacitor.Exception(msg, ExceptionCode.Unimplemented);
        }
        unavailable(msg = "not available") {
          return new Capacitor.Exception(msg, ExceptionCode.Unavailable);
        }
        async removeListener(eventName, listenerFunc) {
          const listeners = this.listeners[eventName];
          if (!listeners) {
            return;
          }
          const index = listeners.indexOf(listenerFunc);
          this.listeners[eventName].splice(index, 1);
          if (!this.listeners[eventName].length) {
            this.removeWindowListener(this.windowListeners[eventName]);
          }
        }
        addWindowListener(handle) {
          window.addEventListener(handle.windowEventName, handle.handler);
          handle.registered = true;
        }
        removeWindowListener(handle) {
          if (!handle) {
            return;
          }
          window.removeEventListener(handle.windowEventName, handle.handler);
          handle.registered = false;
        }
        sendRetainedArgumentsForEvent(eventName) {
          const args = this.retainedEventArguments[eventName];
          if (!args) {
            return;
          }
          delete this.retainedEventArguments[eventName];
          args.forEach((arg) => {
            this.notifyListeners(eventName, arg);
          });
        }
      };
      encode = (str) => encodeURIComponent(str).replace(/%(2[346B]|5E|60|7C)/g, decodeURIComponent).replace(/[()]/g, escape);
      decode = (str) => str.replace(/(%[\dA-F]{2})+/gi, decodeURIComponent);
      CapacitorCookiesPluginWeb = class extends WebPlugin {
        async getCookies() {
          const cookies = document.cookie;
          const cookieMap = {};
          cookies.split(";").forEach((cookie) => {
            if (cookie.length <= 0)
              return;
            let [key, value] = cookie.replace(/=/, "CAP_COOKIE").split("CAP_COOKIE");
            key = decode(key).trim();
            value = decode(value).trim();
            cookieMap[key] = value;
          });
          return cookieMap;
        }
        async setCookie(options) {
          try {
            const encodedKey = encode(options.key);
            const encodedValue = encode(options.value);
            const expires = options.expires ? `; expires=${options.expires.replace("expires=", "")}` : "";
            const path = (options.path || "/").replace("path=", "");
            const domain = options.url != null && options.url.length > 0 ? `domain=${options.url}` : "";
            document.cookie = `${encodedKey}=${encodedValue || ""}${expires}; path=${path}; ${domain};`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async deleteCookie(options) {
          try {
            document.cookie = `${options.key}=; Max-Age=0`;
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearCookies() {
          try {
            const cookies = document.cookie.split(";") || [];
            for (const cookie of cookies) {
              document.cookie = cookie.replace(/^ +/, "").replace(/=.*/, `=;expires=${(/* @__PURE__ */ new Date()).toUTCString()};path=/`);
            }
          } catch (error) {
            return Promise.reject(error);
          }
        }
        async clearAllCookies() {
          try {
            await this.clearCookies();
          } catch (error) {
            return Promise.reject(error);
          }
        }
      };
      CapacitorCookies = registerPlugin("CapacitorCookies", {
        web: () => new CapacitorCookiesPluginWeb()
      });
      readBlobAsBase64 = async (blob) => new Promise((resolve2, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64String = reader.result;
          resolve2(base64String.indexOf(",") >= 0 ? base64String.split(",")[1] : base64String);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(blob);
      });
      normalizeHttpHeaders = (headers = {}) => {
        const originalKeys = Object.keys(headers);
        const loweredKeys = Object.keys(headers).map((k) => k.toLocaleLowerCase());
        const normalized = loweredKeys.reduce((acc, key, index) => {
          acc[key] = headers[originalKeys[index]];
          return acc;
        }, {});
        return normalized;
      };
      buildUrlParams = (params, shouldEncode = true) => {
        if (!params)
          return null;
        const output = Object.entries(params).reduce((accumulator, entry) => {
          const [key, value] = entry;
          let encodedValue;
          let item;
          if (Array.isArray(value)) {
            item = "";
            value.forEach((str) => {
              encodedValue = shouldEncode ? encodeURIComponent(str) : str;
              item += `${key}=${encodedValue}&`;
            });
            item.slice(0, -1);
          } else {
            encodedValue = shouldEncode ? encodeURIComponent(value) : value;
            item = `${key}=${encodedValue}`;
          }
          return `${accumulator}&${item}`;
        }, "");
        return output.substr(1);
      };
      buildRequestInit = (options, extra = {}) => {
        const output = Object.assign({ method: options.method || "GET", headers: options.headers }, extra);
        const headers = normalizeHttpHeaders(options.headers);
        const type = headers["content-type"] || "";
        if (typeof options.data === "string") {
          output.body = options.data;
        } else if (type.includes("application/x-www-form-urlencoded")) {
          const params = new URLSearchParams();
          for (const [key, value] of Object.entries(options.data || {})) {
            params.set(key, value);
          }
          output.body = params.toString();
        } else if (type.includes("multipart/form-data") || options.data instanceof FormData) {
          const form = new FormData();
          if (options.data instanceof FormData) {
            options.data.forEach((value, key) => {
              form.append(key, value);
            });
          } else {
            for (const key of Object.keys(options.data)) {
              form.append(key, options.data[key]);
            }
          }
          output.body = form;
          const headers2 = new Headers(output.headers);
          headers2.delete("content-type");
          output.headers = headers2;
        } else if (type.includes("application/json") || typeof options.data === "object") {
          output.body = JSON.stringify(options.data);
        }
        return output;
      };
      CapacitorHttpPluginWeb = class extends WebPlugin {
        /**
         * Perform an Http request given a set of options
         * @param options Options to build the HTTP request
         */
        async request(options) {
          const requestInit = buildRequestInit(options, options.webFetchExtra);
          const urlParams = buildUrlParams(options.params, options.shouldEncodeUrlParams);
          const url = urlParams ? `${options.url}?${urlParams}` : options.url;
          const response = await fetch(url, requestInit);
          const contentType = response.headers.get("content-type") || "";
          let { responseType = "text" } = response.ok ? options : {};
          if (contentType.includes("application/json")) {
            responseType = "json";
          }
          let data;
          let blob;
          switch (responseType) {
            case "arraybuffer":
            case "blob":
              blob = await response.blob();
              data = await readBlobAsBase64(blob);
              break;
            case "json":
              data = await response.json();
              break;
            case "document":
            case "text":
            default:
              data = await response.text();
          }
          const headers = {};
          response.headers.forEach((value, key) => {
            headers[key] = value;
          });
          return {
            data,
            headers,
            status: response.status,
            url: response.url
          };
        }
        /**
         * Perform an Http GET request given a set of options
         * @param options Options to build the HTTP request
         */
        async get(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "GET" }));
        }
        /**
         * Perform an Http POST request given a set of options
         * @param options Options to build the HTTP request
         */
        async post(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "POST" }));
        }
        /**
         * Perform an Http PUT request given a set of options
         * @param options Options to build the HTTP request
         */
        async put(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PUT" }));
        }
        /**
         * Perform an Http PATCH request given a set of options
         * @param options Options to build the HTTP request
         */
        async patch(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "PATCH" }));
        }
        /**
         * Perform an Http DELETE request given a set of options
         * @param options Options to build the HTTP request
         */
        async delete(options) {
          return this.request(Object.assign(Object.assign({}, options), { method: "DELETE" }));
        }
      };
      CapacitorHttp = registerPlugin("CapacitorHttp", {
        web: () => new CapacitorHttpPluginWeb()
      });
      (function(SystemBarsStyle2) {
        SystemBarsStyle2["Dark"] = "DARK";
        SystemBarsStyle2["Light"] = "LIGHT";
        SystemBarsStyle2["Default"] = "DEFAULT";
      })(SystemBarsStyle || (SystemBarsStyle = {}));
      (function(SystemBarType2) {
        SystemBarType2["StatusBar"] = "StatusBar";
        SystemBarType2["NavigationBar"] = "NavigationBar";
      })(SystemBarType || (SystemBarType = {}));
      SystemBarsPluginWeb = class extends WebPlugin {
        async setStyle() {
          this.unavailable("not available for web");
        }
        async setAnimation() {
          this.unavailable("not available for web");
        }
        async show() {
          this.unavailable("not available for web");
        }
        async hide() {
          this.unavailable("not available for web");
        }
      };
      SystemBars = registerPlugin("SystemBars", {
        web: () => new SystemBarsPluginWeb()
      });
    }
  });

  // node_modules/@capacitor/filesystem/dist/esm/definitions.js
  var Directory, Encoding;
  var init_definitions = __esm({
    "node_modules/@capacitor/filesystem/dist/esm/definitions.js"() {
      (function(Directory2) {
        Directory2["Documents"] = "DOCUMENTS";
        Directory2["Data"] = "DATA";
        Directory2["Library"] = "LIBRARY";
        Directory2["Cache"] = "CACHE";
        Directory2["External"] = "EXTERNAL";
        Directory2["ExternalStorage"] = "EXTERNAL_STORAGE";
        Directory2["ExternalCache"] = "EXTERNAL_CACHE";
        Directory2["LibraryNoCloud"] = "LIBRARY_NO_CLOUD";
        Directory2["Temporary"] = "TEMPORARY";
      })(Directory || (Directory = {}));
      (function(Encoding2) {
        Encoding2["UTF8"] = "utf8";
        Encoding2["ASCII"] = "ascii";
        Encoding2["UTF16"] = "utf16";
      })(Encoding || (Encoding = {}));
    }
  });

  // node_modules/@capacitor/filesystem/dist/esm/web.js
  var web_exports = {};
  __export(web_exports, {
    FilesystemWeb: () => FilesystemWeb
  });
  function resolve(path) {
    const posix = path.split("/").filter((item) => item !== ".");
    const newPosix = [];
    posix.forEach((item) => {
      if (item === ".." && newPosix.length > 0 && newPosix[newPosix.length - 1] !== "..") {
        newPosix.pop();
      } else {
        newPosix.push(item);
      }
    });
    return newPosix.join("/");
  }
  function isPathParent(parent, children) {
    parent = resolve(parent);
    children = resolve(children);
    const pathsA = parent.split("/");
    const pathsB = children.split("/");
    return parent !== children && pathsA.every((value, index) => value === pathsB[index]);
  }
  var FilesystemWeb;
  var init_web = __esm({
    "node_modules/@capacitor/filesystem/dist/esm/web.js"() {
      init_dist();
      init_definitions();
      FilesystemWeb = class _FilesystemWeb extends WebPlugin {
        constructor() {
          super(...arguments);
          this.DB_VERSION = 1;
          this.DB_NAME = "Disc";
          this._writeCmds = ["add", "put", "delete"];
          this.downloadFile = async (options) => {
            var _a, _b;
            const requestInit = buildRequestInit(options, options.webFetchExtra);
            const response = await fetch(options.url, requestInit);
            let blob;
            if (!options.progress)
              blob = await response.blob();
            else if (!(response === null || response === void 0 ? void 0 : response.body))
              blob = new Blob();
            else {
              const reader = response.body.getReader();
              let bytes = 0;
              const chunks = [];
              const contentType = response.headers.get("content-type");
              const contentLength = parseInt(response.headers.get("content-length") || "0", 10);
              while (true) {
                const { done, value } = await reader.read();
                if (done)
                  break;
                chunks.push(value);
                bytes += (value === null || value === void 0 ? void 0 : value.length) || 0;
                const status = {
                  url: options.url,
                  bytes,
                  contentLength
                };
                this.notifyListeners("progress", status);
              }
              const allChunks = new Uint8Array(bytes);
              let position = 0;
              for (const chunk of chunks) {
                if (typeof chunk === "undefined")
                  continue;
                allChunks.set(chunk, position);
                position += chunk.length;
              }
              blob = new Blob([allChunks.buffer], { type: contentType || void 0 });
            }
            const result = await this.writeFile({
              path: options.path,
              directory: (_a = options.directory) !== null && _a !== void 0 ? _a : void 0,
              recursive: (_b = options.recursive) !== null && _b !== void 0 ? _b : false,
              data: blob
            });
            return { path: result.uri, blob };
          };
        }
        readFileInChunks(_options, _callback) {
          throw this.unavailable("Method not implemented.");
        }
        async initDb() {
          if (this._db !== void 0) {
            return this._db;
          }
          if (!("indexedDB" in window)) {
            throw this.unavailable("This browser doesn't support IndexedDB");
          }
          return new Promise((resolve2, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onupgradeneeded = _FilesystemWeb.doUpgrade;
            request.onsuccess = () => {
              this._db = request.result;
              resolve2(request.result);
            };
            request.onerror = () => reject(request.error);
            request.onblocked = () => {
              console.warn("db blocked");
            };
          });
        }
        static doUpgrade(event) {
          const eventTarget = event.target;
          const db2 = eventTarget.result;
          switch (event.oldVersion) {
            case 0:
            case 1:
            default: {
              if (db2.objectStoreNames.contains("FileStorage")) {
                db2.deleteObjectStore("FileStorage");
              }
              const store = db2.createObjectStore("FileStorage", { keyPath: "path" });
              store.createIndex("by_folder", "folder");
            }
          }
        }
        async dbRequest(cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const req = store[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        async dbIndexRequest(indexName, cmd, args) {
          const readFlag = this._writeCmds.indexOf(cmd) !== -1 ? "readwrite" : "readonly";
          return this.initDb().then((conn) => {
            return new Promise((resolve2, reject) => {
              const tx = conn.transaction(["FileStorage"], readFlag);
              const store = tx.objectStore("FileStorage");
              const index = store.index(indexName);
              const req = index[cmd](...args);
              req.onsuccess = () => resolve2(req.result);
              req.onerror = () => reject(req.error);
            });
          });
        }
        getPath(directory, uriPath) {
          const cleanedUriPath = uriPath !== void 0 ? uriPath.replace(/^[/]+|[/]+$/g, "") : "";
          let fsPath = "";
          if (directory !== void 0)
            fsPath += "/" + directory;
          if (uriPath !== "")
            fsPath += "/" + cleanedUriPath;
          return fsPath;
        }
        async clear() {
          const conn = await this.initDb();
          const tx = conn.transaction(["FileStorage"], "readwrite");
          const store = tx.objectStore("FileStorage");
          store.clear();
        }
        /**
         * Read a file from disk
         * @param options options for the file read
         * @return a promise that resolves with the read file data result
         */
        async readFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          return { data: entry.content ? entry.content : "" };
        }
        /**
         * Write a file to disk in the specified location on device
         * @param options options for the file write
         * @return a promise that resolves with the file write result
         */
        async writeFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const doRecursive = options.recursive;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: doRecursive
              });
            }
          }
          if (!encoding && !(data instanceof Blob)) {
            data = data.indexOf(",") >= 0 ? data.split(",")[1] : data;
            if (!this.isBase64String(data))
              throw Error("The supplied data is not valid base64 content.");
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data instanceof Blob ? data.size : data.length,
            ctime: now,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
          return {
            uri: pathObj.path
          };
        }
        /**
         * Append to a file on disk in the specified location on device
         * @param options options for the file append
         * @return a promise that resolves with the file write result
         */
        async appendFile(options) {
          const path = this.getPath(options.directory, options.path);
          let data = options.data;
          const encoding = options.encoding;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const now = Date.now();
          let ctime = now;
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (occupiedEntry && occupiedEntry.type === "directory")
            throw Error("The supplied path is a directory.");
          const parentEntry = await this.dbRequest("get", [parentPath]);
          if (parentEntry === void 0) {
            const subDirIndex = parentPath.indexOf("/", 1);
            if (subDirIndex !== -1) {
              const parentArgPath = parentPath.substr(subDirIndex);
              await this.mkdir({
                path: parentArgPath,
                directory: options.directory,
                recursive: true
              });
            }
          }
          if (!encoding && !this.isBase64String(data))
            throw Error("The supplied data is not valid base64 content.");
          if (occupiedEntry !== void 0) {
            if (occupiedEntry.content instanceof Blob) {
              throw Error("The occupied entry contains a Blob object which cannot be appended to.");
            }
            if (occupiedEntry.content !== void 0 && !encoding) {
              data = btoa(atob(occupiedEntry.content) + atob(data));
            } else {
              data = occupiedEntry.content + data;
            }
            ctime = occupiedEntry.ctime;
          }
          const pathObj = {
            path,
            folder: parentPath,
            type: "file",
            size: data.length,
            ctime,
            mtime: now,
            content: data
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Delete a file from disk
         * @param options options for the file delete
         * @return a promise that resolves with the deleted file data result
         */
        async deleteFile(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (entry === void 0)
            throw Error("File does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          if (entries.length !== 0)
            throw Error("Folder is not empty.");
          await this.dbRequest("delete", [path]);
        }
        /**
         * Create a directory.
         * @param options options for the mkdir
         * @return a promise that resolves with the mkdir result
         */
        async mkdir(options) {
          const path = this.getPath(options.directory, options.path);
          const doRecursive = options.recursive;
          const parentPath = path.substr(0, path.lastIndexOf("/"));
          const depth = (path.match(/\//g) || []).length;
          const parentEntry = await this.dbRequest("get", [parentPath]);
          const occupiedEntry = await this.dbRequest("get", [path]);
          if (depth === 1)
            throw Error("Cannot create Root directory");
          if (occupiedEntry !== void 0)
            throw Error("Current directory does already exist.");
          if (!doRecursive && depth !== 2 && parentEntry === void 0)
            throw Error("Parent directory must exist");
          if (doRecursive && depth !== 2 && parentEntry === void 0) {
            const parentArgPath = parentPath.substr(parentPath.indexOf("/", 1));
            await this.mkdir({
              path: parentArgPath,
              directory: options.directory,
              recursive: doRecursive
            });
          }
          const now = Date.now();
          const pathObj = {
            path,
            folder: parentPath,
            type: "directory",
            size: 0,
            ctime: now,
            mtime: now
          };
          await this.dbRequest("put", [pathObj]);
        }
        /**
         * Remove a directory
         * @param options the options for the directory remove
         */
        async rmdir(options) {
          const { path, directory, recursive } = options;
          const fullPath = this.getPath(directory, path);
          const entry = await this.dbRequest("get", [fullPath]);
          if (entry === void 0)
            throw Error("Folder does not exist.");
          if (entry.type !== "directory")
            throw Error("Requested path is not a directory");
          const readDirResult = await this.readdir({ path, directory });
          if (readDirResult.files.length !== 0 && !recursive)
            throw Error("Folder is not empty");
          for (const entry2 of readDirResult.files) {
            const entryPath = `${path}/${entry2.name}`;
            const entryObj = await this.stat({ path: entryPath, directory });
            if (entryObj.type === "file") {
              await this.deleteFile({ path: entryPath, directory });
            } else {
              await this.rmdir({ path: entryPath, directory, recursive });
            }
          }
          await this.dbRequest("delete", [fullPath]);
        }
        /**
         * Return a list of files from the directory (not recursive)
         * @param options the options for the readdir operation
         * @return a promise that resolves with the readdir directory listing result
         */
        async readdir(options) {
          const path = this.getPath(options.directory, options.path);
          const entry = await this.dbRequest("get", [path]);
          if (options.path !== "" && entry === void 0)
            throw Error("Folder does not exist.");
          const entries = await this.dbIndexRequest("by_folder", "getAllKeys", [IDBKeyRange.only(path)]);
          const files = await Promise.all(entries.map(async (e) => {
            let subEntry = await this.dbRequest("get", [e]);
            if (subEntry === void 0) {
              subEntry = await this.dbRequest("get", [e + "/"]);
            }
            return {
              name: e.substring(path.length + 1),
              type: subEntry.type,
              size: subEntry.size,
              ctime: subEntry.ctime,
              mtime: subEntry.mtime,
              uri: subEntry.path
            };
          }));
          return { files };
        }
        /**
         * Return full File URI for a path and directory
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async getUri(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          return {
            uri: (entry === null || entry === void 0 ? void 0 : entry.path) || path
          };
        }
        /**
         * Return data about a file
         * @param options the options for the stat operation
         * @return a promise that resolves with the file stat result
         */
        async stat(options) {
          const path = this.getPath(options.directory, options.path);
          let entry = await this.dbRequest("get", [path]);
          if (entry === void 0) {
            entry = await this.dbRequest("get", [path + "/"]);
          }
          if (entry === void 0)
            throw Error("Entry does not exist.");
          return {
            name: entry.path.substring(path.length + 1),
            type: entry.type,
            size: entry.size,
            ctime: entry.ctime,
            mtime: entry.mtime,
            uri: entry.path
          };
        }
        /**
         * Rename a file or directory
         * @param options the options for the rename operation
         * @return a promise that resolves with the rename result
         */
        async rename(options) {
          await this._copy(options, true);
          return;
        }
        /**
         * Copy a file or directory
         * @param options the options for the copy operation
         * @return a promise that resolves with the copy result
         */
        async copy(options) {
          return this._copy(options, false);
        }
        async requestPermissions() {
          return { publicStorage: "granted" };
        }
        async checkPermissions() {
          return { publicStorage: "granted" };
        }
        /**
         * Function that can perform a copy or a rename
         * @param options the options for the rename operation
         * @param doRename whether to perform a rename or copy operation
         * @return a promise that resolves with the result
         */
        async _copy(options, doRename = false) {
          let { toDirectory } = options;
          const { to, from, directory: fromDirectory } = options;
          if (!to || !from) {
            throw Error("Both to and from must be provided");
          }
          if (!toDirectory) {
            toDirectory = fromDirectory;
          }
          const fromPath = this.getPath(fromDirectory, from);
          const toPath = this.getPath(toDirectory, to);
          if (fromPath === toPath) {
            return {
              uri: toPath
            };
          }
          if (isPathParent(fromPath, toPath)) {
            throw Error("To path cannot contain the from path");
          }
          let toObj;
          try {
            toObj = await this.stat({
              path: to,
              directory: toDirectory
            });
          } catch (e) {
            const toPathComponents = to.split("/");
            toPathComponents.pop();
            const toPath2 = toPathComponents.join("/");
            if (toPathComponents.length > 0) {
              const toParentDirectory = await this.stat({
                path: toPath2,
                directory: toDirectory
              });
              if (toParentDirectory.type !== "directory") {
                throw new Error("Parent directory of the to path is a file");
              }
            }
          }
          if (toObj && toObj.type === "directory") {
            throw new Error("Cannot overwrite a directory with a file");
          }
          const fromObj = await this.stat({
            path: from,
            directory: fromDirectory
          });
          const updateTime = async (path, ctime2, mtime) => {
            const fullPath = this.getPath(toDirectory, path);
            const entry = await this.dbRequest("get", [fullPath]);
            entry.ctime = ctime2;
            entry.mtime = mtime;
            await this.dbRequest("put", [entry]);
          };
          const ctime = fromObj.ctime ? fromObj.ctime : Date.now();
          switch (fromObj.type) {
            // The "from" object is a file
            case "file": {
              const file = await this.readFile({
                path: from,
                directory: fromDirectory
              });
              if (doRename) {
                await this.deleteFile({
                  path: from,
                  directory: fromDirectory
                });
              }
              let encoding;
              if (!(file.data instanceof Blob) && !this.isBase64String(file.data)) {
                encoding = Encoding.UTF8;
              }
              const writeResult = await this.writeFile({
                path: to,
                directory: toDirectory,
                data: file.data,
                encoding
              });
              if (doRename) {
                await updateTime(to, ctime, fromObj.mtime);
              }
              return writeResult;
            }
            case "directory": {
              if (toObj) {
                throw Error("Cannot move a directory over an existing object");
              }
              try {
                await this.mkdir({
                  path: to,
                  directory: toDirectory,
                  recursive: false
                });
                if (doRename) {
                  await updateTime(to, ctime, fromObj.mtime);
                }
              } catch (e) {
              }
              const contents = (await this.readdir({
                path: from,
                directory: fromDirectory
              })).files;
              for (const filename of contents) {
                await this._copy({
                  from: `${from}/${filename.name}`,
                  to: `${to}/${filename.name}`,
                  directory: fromDirectory,
                  toDirectory
                }, doRename);
              }
              if (doRename) {
                await this.rmdir({
                  path: from,
                  directory: fromDirectory
                });
              }
            }
          }
          return {
            uri: toPath
          };
        }
        isBase64String(str) {
          try {
            return btoa(atob(str)) == str;
          } catch (err) {
            return false;
          }
        }
      };
      FilesystemWeb._debug = true;
    }
  });

  // node_modules/@capacitor/share/dist/esm/web.js
  var web_exports2 = {};
  __export(web_exports2, {
    ShareWeb: () => ShareWeb
  });
  var ShareWeb;
  var init_web2 = __esm({
    "node_modules/@capacitor/share/dist/esm/web.js"() {
      init_dist();
      ShareWeb = class extends WebPlugin {
        async canShare() {
          if (typeof navigator === "undefined" || !navigator.share) {
            return { value: false };
          } else {
            return { value: true };
          }
        }
        async share(options) {
          if (typeof navigator === "undefined" || !navigator.share) {
            throw this.unavailable("Share API not available in this browser");
          }
          await navigator.share({
            title: options.title,
            text: options.text,
            url: options.url
          });
          return {};
        }
      };
    }
  });

  // node_modules/@capacitor-community/sqlite/dist/esm/web.js
  var web_exports3 = {};
  __export(web_exports3, {
    CapacitorSQLiteWeb: () => CapacitorSQLiteWeb
  });
  var CapacitorSQLiteWeb;
  var init_web3 = __esm({
    "node_modules/@capacitor-community/sqlite/dist/esm/web.js"() {
      init_dist();
      CapacitorSQLiteWeb = class extends WebPlugin {
        constructor() {
          super(...arguments);
          this.jeepSqliteElement = null;
          this.isWebStoreOpen = false;
        }
        async initWebStore() {
          await customElements.whenDefined("jeep-sqlite");
          this.jeepSqliteElement = document.querySelector("jeep-sqlite");
          this.ensureJeepSqliteIsAvailable();
          this.jeepSqliteElement.addEventListener("jeepSqliteImportProgress", (event) => {
            this.notifyListeners("sqliteImportProgressEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteExportProgress", (event) => {
            this.notifyListeners("sqliteExportProgressEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteHTTPRequestEnded", (event) => {
            this.notifyListeners("sqliteHTTPRequestEndedEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqlitePickDatabaseEnded", (event) => {
            this.notifyListeners("sqlitePickDatabaseEndedEvent", event.detail);
          });
          this.jeepSqliteElement.addEventListener("jeepSqliteSaveDatabaseToDisk", (event) => {
            this.notifyListeners("sqliteSaveDatabaseToDiskEvent", event.detail);
          });
          if (!this.isWebStoreOpen) {
            this.isWebStoreOpen = await this.jeepSqliteElement.isStoreOpen();
          }
          return;
        }
        async saveToStore(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.saveToStore(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getFromLocalDiskToStore(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.getFromLocalDiskToStore(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async saveToLocalDisk(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.saveToLocalDisk(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async echo(options) {
          this.ensureJeepSqliteIsAvailable();
          const echoResult = await this.jeepSqliteElement.echo(options);
          return echoResult;
        }
        async createConnection(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.createConnection(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async open(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.open(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async closeConnection(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.closeConnection(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getVersion(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const versionResult = await this.jeepSqliteElement.getVersion(options);
            return versionResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async checkConnectionsConsistency(options) {
          this.ensureJeepSqliteIsAvailable();
          try {
            const consistencyResult = await this.jeepSqliteElement.checkConnectionsConsistency(options);
            return consistencyResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async close(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.close(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async beginTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.beginTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async commitTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.commitTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async rollbackTransaction(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const changes = await this.jeepSqliteElement.rollbackTransaction(options);
            return changes;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isTransactionActive(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const result = await this.jeepSqliteElement.isTransactionActive(options);
            return result;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getTableList(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const tableListResult = await this.jeepSqliteElement.getTableList(options);
            return tableListResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async execute(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const executeResult = await this.jeepSqliteElement.execute(options);
            return executeResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async executeSet(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const executeResult = await this.jeepSqliteElement.executeSet(options);
            return executeResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async run(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const runResult = await this.jeepSqliteElement.run(options);
            return runResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async query(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const queryResult = await this.jeepSqliteElement.query(options);
            return queryResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDBExists(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const dbExistsResult = await this.jeepSqliteElement.isDBExists(options);
            return dbExistsResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDBOpen(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isDBOpenResult = await this.jeepSqliteElement.isDBOpen(options);
            return isDBOpenResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isDatabase(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isDatabaseResult = await this.jeepSqliteElement.isDatabase(options);
            return isDatabaseResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isTableExists(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const tableExistsResult = await this.jeepSqliteElement.isTableExists(options);
            return tableExistsResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async deleteDatabase(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.deleteDatabase(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async isJsonValid(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const isJsonValidResult = await this.jeepSqliteElement.isJsonValid(options);
            return isJsonValidResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async importFromJson(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const importFromJsonResult = await this.jeepSqliteElement.importFromJson(options);
            return importFromJsonResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async exportToJson(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const exportToJsonResult = await this.jeepSqliteElement.exportToJson(options);
            return exportToJsonResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async createSyncTable(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const createSyncTableResult = await this.jeepSqliteElement.createSyncTable(options);
            return createSyncTableResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async setSyncDate(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.setSyncDate(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getSyncDate(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const getSyncDateResult = await this.jeepSqliteElement.getSyncDate(options);
            return getSyncDateResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async deleteExportedRows(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.deleteExportedRows(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async addUpgradeStatement(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.addUpgradeStatement(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async copyFromAssets(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.copyFromAssets(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getFromHTTPRequest(options) {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            await this.jeepSqliteElement.getFromHTTPRequest(options);
            return;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        async getDatabaseList() {
          this.ensureJeepSqliteIsAvailable();
          this.ensureWebstoreIsOpen();
          try {
            const databaseListResult = await this.jeepSqliteElement.getDatabaseList();
            return databaseListResult;
          } catch (err) {
            throw new Error(`${err}`);
          }
        }
        /**
         * Checks if the `jeep-sqlite` element is present in the DOM.
         * If it's not in the DOM, this method throws an Error.
         *
         * Attention: This will always fail, if the `intWebStore()` method wasn't called before.
         */
        ensureJeepSqliteIsAvailable() {
          if (this.jeepSqliteElement === null) {
            throw new Error(`The jeep-sqlite element is not present in the DOM! Please check the @capacitor-community/sqlite documentation for instructions regarding the web platform.`);
          }
        }
        ensureWebstoreIsOpen() {
          if (!this.isWebStoreOpen) {
            throw new Error('WebStore is not open yet. You have to call "initWebStore()" first.');
          }
        }
        ////////////////////////////////////
        ////// UNIMPLEMENTED METHODS
        ////////////////////////////////////
        async getUrl() {
          throw this.unimplemented("Not implemented on web.");
        }
        async getMigratableDbList(options) {
          console.log("getMigratableDbList", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async addSQLiteSuffix(options) {
          console.log("addSQLiteSuffix", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async deleteOldDatabases(options) {
          console.log("deleteOldDatabases", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async moveDatabasesAndAddSuffix(options) {
          console.log("moveDatabasesAndAddSuffix", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isSecretStored() {
          throw this.unimplemented("Not implemented on web.");
        }
        async setEncryptionSecret(options) {
          console.log("setEncryptionSecret", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async changeEncryptionSecret(options) {
          console.log("changeEncryptionSecret", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async clearEncryptionSecret() {
          console.log("clearEncryptionSecret");
          throw this.unimplemented("Not implemented on web.");
        }
        async checkEncryptionSecret(options) {
          console.log("checkEncryptionPassPhrase", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async getNCDatabasePath(options) {
          console.log("getNCDatabasePath", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async createNCConnection(options) {
          console.log("createNCConnection", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async closeNCConnection(options) {
          console.log("closeNCConnection", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isNCDatabase(options) {
          console.log("isNCDatabase", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isDatabaseEncrypted(options) {
          console.log("isDatabaseEncrypted", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async isInConfigEncryption() {
          throw this.unimplemented("Not implemented on web.");
        }
        async isInConfigBiometricAuth() {
          throw this.unimplemented("Not implemented on web.");
        }
        async loadExtension(options) {
          console.log("loadExtension", options);
          throw this.unimplemented("Not implemented on web.");
        }
        async enableLoadExtension(options) {
          console.log("enableLoadExtension", options);
          throw this.unimplemented("Not implemented on web.");
        }
      };
    }
  });

  // native-storage.ts
  init_dist();

  // node_modules/@capacitor/filesystem/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor/synapse/dist/synapse.mjs
  function s(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return new Proxy({}, {
            get(w, o) {
              return (c, p, r) => {
                const i = t.Capacitor.Plugins[n];
                if (i === void 0) {
                  r(new Error(`Capacitor plugin ${n} not found`));
                  return;
                }
                if (typeof i[o] != "function") {
                  r(new Error(`Method ${o} not found in Capacitor plugin ${n}`));
                  return;
                }
                (async () => {
                  try {
                    const a = await i[o](c);
                    p(a);
                  } catch (a) {
                    r(a);
                  }
                })();
              };
            }
          });
        }
      }
    );
  }
  function u(t) {
    t.CapacitorUtils.Synapse = new Proxy(
      {},
      {
        get(e, n) {
          return t.cordova.plugins[n];
        }
      }
    );
  }
  function f(t = false) {
    typeof window > "u" || (window.CapacitorUtils = window.CapacitorUtils || {}, window.Capacitor !== void 0 && !t ? s(window) : window.cordova !== void 0 && u(window));
  }

  // node_modules/@capacitor/filesystem/dist/esm/index.js
  init_definitions();
  var Filesystem = registerPlugin("Filesystem", {
    web: () => Promise.resolve().then(() => (init_web(), web_exports)).then((m) => new m.FilesystemWeb())
  });
  f();

  // node_modules/@capacitor/share/dist/esm/index.js
  init_dist();
  var Share = registerPlugin("Share", {
    web: () => Promise.resolve().then(() => (init_web2(), web_exports2)).then((m) => new m.ShareWeb())
  });

  // node_modules/@capacitor-community/sqlite/dist/esm/index.js
  init_dist();

  // node_modules/@capacitor-community/sqlite/dist/esm/definitions.js
  var SQLiteConnection = class {
    constructor(sqlite) {
      this.sqlite = sqlite;
      this._connectionDict = /* @__PURE__ */ new Map();
    }
    async initWebStore() {
      try {
        await this.sqlite.initWebStore();
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async saveToStore(database) {
      try {
        await this.sqlite.saveToStore({ database });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async saveToLocalDisk(database) {
      try {
        await this.sqlite.saveToLocalDisk({ database });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getFromLocalDiskToStore(overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.getFromLocalDiskToStore({ overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async echo(value) {
      try {
        const res = await this.sqlite.echo({ value });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isSecretStored() {
      try {
        const res = await this.sqlite.isSecretStored();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async setEncryptionSecret(passphrase) {
      try {
        await this.sqlite.setEncryptionSecret({ passphrase });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async changeEncryptionSecret(passphrase, oldpassphrase) {
      try {
        await this.sqlite.changeEncryptionSecret({
          passphrase,
          oldpassphrase
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async clearEncryptionSecret() {
      try {
        await this.sqlite.clearEncryptionSecret();
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async checkEncryptionSecret(passphrase) {
      try {
        const res = await this.sqlite.checkEncryptionSecret({
          passphrase
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async addUpgradeStatement(database, upgrade) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.addUpgradeStatement({
          database,
          upgrade
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createConnection(database, encrypted, mode, version, readonly) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.createConnection({
          database,
          encrypted,
          mode,
          version,
          readonly
        });
        const conn = new SQLiteDBConnection(database, readonly, this.sqlite);
        const connName = readonly ? `RO_${database}` : `RW_${database}`;
        this._connectionDict.set(connName, conn);
        return Promise.resolve(conn);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async closeConnection(database, readonly) {
      try {
        if (database.endsWith(".db"))
          database = database.slice(0, -3);
        await this.sqlite.closeConnection({ database, readonly });
        const connName = readonly ? `RO_${database}` : `RW_${database}`;
        this._connectionDict.delete(connName);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isConnection(database, readonly) {
      const res = {};
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      const connName = readonly ? `RO_${database}` : `RW_${database}`;
      res.result = this._connectionDict.has(connName);
      return Promise.resolve(res);
    }
    async retrieveConnection(database, readonly) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      const connName = readonly ? `RO_${database}` : `RW_${database}`;
      if (this._connectionDict.has(connName)) {
        const conn = this._connectionDict.get(connName);
        if (typeof conn != "undefined")
          return Promise.resolve(conn);
        else {
          return Promise.reject(`Connection ${database} is undefined`);
        }
      } else {
        return Promise.reject(`Connection ${database} does not exist`);
      }
    }
    async getNCDatabasePath(path, database) {
      try {
        const databasePath = await this.sqlite.getNCDatabasePath({
          path,
          database
        });
        return Promise.resolve(databasePath);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createNCConnection(databasePath, version) {
      try {
        await this.sqlite.createNCConnection({
          databasePath,
          version
        });
        const conn = new SQLiteDBConnection(databasePath, true, this.sqlite);
        const connName = `RO_${databasePath})`;
        this._connectionDict.set(connName, conn);
        return Promise.resolve(conn);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async closeNCConnection(databasePath) {
      try {
        await this.sqlite.closeNCConnection({ databasePath });
        const connName = `RO_${databasePath})`;
        this._connectionDict.delete(connName);
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isNCConnection(databasePath) {
      const res = {};
      const connName = `RO_${databasePath})`;
      res.result = this._connectionDict.has(connName);
      return Promise.resolve(res);
    }
    async retrieveNCConnection(databasePath) {
      if (this._connectionDict.has(databasePath)) {
        const connName = `RO_${databasePath})`;
        const conn = this._connectionDict.get(connName);
        if (typeof conn != "undefined")
          return Promise.resolve(conn);
        else {
          return Promise.reject(`Connection ${databasePath} is undefined`);
        }
      } else {
        return Promise.reject(`Connection ${databasePath} does not exist`);
      }
    }
    async isNCDatabase(databasePath) {
      try {
        const res = await this.sqlite.isNCDatabase({ databasePath });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async retrieveAllConnections() {
      return this._connectionDict;
    }
    async closeAllConnections() {
      const delDict = /* @__PURE__ */ new Map();
      try {
        for (const key of this._connectionDict.keys()) {
          const database = key.substring(3);
          const readonly = key.substring(0, 3) === "RO_" ? true : false;
          await this.sqlite.closeConnection({ database, readonly });
          delDict.set(key, null);
        }
        for (const key of delDict.keys()) {
          this._connectionDict.delete(key);
        }
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async checkConnectionsConsistency() {
      try {
        const keys = [...this._connectionDict.keys()];
        const openModes = [];
        const dbNames = [];
        for (const key of keys) {
          openModes.push(key.substring(0, 2));
          dbNames.push(key.substring(3));
        }
        const res = await this.sqlite.checkConnectionsConsistency({
          dbNames,
          openModes
        });
        if (!res.result)
          this._connectionDict = /* @__PURE__ */ new Map();
        return Promise.resolve(res);
      } catch (err) {
        this._connectionDict = /* @__PURE__ */ new Map();
        return Promise.reject(err);
      }
    }
    async importFromJson(jsonstring) {
      try {
        const ret = await this.sqlite.importFromJson({ jsonstring });
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isJsonValid(jsonstring) {
      try {
        const ret = await this.sqlite.isJsonValid({ jsonstring });
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async copyFromAssets(overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.copyFromAssets({ overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getFromHTTPRequest(url, overwrite) {
      const mOverwrite = overwrite != null ? overwrite : true;
      try {
        await this.sqlite.getFromHTTPRequest({ url, overwrite: mOverwrite });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDatabaseEncrypted(database) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      try {
        const res = await this.sqlite.isDatabaseEncrypted({ database });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isInConfigEncryption() {
      try {
        const res = await this.sqlite.isInConfigEncryption();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isInConfigBiometricAuth() {
      try {
        const res = await this.sqlite.isInConfigBiometricAuth();
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDatabase(database) {
      if (database.endsWith(".db"))
        database = database.slice(0, -3);
      try {
        const res = await this.sqlite.isDatabase({ database });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getDatabaseList() {
      try {
        const res = await this.sqlite.getDatabaseList();
        const values = res.values;
        values.sort();
        const ret = { values };
        return Promise.resolve(ret);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getMigratableDbList(folderPath) {
      const path = folderPath ? folderPath : "default";
      try {
        const res = await this.sqlite.getMigratableDbList({
          folderPath: path
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async addSQLiteSuffix(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      try {
        const res = await this.sqlite.addSQLiteSuffix({
          folderPath: path,
          dbNameList: dbList
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async deleteOldDatabases(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      try {
        const res = await this.sqlite.deleteOldDatabases({
          folderPath: path,
          dbNameList: dbList
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async moveDatabasesAndAddSuffix(folderPath, dbNameList) {
      const path = folderPath ? folderPath : "default";
      const dbList = dbNameList ? dbNameList : [];
      return this.sqlite.moveDatabasesAndAddSuffix({
        folderPath: path,
        dbNameList: dbList
      });
    }
  };
  var SQLiteDBConnection = class {
    constructor(dbName, readonly, sqlite) {
      this.dbName = dbName;
      this.readonly = readonly;
      this.sqlite = sqlite;
    }
    getConnectionDBName() {
      return this.dbName;
    }
    getConnectionReadOnly() {
      return this.readonly;
    }
    async open() {
      try {
        await this.sqlite.open({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async close() {
      try {
        await this.sqlite.close({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async beginTransaction() {
      try {
        const changes = await this.sqlite.beginTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async commitTransaction() {
      try {
        const changes = await this.sqlite.commitTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async rollbackTransaction() {
      try {
        const changes = await this.sqlite.rollbackTransaction({
          database: this.dbName
        });
        return Promise.resolve(changes);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isTransactionActive() {
      try {
        const result = await this.sqlite.isTransactionActive({
          database: this.dbName
        });
        return Promise.resolve(result);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async loadExtension(path) {
      try {
        await this.sqlite.loadExtension({
          database: this.dbName,
          path,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async enableLoadExtension(toggle) {
      try {
        await this.sqlite.enableLoadExtension({
          database: this.dbName,
          toggle,
          readonly: this.readonly
        });
        return Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getUrl() {
      try {
        const res = await this.sqlite.getUrl({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getVersion() {
      try {
        const version = await this.sqlite.getVersion({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(version);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getTableList() {
      try {
        const res = await this.sqlite.getTableList({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async execute(statements, transaction = true, isSQL92 = true) {
      try {
        if (!this.readonly) {
          const res = await this.sqlite.execute({
            database: this.dbName,
            statements,
            transaction,
            readonly: false,
            isSQL92
          });
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async query(statement, values, isSQL92 = true) {
      let res;
      try {
        if (values && values.length > 0) {
          res = await this.sqlite.query({
            database: this.dbName,
            statement,
            values,
            readonly: this.readonly,
            isSQL92: true
          });
        } else {
          res = await this.sqlite.query({
            database: this.dbName,
            statement,
            values: [],
            readonly: this.readonly,
            isSQL92
          });
        }
        res = await this.reorderRows(res);
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async run(statement, values, transaction = true, returnMode = "no", isSQL92 = true) {
      let res;
      try {
        if (!this.readonly) {
          if (values && values.length > 0) {
            res = await this.sqlite.run({
              database: this.dbName,
              statement,
              values,
              transaction,
              readonly: false,
              returnMode,
              isSQL92: true
            });
          } else {
            res = await this.sqlite.run({
              database: this.dbName,
              statement,
              values: [],
              transaction,
              readonly: false,
              returnMode,
              isSQL92
            });
          }
          res.changes = await this.reorderRows(res.changes);
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async executeSet(set, transaction = true, returnMode = "no", isSQL92 = true) {
      let res;
      try {
        if (!this.readonly) {
          res = await this.sqlite.executeSet({
            database: this.dbName,
            set,
            transaction,
            readonly: false,
            returnMode,
            isSQL92
          });
          res.changes = await this.reorderRows(res.changes);
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isExists() {
      try {
        const res = await this.sqlite.isDBExists({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isTable(table) {
      try {
        const res = await this.sqlite.isTableExists({
          database: this.dbName,
          table,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async isDBOpen() {
      try {
        const res = await this.sqlite.isDBOpen({
          database: this.dbName,
          readonly: this.readonly
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async delete() {
      try {
        if (!this.readonly) {
          await this.sqlite.deleteDatabase({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async createSyncTable() {
      try {
        if (!this.readonly) {
          const res = await this.sqlite.createSyncTable({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve(res);
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async setSyncDate(syncdate) {
      try {
        if (!this.readonly) {
          await this.sqlite.setSyncDate({
            database: this.dbName,
            syncdate,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async getSyncDate() {
      try {
        const res = await this.sqlite.getSyncDate({
          database: this.dbName,
          readonly: this.readonly
        });
        let retDate = "";
        if (res.syncDate > 0)
          retDate = new Date(res.syncDate * 1e3).toISOString();
        return Promise.resolve(retDate);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async exportToJson(mode, encrypted = false) {
      try {
        const res = await this.sqlite.exportToJson({
          database: this.dbName,
          jsonexportmode: mode,
          readonly: this.readonly,
          encrypted
        });
        return Promise.resolve(res);
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async deleteExportedRows() {
      try {
        if (!this.readonly) {
          await this.sqlite.deleteExportedRows({
            database: this.dbName,
            readonly: false
          });
          return Promise.resolve();
        } else {
          return Promise.reject("not allowed in read-only mode");
        }
      } catch (err) {
        return Promise.reject(err);
      }
    }
    async executeTransaction(txn, isSQL92 = true) {
      let changes = 0;
      let isActive = false;
      if (!this.readonly) {
        await this.sqlite.beginTransaction({
          database: this.dbName
        });
        isActive = await this.sqlite.isTransactionActive({
          database: this.dbName
        });
        if (!isActive) {
          return Promise.reject("After Begin Transaction, no transaction active");
        }
        try {
          for (const task of txn) {
            if (typeof task !== "object" || !("statement" in task)) {
              throw new Error("Error a task.statement must be provided");
            }
            if ("values" in task && task.values && task.values.length > 0) {
              const retMode = task.statement.toUpperCase().includes("RETURNING") ? "all" : "no";
              const ret = await this.sqlite.run({
                database: this.dbName,
                statement: task.statement,
                values: task.values,
                transaction: false,
                readonly: false,
                returnMode: retMode,
                isSQL92
              });
              if (ret.changes.changes < 0) {
                throw new Error("Error in transaction method run ");
              }
              changes += ret.changes.changes;
            } else {
              const ret = await this.sqlite.execute({
                database: this.dbName,
                statements: task.statement,
                transaction: false,
                readonly: false
              });
              if (ret.changes.changes < 0) {
                throw new Error("Error in transaction method execute ");
              }
              changes += ret.changes.changes;
            }
          }
          const retC = await this.sqlite.commitTransaction({
            database: this.dbName
          });
          changes += retC.changes.changes;
          const retChanges = { changes: { changes } };
          return Promise.resolve(retChanges);
        } catch (err) {
          const msg = err.message ? err.message : err;
          await this.sqlite.rollbackTransaction({
            database: this.dbName
          });
          return Promise.reject(msg);
        }
      } else {
        return Promise.reject("not allowed in read-only mode");
      }
    }
    async reorderRows(res) {
      const retRes = res;
      if (res?.values && typeof res.values[0] === "object") {
        if (Object.keys(res.values[0]).includes("ios_columns")) {
          const columnList = res.values[0]["ios_columns"];
          const iosRes = [];
          for (let i = 1; i < res.values.length; i++) {
            const rowJson = res.values[i];
            const resRowJson = {};
            for (const item of columnList) {
              resRowJson[item] = rowJson[item];
            }
            iosRes.push(resRowJson);
          }
          retRes["values"] = iosRes;
        }
      }
      return Promise.resolve(retRes);
    }
  };

  // node_modules/@capacitor-community/sqlite/dist/esm/index.js
  var CapacitorSQLite = registerPlugin("CapacitorSQLite", {
    web: () => Promise.resolve().then(() => (init_web3(), web_exports3)).then((m) => new m.CapacitorSQLiteWeb()),
    electron: () => window.CapacitorCustomPlatform.plugins.CapacitorSQLite
  });

  // native-storage.ts
  var DB_NAME = "cubanitos_patagonia_local";
  var TABLE = "app_kv";
  var isCubanitosKey = (key) => String(key || "").startsWith("cubanitos_");
  var db = null;
  var writeChain = Promise.resolve();
  function enqueueWrite(task) {
    writeChain = writeChain.then(task).catch((error) => {
      console.error("No se pudo respaldar el dato local en SQLite.", error);
    });
    return writeChain;
  }
  async function openDatabase() {
    if (!Capacitor.isNativePlatform()) return;
    const sqlite = new SQLiteConnection(CapacitorSQLite);
    const consistency = await sqlite.checkConnectionsConsistency();
    if (!consistency.result) await sqlite.closeAllConnections();
    db = await sqlite.createConnection(DB_NAME, false, "no-encryption", 1, false);
    await db.open();
    await db.execute(`CREATE TABLE IF NOT EXISTS ${TABLE} (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL, updated_at TEXT NOT NULL);`);
    const stored = await db.query(`SELECT key, value FROM ${TABLE};`);
    for (const row of stored.values || []) {
      const key = String(row?.key || "");
      if (!isCubanitosKey(key) || localStorage.getItem(key) != null) continue;
      localStorage.setItem(key, String(row?.value || ""));
    }
  }
  function mirrorLocalStorageToSQLite() {
    if (!db) return;
    const nativeSetItem = Storage.prototype.setItem;
    const nativeRemoveItem = Storage.prototype.removeItem;
    const nativeClear = Storage.prototype.clear;
    Storage.prototype.setItem = function patchedSetItem(key, value) {
      nativeSetItem.call(this, key, value);
      if (this !== localStorage || !isCubanitosKey(key) || !db) return;
      const savedKey = String(key);
      const savedValue = String(value);
      void enqueueWrite(async () => {
        await db?.run(
          `INSERT INTO ${TABLE} (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
          [savedKey, savedValue, (/* @__PURE__ */ new Date()).toISOString()]
        );
      });
    };
    Storage.prototype.removeItem = function patchedRemoveItem(key) {
      nativeRemoveItem.call(this, key);
      if (this !== localStorage || !isCubanitosKey(key) || !db) return;
      void enqueueWrite(async () => {
        await db?.run(`DELETE FROM ${TABLE} WHERE key = ?;`, [String(key)]);
      });
    };
    Storage.prototype.clear = function patchedClear() {
      nativeClear.call(this);
      if (this !== localStorage || !db) return;
      void enqueueWrite(async () => {
        await db?.execute(`DELETE FROM ${TABLE};`);
      });
    };
  }
  var boot = (async () => {
    try {
      await openDatabase();
      mirrorLocalStorageToSQLite();
    } catch (error) {
      console.error("SQLite nativo no pudo inicializarse.", error);
    }
  })();
  async function writeJsonBackup(filename, type, directory) {
    await boot;
    await writeChain;
    const payload = {
      format: "cubanitos-backup",
      version: 1,
      type,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      app: "Cubanitos Patagonia",
      values: Object.fromEntries(
        Array.from({ length: localStorage.length }, (_, index) => localStorage.key(index)).filter((key) => Boolean(key && isCubanitosKey(key))).map((key) => [key, localStorage.getItem(key)])
      )
    };
    const result = await Filesystem.writeFile({
      path: filename,
      data: JSON.stringify(payload, null, 2),
      directory,
      encoding: Encoding.UTF8,
      recursive: true
    });
    return { uri: result.uri, filename };
  }
  async function createAutomaticBackup() {
    return writeJsonBackup("respaldo-automatico-cubanitos-patagonia.json", "automatic", Directory.Data);
  }
  async function createBackup() {
    const filename = `respaldo-cubanitos-patagonia-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    const result = await writeJsonBackup(filename, "manual", Directory.Data);
    await Share.share({
      title: "Respaldo Cubanitos Patagonia",
      dialogTitle: "Guardar o compartir respaldo JSON",
      files: [result.uri]
    });
    return result;
  }
  async function openUpdate(url) {
    if (!Capacitor.isNativePlatform()) return;
    const safeUrl = String(url || "").trim();
    if (!/^https:\/\//i.test(safeUrl)) throw new Error("La actualizaci\xF3n no tiene una URL segura.");
    const updater = Capacitor.Plugins?.CubanitosUpdater;
    if (!updater?.downloadAndInstall) throw new Error("El actualizador nativo no est\xE1 disponible.");
    return updater.downloadAndInstall({ url: safeUrl });
  }
  window.CubanitosNativeStorage = {
    ready: () => boot,
    flush: async () => {
      await boot;
      await writeChain;
    },
    createBackup,
    createAutomaticBackup,
    openUpdate,
    isNative: Capacitor.isNativePlatform()
  };
})();
/*! Bundled license information:

@capacitor/core/dist/index.js:
  (*! Capacitor: https://capacitorjs.com/ - MIT License *)
*/
