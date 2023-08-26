import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import useLuaWorker from "./wasm/useLuaWorker";
import "./App.css";
import { wasmBrowserInstantiate } from "./wasm/intWasm.js";

// import "./wasm/out.js";
// import "./wasm/editor.js";
// import { lua_exec } from "./wasm/out.js";
// import { lua_exec } from "./wasm/editor.js";
// import { editor, lua_stop, saveToFile, loadExample, lua_exec } from "./wasm/main.js";

import React, { useState, useEffect } from 'react';

const useScript = (url) => {
	useEffect(() => {
		const script = document.createElement("script");

		script.src = url;
		script.async = true;

		document.body.appendChild(script);

		return () => {
			document.body.removeChild(script);
		};
	}, [url]);
};



function App() {
	// useScript("/src/wasm/out.js");
	// useScript("/src/wasm/editor.js");
	// useScript("/src/wasm/main.js");
	// const { ready, runLua, worker } = useLuaWorker();
	const [wasmResult, setWasmResult] = useState(null);

  useEffect(() => {
    const runWasmAdd = async () => {
			// Instantiate our wasm module
			const wasmModule = await wasmBrowserInstantiate(`/src/wasm/hw.wasm`);
		
			// Call the Add function export from wasm, save the result
			const addResult = wasmModule.instance.exports.add(24, 24);
		
			// Set the result onto the body
			document.body.textContent = `Hello World! addResult: ${addResult}`;
		};
		runWasmAdd();
  }, []);

  return <div>WebAssembly Result: {wasmResult}</div>;
	return (
		<>
			{/* <div id="text-fields" style={{ height: "300px" }}>
				<div id="editor" style={{ flex: "auto" }}></div>
				<textarea
					id="output"
					style={{ flex: "auto" }}
					readOnly
				></textarea>
			</div>

			<button onClick={lua_exec()}>run</button>
			<button onClick={lua_stop()}>stop</button>
			<button onClick={editor.setText("")}>clear</button>
			<button onClick={saveToFile()}>save</button>
			<select
				onChange={loadExample(this.value)}
				defaultValue=""
			>
				<option value="">load example...</option>
				<option value="src/wasm/examples/hello.lua">hello</option>
				<option value="src/wasm/examples/globals.lua">globals</option>
				<option value="src/wasm/examples/bisect.lua">bisect</option>
				<option value="src/wasm/examples/sieve.lua">sieve</option>
				<option value="src/wasm/examples/account.lua">account</option>
				<option value="src/wasm/examples/controller.lua">
					cube controller
				</option>
				<option value="src/wasm/examples/cps.lua">
					clicks per second
				</option>
				<option value="src/wasm/examples/mandelbrot.lua">
					mandelbrot
				</option>
				<option value="src/wasm/examples/conway.lua">conway</option>
			</select>
			<a href="#a-about" className="barlink">
				about
			</a>
			<a href="#a-extensions" className="barlink">
				libraries
			</a>
			<a href="#a-copyright" className="barlink">
				license
			</a>
			<br />
			<p>canvas:</p>
			<canvas id="canvas" width="650" height="488"></canvas> */}
		</>
	);
}

export default App;
