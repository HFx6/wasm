// src/utils/wasm/lua/useLuaWorker.js
import { useEffect, useState, useRef } from "react";

export default function useLuaWorker() {
	const [ready, setReady] = useState(false);
	const workerRef = useRef(null);

	useEffect(() => {
		workerRef.current = new Worker("./luaWorker.js");

		workerRef.current.onmessage = function (e) {
			if (e.data.command === "ready") {
				setReady(true);
			} else if (e.data.command === "print") {
				console.log(e.data.text);
			}
		};

		return () => {
			workerRef.current.terminate();
		};
	}, []);

	const runLua = () => {
		if (workerRef.current && ready) {
			workerRef.current.postMessage({ command: "run" });
		}
	};

	return { ready, runLua, worker: workerRef.current };
}
