/******************************************************************************
* 						    LUA COPYRIGHT NOTICE
*==============================================================================
* Copyright (C) 1994-2021 Lua.org, PUC-Rio.
*
* Permission is hereby granted, free of charge, to any person obtaining
* a copy of this software and associated documentation files (the
* "Software"), to deal in the Software without restriction, including
* without limitation the rights to use, copy, modify, merge, publish,
* distribute, sublicense, and/or sell copies of the Software, and to
* permit persons to whom the Software is furnished to do so, subject to
* the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
* IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
* CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
* TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
* SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
******************************************************************************/

var editor = new Editor(document.getElementById("editor"));

var out_textarea = document.getElementById("output");
var canvas = document.getElementById("canvas");
var cn_ctx = canvas.getContext("2d");

function allocString(str) {
	var alloc = _malloc(str.length + 1);
	stringToUTF8(str, alloc, str.length + 1);
	return alloc;
}

class LuaLibrary {
	constructor(name, libData) {
		var allocLen = (Object.keys(libData).length + 1) * 8 // functions in libData + 1 sentinel value (completely null)
		var alloc = _malloc(allocLen);
		
		if (alloc === 0) {
			console.error("Error when making library " + name);
		}
		
		var view = new DataView(wasmMemory.buffer, alloc, allocLen);
		
		let i = 0;
		for (let name in libData) {
			let func = libData[name];
			
			var c_name = allocString(name);
			var f_ptr = addFunction(func, 'ii');
			
			view.setInt32(i, c_name, true);
			i += 4;
			view.setInt32(i, f_ptr, true);
			i += 4;
		}
		
		// sentinel values
		view.setInt32(i, 0, true);
		i += 4;
		view.setInt32(i, 0, true);
		i += 4;
		
		this.numFunctions = Object.keys(libData).length;
		this._alloc = alloc;
		this.name = name;
	}
}

function luaPushString(L, str) {
	var ptr = allocString(str);
	_luaPushString(L, ptr);
	_free(ptr);
}

function luaError(L, msg) {
	var ptr = allocString(msg);
	_luaError(L, ptr);
	_free(ptr);
}

function luaTypeError(L, arg, name) {
	var ptr = allocString(name);
	_luaTypeError(L, arg, ptr);
	_free(ptr);
}

function createLuaState() {
	return _luaNewState();
}

function closeLuaState(L) {
	_luaCloseState(L);
}

function addLibraryToState(L, lib) {
	var c_name = allocString(lib.name);
	_luaAddLibrary(L, c_name, lib._alloc, lib.numFunctions);
}

function luaAddFunction(L, name, f) {
	var c_name = allocString(name);
	var f_ptr = addFunction(f, 'ii');
	
	_luaAddFunction(L, c_name, f_ptr);
	
	_free(c_name);
}

function runLua(L, code) {
	var bufferSize = 256;
	var errorBuffer = _malloc(bufferSize);
	
	var codeBuffer = _malloc(code.length + 1);
	stringToUTF8(code, codeBuffer, code.length + 1);
	setValue(codeBuffer + code.length, 0, "i8");
	
	var failure = _luaExecute(L, codeBuffer, errorBuffer, bufferSize);
	
	if (failure === 1) {
		out_textarea.value += UTF8ToString(errorBuffer) + "\n";
		//out_textarea.value = "error :(";
	}
	
	_free(errorBuffer);
	_free(codeBuffer);
}

function runLuaFunc(L, args, nRes) {
	// push arguments onto stack
	for (let i = 0; i < args.length; i += 2) {
		let type = args[i];
		let val = args[i + 1];
		
		switch(type) {
			case "int":
				_luaPushInt(L, val);
				break;
			case "number":
				_luaPushNumber(L, val);
				break;
			case "boolean":
				_luaPushBoolean(L, val);
				break;
			default:
				throw "Invalid type " + type;
		}
	}
	
	// create error message buffer
	var bufferSize = 256;
	var errorBuffer = _malloc(bufferSize);
	
	// execute function
	var fail = _luaExecFunc(L, args.length / 2, nRes, errorBuffer, bufferSize);
	
	if (fail === 1) {
		out_textarea.value += UTF8ToString(errorBuffer) + "\n";
	}
	
	_free(errorBuffer);
}

// pushes global function and runs it
function runLuaFuncFromName(L, name, args, nRes) {
	// push function onto stack
	var c_name = allocString(name);
	_luaPushGlobal(L, c_name);
	_free(c_name);
	
	runLuaFunc(L, args, nRes);
}

