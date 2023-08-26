// src/utils/wasm/lua/luaWorker.js
self.importScripts("out.js");

let Module = {};

self.onmessage = function (e) {
	if (e.data.command === "run") {
		Module.ccall("lua_exec");
	}
};

Module = {
	print: function (text) {
		self.postMessage({ command: "print", text: text });
	},
	onRuntimeInitialized: function () {
		self.postMessage({ command: "ready" });
	},
};