window.printHook = function(msg) {
	var scrollPos = out_textarea.scrollHeight - out_textarea.offsetHeight - out_textarea.scrollTop;
	out_textarea.value += msg + "\n";
	
	if (scrollPos < 5) {
		out_textarea.scrollTop = out_textarea.scrollHeight - out_textarea.offsetHeight;
	}
}

function lua_time(L) {
	_luaPushNumber(L, Date.now() / 1000);
	return 1;
}

var libraries = [];

var currentLuaState = null;
var startTime = 0;

var userBindings = [];

function lua_exec(program) {
	if (currentLuaState) {
		closeLuaState(currentLuaState);
		currentLuaState = null;
	}
	
	program = program || editor.getText();
	
	out_textarea.value = "";
	
	var L = createLuaState();
	
	// clear canvas
	cn_ctx.fillStyle = "white";
	cn_ctx.fillRect(0, 0, canvas.width, canvas.height);
	
	// clear user bindings
	for (let v of userBindings) {
		v[0].removeEventListener(v[1], v[2]);
		_luaUnref(L, v[3]);
	}
	userBindings = [];
	
	// init libraries
	for (let lib of libraries) {
		addLibraryToState(L, lib);
	}
	
	// init global functions
	luaAddFunction(L, "time", lua_time);
	
	startTime = performance.now();
	runLua(L, program);
	
	currentLuaState = L;
}

function lua_stop() {
	if (currentLuaState) {
		closeLuaState(currentLuaState);
		currentLuaState = null;
	}
}

function saveToFile() {
	var program = editor.getText();
	
	var blob = new Blob([program], { type: "text/plain" });
	
	var url = URL.createObjectURL(blob);
	
	var anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = "script.lua";
	anchor.click();
}

function loadExample(path) {
	fetch(path)
		.then(res => res.text())
		.then(data => {
			editor.setText(data);
		});
}

function main() {
	function genListener(target, evName, uf) {
		return function(L) {
			var type = _luaGetType(L, 1);
			if (type !== 6) {
				luaTypeError(L, 1, "function");
				return;
			}
			
			var ref = _luaRef(L);
			
			var f = function(ev) {
				uf(L, ref, ev);
			}
			
			target.addEventListener(evName, f);
			
			userBindings.push([target, evName, f, ref]);
			return 0;
		}
	}
	
	var canvasImageData = null;
	
	libraries = [
		new LuaLibrary("user", {
			mousedown: genListener(window, "mousedown", function(L, ref, ev) {
				_luaPushRef(L, ref);
				
				runLuaFunc(
					L,
					[
						"number", ev.pageX - canvas.offsetLeft,
						"number", ev.pageY - canvas.offsetTop
					],
					0
				);
			}),
			mouseup: genListener(window, "mouseup", function(L, ref, ev) {
				_luaPushRef(L, ref);
				
				runLuaFunc(
					L,
					[
						"number", ev.pageX - canvas.offsetLeft,
						"number", ev.pageY - canvas.offsetTop
					],
					0
				);
			}),
			mousemove: genListener(window, "mousemove", function(L, ref, ev) {
				_luaPushRef(L, ref);
				
				runLuaFunc(
					L,
					[
						"number", ev.pageX - canvas.offsetLeft,
						"number", ev.pageY - canvas.offsetTop
					],
					0
				);
			}),
			keydown: genListener(window, "keydown", function(L, ref, ev) {
				_luaPushRef(L, ref);
				
				runLuaFunc(
					L,
					[
						"int", ev.keyCode
					],
					0
				);
			}),
			keyup: genListener(window, "keyup", function(L, ref, ev) {
				_luaPushRef(L, ref);
				
				runLuaFunc(
					L,
					[
						"int", ev.keyCode
					],
					0
				);
			})
		}),
		
		new LuaLibrary("canvas", {
			setfill: function(L) {
				var r = _luaRequireNumber(L, 1);
				var g = _luaRequireNumber(L, 2);
				var b = _luaRequireNumber(L, 3);
				
				cn_ctx.fillStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
				
				return 0;
			},
			setstroke: function(L) {
				var r = _luaRequireNumber(L, 1);
				var g = _luaRequireNumber(L, 2);
				var b = _luaRequireNumber(L, 3);
				
				cn_ctx.strokeStyle = `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`
				
				return 0;
			},
			setstrokewidth: function(L) {
				var w = _luaRequireNumber(L, 1);
				
				cn_ctx.lineWidth = w;
				return 0;
			},
			fillrect: function(L) {
				var x = _luaRequireNumber(L, 1);
				var y = _luaRequireNumber(L, 2);
				var w = _luaRequireNumber(L, 3);
				var h = _luaRequireNumber(L, 4);
				
				cn_ctx.fillRect(x, y, w, h);
				
				return 0
			},
			moveto: function(L) {
				var x = _luaRequireNumber(L, 1);
				var y = _luaRequireNumber(L, 2);
				
				cn_ctx.moveTo(x, y);
				return 0;
			},
			lineto: function(L) {
				var x = _luaRequireNumber(L, 1);
				var y = _luaRequireNumber(L, 2);
				
				cn_ctx.lineTo(x, y);
				return 0;
			},
			arc: function(L) {
				var x = _luaRequireNumber(L, 1);
				var y = _luaRequireNumber(L, 2);
				var r = _luaRequireNumber(L, 3);
				var s = _luaRequireNumber(L, 4);
				var e = _luaRequireNumber(L, 5);
				var ccw = _luaGetBoolean(L, 6);
				
				cn_ctx.arc(x, y, r, s, e, ccw);
				return 0;
			},
			beginpath: function(L) {
				cn_ctx.beginPath();
				return 0;
			},
			closepath: function(L) {
				cn_ctx.closePath();
				return 0;
			},
			fill: function(L) {
				cn_ctx.fill();
				return 0;
			},
			stroke: function(L) {
				cn_ctx.stroke();
				return 0;
			},
			width: function(L) {
				_luaPushNumber(L, canvas.width);
				return 1;
			},
			height: function(L) {
				_luaPushNumber(L, canvas.height);
				return 1;
			},
			drawtext: function(L) {
				var x = _luaRequireNumber(L, 1);
				var y = _luaRequireNumber(L, 2);
				var size = _luaRequireNumber(L, 3);
				var c_str = _luaRequireString(L, 4);
				
				var str = UTF8ToString(c_str);
				
				cn_ctx.font = size + "px Monospace";
				cn_ctx.fillText(str, x, y);
				
				return 0;
			},
			beginpixels: function(L) {
				canvasImageData = cn_ctx.getImageData(0, 0, canvas.width, canvas.height);
				return 0;
			},
			applypixels: function(L) {
				if (canvasImageData === null) {
					luaError(L, "canvas.beginpixels was not called before");
					return;
				}
				
				cn_ctx.putImageData(canvasImageData, 0, 0);
				canvasImageData = null;
			},
			setpixel: function(L) {
				if (canvasImageData === null) {
					luaError(L, "canvas.beginpixels was not called before");
					return;
				}
				
				var x = _luaRequireInt(L, 1);
				var y = _luaRequireInt(L, 2);
				var r = _luaRequireInt(L, 3);
				var g = _luaRequireInt(L, 4);
				var b = _luaRequireInt(L, 5);
				
				/*
				var imgData = cn_ctx.createImageData(1, 1);
				imgData.data[0] = Math.floor(r);
				imgData.data[1] = Math.floor(g);
				imgData.data[2] = Math.floor(b);
				imgData.data[3] = 255;
				
				cn_ctx.putImageData(imgData, x, y);
				*/
				//var f = cn_ctx.fillStyle;
				/*
				cn_ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
				//cn_ctx.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
				cn_ctx.fillRect(x, y, 1, 1);
				//cn_ctx.fillStyle = f;
				*/
				var i = ((y * canvas.width) + x) * 4;
				canvasImageData.data[i] = r;
				canvasImageData.data[i + 1] = g;
				canvasImageData.data[i + 2] = b;
				canvasImageData.data[i + 3] = 255;
				
				return 0;
			}
		}),
	];
	
	var func_name = allocString("onupdate");
	
	(function u(now) {
		var L = currentLuaState;
		
		if (L) {
			// check if "onupdate" function exists
			
			var type = _luaPushGlobal(L, func_name)
			
			if (type !== 0) {
				runLuaFunc(currentLuaState, ["number", now], 0);
			} else {
				_luaPop(L, 1);
				//console.log("none");
			}
		}
		
		requestAnimationFrame(u);
	})(0);
}

Module.onRuntimeInitialized = main;

export { editor, lua_stop, saveToFile, loadExample, lua_exec };