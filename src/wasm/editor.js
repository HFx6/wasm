var code_textarea = document.getElementById("editor");

const TAB_WIDTH = 4;

// delimiters separate tokens regardless if there is a space between them
const LUA_DELIMITERS = [".", ",", ";", "[", "]", ",", "{", "}", "(", ")", "%", "-", "+", "/", "*", "^", "..", ">", "<", ">=", "<=", "==", "~=", "="];
const LUA_NUMBERS = "0123456789";
const LUA_KEYWORDS =
	[
	"not", "or", "and", "self",
	"local", "if", "else", "then", "while", "do", "for", "repeat", "until", "in", "function", "end", "false", "true", "nil", "return",
	"print", "assert", "tostring", "tonumber", "onupdate", "_G", "_VERSION", "collectgarbage", "error", "getmetatable", "ipairs", "next",
	"pairs", "pcall", "rawequal", "rawget", "rawlen", "rawset", "require", "select", "setmetatable", "time", "type", "utf8", "warn", "xpcall",
	"math", "string", "table", "os", "io", "user", "canvas", "coroutine", "debug", "package",
	];

const LUA_IDENTIFIER_COLOR = "black";
const LUA_DELIMITER_COLOR = "navy";
const LUA_NUMBER_COLOR = "darkorange";
const LUA_STRING_COLOR = "green";
const LUA_COMMENT_COLOR = "gray";
const LUA_KEYWORD_COLOR = "blue";

const EDITOR_GUTTER_WIDTH = 32;
const EDITOR_GUTTER_PADDING = 5;
const EDITOR_GUTTER_MARGIN = 5;
const EDITOR_TEXT_LEFT = EDITOR_GUTTER_WIDTH + EDITOR_GUTTER_PADDING + EDITOR_GUTTER_MARGIN;

class EditorLine {
	constructor(i, line, editor, multi = false) {
		this.text = line;
		this.lineNumber = i;
		
		var el = document.createElement("div");
		el.className = "editor-line";
		el.style.top = (i * editor.lineHeight) + "px";
		el.style.height = editor.lineHeight + "px";
		
		editor.domElem.appendChild(el);
		
		var ln_el = document.createElement("div");
		ln_el.className = "editor-linenum";
		ln_el.innerHTML = i + 1;
		ln_el.style.width = (EDITOR_GUTTER_WIDTH) + "px";
		ln_el.style.paddingRight = (EDITOR_GUTTER_PADDING) + "px";
		el.appendChild(ln_el);
		
		var txt_el = document.createElement("span");
		txt_el.className = "editor-linetxt";
		txt_el.style.left = (EDITOR_TEXT_LEFT) + "px";
		el.appendChild(txt_el);
		
		var txt_node = document.createTextNode("");
		txt_el.appendChild(txt_node);
		
		this.container = el;
		this.lineCol = ln_el;
		this.lineText = txt_el;
		this.lineTextNode = txt_node;
		
		this.startMulti = multi;
		this.nextMulti = false;
		this.setText(line, multi);
	}
	
	setLineNum(i, editor) {
		this.container.style.top = (i * editor.lineHeight) + "px";
		this.lineCol.innerHTML = i + 1;
		
		this.lineNumber = i;
	}
	
	setText(text, isInMulti) {
		this.text = text;
		this.lineText.innerHTML = "";
		
		this.startMulti = isInMulti;
		
		var buffer = "";
		var currType = "";
		var output = "";
		var string = null;
		var number = false;
		var comment = 0;
		
		if (isInMulti) comment = 2;
		
		var lineElem = this.lineText;
		
		function createWord(word, color, bold) {
			let el = document.createElement("span");
			el.style.color = color;
			if (bold) el.style.fontWeight = "bold";
			lineElem.appendChild(el);
			
			let txt = document.createTextNode(word);
			el.appendChild(txt);
		}
		
		function addSpaces(num) {
			lineElem.append(("").padStart(num, "\xa0"));
		}
		
		
		for (let i = 0; i < text.length + 1; i++) {
			let char = text[i];
			
			this.hasMulti = false;
			
			let delim = null;
			let flush = false;
			let enterString = false;
			let enterComment = 0;
			let whitespace = 0;
			
			if (i < text.length) {
				if (comment) {
					if (char === " ")
						buffer += "\xa0";
					else if (char === "\t")
						buffer += ("").padStart(TAB_WIDTH, "\xa0");
					else
						buffer += char;
					
					if (comment === 2 && text.slice(i - 1, i + 1) === "]]") {
						flush = true;
						enterComment = -1;
					}
				} else if (string) {
					buffer += char;
					
					if (char === string && text[i - 1] !== "\\") {
						flush = true;
					}
				} else if (text.slice(i, i + 4) === "--[[") {
					this.hasMulti = true;
					enterComment = 2;
					flush = true;
				} else if (text.slice(i, i + 2) === "--") {
					enterComment = 1;
					flush = true;
				} else {
					if (char === "\"" || char === "\'") {
						enterString = true;
						flush = true;
					} else if ((number && char === ".") || (buffer.length === 0 && LUA_NUMBERS.indexOf(char) >= 0)) {
						number = true;
						buffer += char;
					} else {
						for (let v of LUA_DELIMITERS) {
							if (text.slice(i, i + v.length) === v) {
								delim = v;
							}
						}
						
						if (delim) {
							flush = true;
						} else {
							if (char === " ") {
								whitespace = 1;
								flush = true;
							} else if (char === "\t") {
								flush = true;
								whitespace = TAB_WIDTH;
							} else {
								buffer += char;
							}
						}
					}
				}
			} else {
				flush = true;
			}
			
			if (flush) {
				if (comment) {
					createWord(buffer, LUA_COMMENT_COLOR, false);
					
					if (enterComment < 0) {
						comment = 0;
						enterComment = 0;
						console.log("Exit comment");
					}
				} else {
					// check keyword
					if (buffer.length > 0) {
						if (string) {
							createWord(buffer, LUA_STRING_COLOR, false);
							string = null;
						} else if (number) {
							createWord(buffer, LUA_NUMBER_COLOR, false);
							number = false;
						} else {
							let isKeyword = LUA_KEYWORDS.indexOf(buffer) >= 0;
							
							if (isKeyword) {
								createWord(buffer, LUA_KEYWORD_COLOR, true);
							} else {
								createWord(buffer, LUA_IDENTIFIER_COLOR, false);
							}
						}
					}
					
					if (whitespace > 0) {
						addSpaces(whitespace);
					}
					
					if (delim) {
						createWord(delim, LUA_DELIMITER_COLOR, true);
						i += delim.length - 1;
					}
				}
				
				buffer = "";
				
				if (enterString) {
					string = char;
					buffer += char;
				}
				
				if (enterComment) {
					comment = enterComment;
					buffer += char;
				}
			}
			
		}
		
		this.nextMulti = (comment === 2);
	}
	
	remove() {
		this.container.remove();
	}
}

class Editor {
	constructor(div) {
		this.domElem = div;
		//this.lines = ["print \"Hello, world!\""];
		this.source = "print(\"Hello, world!\")";
		this.lineElems = [];
		this.selectBoxes = [];
		this.lineHeight = 16;
		this.charWidth = 1;
		
		{
			var testStr = "tdadadadadadadadadadadadadadadasidjasdjadadadadaddadadadadadadaskldaskldjaslkd"
			var testEl = document.createElement("span");
			testEl.innerHTML = testStr;
			this.domElem.appendChild(testEl);
			this.charWidth = testEl.offsetWidth / testStr.length;
			this.domElem.removeChild(testEl);
		}
		
		var textarea = document.createElement("textarea");
		div.appendChild(textarea);
		textarea.style.opacity = "0";
		
		var gutter = document.createElement("div");
		gutter.className = "editor-gutter";
		gutter.style.width = (EDITOR_GUTTER_WIDTH + EDITOR_GUTTER_PADDING) + "px";
		this.domElem.appendChild(gutter);
		this.gutter = gutter;
		
		this.cursor = document.createElement("div");
		this.cursor.className = "editor-cursor";
		this.cursor.style.width = "1px";
		this.cursor.style.height = this.lineHeight + "px";
		this.cursor.style.left = "50px";
		this.cursor.style.top = "50px";
		this.domElem.appendChild(this.cursor);
		
		this.cursor2 = document.createElement("div");
		this.cursor2.className = "editor-cursor";
		this.cursor2.style.width = "1px";
		this.cursor2.style.height = this.lineHeight + "px";
		this.cursor2.style.left = "50px";
		this.cursor2.style.top = "50px";
		this.domElem.appendChild(this.cursor2);
		
		this.undoStack = []; // undo history
		this.redoStack = []; // redo stack
		
		// when inserting or deleting characters in succession,
		// it will be treated as one action when undoing/redoing
		// these variables keep track of those
		this.changeNew = "";
		this.changeOld = "";
		this.changeType = 0; // 1 = insert, 2 = delete
		this.changeLoc = 0;
		
		this.cursorStart = 0;
		this.cursorEnd = 0;
		
		var self = this;
		
		var isFocus = false;
		
		function moveCursorToOffset(t_offsetx, t_offsety) {
			var offsetx = 0;
			var offsety = 0;
			
			for (self.cursorStart = 0; self.cursorStart < self.source.length; self.cursorStart++) {
				let char = self.source[self.cursorStart];
				
				if (char === "\n") {
					// if mouse is after end of line
					if (offsety + 1 > t_offsety) break;
					
					offsetx = 0;
					offsety++;
				} else {
					let width = 1;
					if (char === "\t") {
						width = TAB_WIDTH;
					}
					
					if (t_offsety == offsety && offsetx + width > t_offsetx) {
						self.cursorStart += Math.floor((t_offsetx - offsetx) / width + 0.5);
						break;
					}
					
					offsetx += width;
				}
				
				//if (offsetx - 1 >= t_offsetx && offsety >= t_offsety) break;
			}
		}
		
		var charTypes = [
			"abcdefghijklmnopqrstuvwxyz",
			"1234567890",
			" \n\t",
			"(",
			")",
			"\"",
			"'"
		];
		
		function getCharType(c) {
			c = c.toLowerCase();
			
			for (let i = 0; i < charTypes.length; i++) {
				let accepted = charTypes[i].indexOf(c) >= 0;
				if (accepted) return i;
			}
			
			return charTypes.length;
		}
		
		var selecting = false;
		var lastClick = 0;
		
		
		function pushChanges() {
			if (self.changeType > 0) {
				self.undoStack.push({
					location: self.changeLoc,
					old: self.changeOld,
					new: self.changeNew
				});
				
				self.changeNew = "";
				self.changeOld = "";
				self.changeType = 0;
			}
		}
		
		this.domElem.addEventListener("mousedown", function(ev) {
			console.log(textarea);
			setTimeout(() => textarea.focus({preventScroll: true}));
			
			self.curOffsetX = 0;
			self.curOffsetY = 0;
			self.curPos = 0;
			self.curEndOffsetX = 0;
			self.curEndOffsetY = 0;
			self.curEndPos = 0;
			
			var mousey = ev.pageY - div.offsetTop + div.scrollTop;
			var mousex = ev.pageX - div.offsetLeft;
			var t_offsetx = (mousex - EDITOR_TEXT_LEFT) / self.charWidth;
			var t_offsety = Math.floor(mousey / self.lineHeight);				
			
			if (t_offsetx < 0) {
				t_offsetx = 0;
			}
			
			let oldPos = self.cursorStart;
			moveCursorToOffset(t_offsetx, t_offsety);
			
			if (Date.now() - lastClick < 500 && oldPos === self.cursorStart) {
				console.log("Yes");
				
				let i = self.cursorStart - 1;
				
				let type = getCharType(self.source[i]);
				
				while (self.cursorStart < self.source.length && getCharType(self.source[self.cursorStart]) === type) {
					self.cursorStart++;
				}
				
				self.cursorEnd = i - 1;
						
				while (self.cursorEnd >= 0 && getCharType(self.source[self.cursorEnd]) === type) {
					self.cursorEnd--;
				}
				self.cursorEnd++;
			} else {
				self.cursorEnd = self.cursorStart;
				selecting = true;
			}
			
			self.updateCursor();
			
			lastClick = Date.now();
		});
		
		this.domElem.addEventListener("mousemove", function(ev) {
			if (selecting) {
				var mousey = ev.pageY - div.offsetTop + div.scrollTop;
				var mousex = ev.pageX - div.offsetLeft;
				
				var t_offsetx = (mousex - EDITOR_TEXT_LEFT) / self.charWidth;
				var t_offsety = Math.floor(mousey / self.lineHeight);
				
				if (t_offsetx < 0) {
					t_offsetx = 0;
				}
			
				moveCursorToOffset(t_offsetx, t_offsety);
				
				self.updateCursor();
			}
		});
		
		this.domElem.addEventListener("scroll", function(ev) {
			gutter.style.top = (self.domElem.scrollTop) + "px";
		});
		
		this.domElem.addEventListener("mouseup", function(ev) {
			selecting = false;
		});
		
		textarea.addEventListener("focus", function(ev) {
			isFocus = true;
			self.cursor.style.display = "block";
		});
		
		textarea.addEventListener("blur", function(ev) {
			isFocus = false;
			self.cursor.style.display = "none";
		});
		
		textarea.addEventListener("keydown", function(ev) {
			if (ev.altKey) return;
			//var line = self.lines[self.cursorStartLine];
			//if (line === null) return;
			
			//var cursorSingle = cursorStart == cursorEnd && cursorStartLine == cursorEndLine;
			
			if (ev.code === "ArrowRight") {
				if (self.cursorStart < self.source.length) {
					pushChanges();
					
					if (ev.ctrlKey) {
						let initType = getCharType(self.source[self.cursorStart]);
						
						while (self.cursorStart < self.source.length && getCharType(self.source[self.cursorStart]) === initType) {
							self.cursorStart++;
						}
					} else {
						self.cursorStart++;
					}
					
					if (!ev.shiftKey) self.cursorEnd = self.cursorStart;
					self.updateCursor();
				}
				
				ev.preventDefault();
				
				return;
			}
			
			if (ev.code === "ArrowLeft") {
				if (self.cursorStart > 0) {
					pushChanges();
					
					if (ev.ctrlKey) {
						let initType = getCharType(self.source[self.cursorStart - 1]);
						self.cursorStart--;
						
						while (self.cursorStart >= 0 && getCharType(self.source[self.cursorStart]) === initType) {
							self.cursorStart--;
						}
						self.cursorStart++;
					} else {
						self.cursorStart--;
					}
					
					if (!ev.shiftKey) self.cursorEnd = self.cursorStart;
					self.updateCursor();
				}
				
				ev.preventDefault();
				
				return;
			}
			
			if (ev.code === "ArrowUp") {
				pushChanges();

				let onPrev = false;
				
				let offset = self.curOffsetX;
				
				for (self.cursorStart--; self.cursorStart >= 0; self.cursorStart--) {
					let ch = self.source[self.cursorStart];
					
					if (onPrev && offset <= self.curOffsetX) {
						break;
					}
					
					if (ch === "\n") {
						onPrev = true;
						offset = self.getLineLength(self.cursorStart - 1);
						console.log(offset);
					} else if (ch === "\t") {
						offset -= TAB_WIDTH;
					} else {
						offset--;
					}
				}
				self.cursorStart++;
				
				if (!ev.shiftKey) self.cursorEnd = self.cursorStart;
				self.updateCursor();
				return;
			}
			
			if (ev.code === "ArrowDown") {
				pushChanges();
				
				let onNext = false;
				
				let offset = self.curOffsetX;
				
				for (; self.cursorStart < self.source.length; self.cursorStart++) {
					let ch = self.source[self.cursorStart];
					
					if (onNext && offset >= self.curOffsetX) break;
					
					if (ch === "\n") {
						if (onNext) break;
						
						onNext = true;
						offset = 0;
					} else if (ch === "\t") {
						offset += TAB_WIDTH;
					} else {
						offset++;
					}
				}
				
				if (!ev.shiftKey) self.cursorEnd = self.cursorStart;
				self.updateCursor();
				return;
			}
			
			if (ev.code === "Backspace") {
				// word delete
				if (ev.ctrlKey) {
					if (self.cursorStart > 0) {
						pushChanges();
						self.redoStack = [];
						
						let initType = getCharType(self.source[self.cursorStart - 1]);
						let ileft = self.cursorStart - 1;
						
						while (ileft >= 0 && getCharType(self.source[ileft]) === initType) {
							ileft--;
						}
						ileft++;
						
						self.undoStack.push({
							location: ileft,
							old: self.source.slice(ileft, self.cursorStart),
							new: ""
						});
				
						let newSource = self.source.slice(0, ileft) + self.source.slice(self.cursorStart);
						self.cursorStart = ileft;
						self.cursorEnd = self.cursorStart;
						self.updateCursor();
						self.source = newSource;
						//self.setLine(self.cursorStartLine, newText);
						self.refresh();
						ev.preventDefault();
					}
				} else {
					if (self.cursorStart === self.cursorEnd) {
						if (self.cursorStart > 0) {
							/*self.undoStack.push({
								location: self.cursorStart - 1,
								old: self.source[self.cursorStart - 1],
								new: ""
							});*/
							self.redoStack = [];
							
							if (self.changeType !== 2) {
								pushChanges();
								
								self.changeOld = "";
								self.changeNew = "";
								self.changeType = 2;
							}
							
							if (self.changeType === 2) {
								self.changeOld = self.source[self.cursorStart - 1] + self.changeOld;
								self.changeLoc = self.cursorStart - 1;
							}
							
							self.cursorStart--;
							self.cursorEnd = self.cursorStart;
							self.updateCursor();
							
							self.delete(self.cursorStart + 1, 1);
						}
					} else {
						pushChanges();
						self.redoStack = [];
						
						let min, max;
						
						if (self.cursorStart > self.cursorEnd) {
							max = self.cursorStart;
							min = self.cursorEnd;
						} else {
							min = self.cursorStart;
							max = self.cursorEnd;
						}
						
						self.undoStack.push({
							location: min,
							old: self.source.slice(min, max),
							new: ""
						});
						
						self.cursorStart = min;
						self.cursorEnd = self.cursorStart;
						self.updateCursor();
						
						self.deleteChars(min, max);
					}
					
					self.refresh();
					
					ev.preventDefault();
				}
				
				return;
			}
			
			if (ev.ctrlKey) {
				if (!ev.shiftKey && ev.code === "KeyA") {
					pushChanges();
					self.cursorStart = 0;
					self.cursorEnd = self.source.length;
					self.updateCursor();
					return;
				}
				
				// undo
				if (!ev.shiftKey && ev.code == "KeyZ") {
					pushChanges();
					self.undo();
					return;
				}
				
				// redo
				if ((ev.shiftKey && ev.code === "KeyZ") || ev.code == "KeyY") {
					pushChanges();
					self.redo();
					return;
				}
			}
			
			if (ev.ctrlKey) return;
			
			if (ev.code === "Tab") {
				pushChanges();
				
				self.redoStack = [];
				
				self.undoStack.push({
					location: self.cursorStart,
					old: self.source.slice(self.cursorStart, self.cursorEnd),
					new: "\t"
				});
				
				self.deleteChars(self.cursorStart, self.cursorEnd);
				self.insert(self.cursorStart, "\t");
				self.refresh();
				
				self.cursorStart++;
				self.cursorEnd = self.cursorStart;
				self.updateCursor();
				
				ev.preventDefault();
				return;
			}
			
			if (ev.code === "Enter") {
				pushChanges();
				
				self.redoStack = [];
				
				self.undoStack.push({
					location: self.cursorStart,
					old: self.source.slice(self.cursorStart, self.cursorEnd),
					new: "\n"
				});
				
				self.deleteChars(self.cursorStart, self.cursorEnd);
				self.insert(self.cursorStart, "\n");
				self.refresh();
				
				self.cursorStart++;
				self.cursorEnd = self.cursorStart;
				self.updateCursor();
				
				ev.preventDefault();
				return;
			}
			
			/*
			if (ev.key === "v" && ev.ctrlKey) {
				navigator.clipboard.readText().then(clipText => {
					
				});
				
				return;
			}
			*/
			
			// insert character
			if (ev.key.length === 1) {
				/*self.undoStack.push({
					location: self.cursorStart,
					old: self.source.slice(self.cursorStart, self.cursorEnd),
					new: ev.key
				})*/;
				
				self.redoStack = [];
				
				let min = Math.min(self.cursorStart, self.cursorEnd);
				let max = Math.max(self.cursorStart, self.cursorEnd);
				
				let start = self.cursorStart;
				let end = self.cursorEnd;
				
				if (self.changeType !== 1) {
					pushChanges();
					
					self.changeOld = self.source.slice(min, max);
					self.changeType = 1;
					self.changeNew = "";
					
					self.changeLoc = min;
				}
				
				if (self.changeType === 1) {
					self.changeNew += ev.key;
				}
				
				self.deleteChars(self.cursorStart, self.cursorEnd);
				self.insert(min, ev.key);
				self.refresh();
				
				self.cursorStart = min + 1;
				self.cursorEnd = self.cursorStart;
				self.updateCursor();
				
				ev.preventDefault();
				return;
			}
		});
		
		textarea.addEventListener("paste", function(ev) {
			ev.preventDefault();
			
			var clipText = ev.clipboardData.getData("text");
			
			clipText = clipText.replaceAll("\r\n", "\n");
			
			let min = Math.min(self.cursorStart, self.cursorEnd);
			let max = Math.max(self.cursorStart, self.cursorEnd);
			
			pushChanges();
			
			self.undoStack.push({
				location: min,
				old: self.source.slice(min, max),
				new: clipText
			});
				
			self.deleteChars(self.cursorStart, self.cursorEnd);
			self.insert(min, clipText);
			self.cursorStart = min + clipText.length;
			self.cursorEnd = self.cursorStart;
			self.refresh();
			
			self.updateCursor();
		});
		
		textarea.addEventListener("copy", function(ev) {
			ev.preventDefault();
			
			if (self.cursorStart !== self.cursorEnd) {
				let min = Math.min(self.cursorStart, self.cursorEnd);
				let max = Math.max(self.cursorStart, self.cursorEnd);
				
				var clipText = self.source.slice(min, max);
				ev.clipboardData.setData("text", clipText);
			}
		});
		
		textarea.addEventListener("cut", function(ev) {
			ev.preventDefault();
			
			if (self.cursorStart !== self.cursorEnd) {
				let min = Math.min(self.cursorStart, self.cursorEnd);
				let max = Math.max(self.cursorStart, self.cursorEnd);
				
				var clipText = self.source.slice(min, max);
				ev.clipboardData.setData("text", clipText);
				
				pushChanges();
				
				self.undoStack.push({
					location: min,
					old: clipText,
					new: ""
				});
				
				self.cursorStart = min;
				self.cursorEnd = min;
				self.updateCursor();
				
				self.deleteChars(min, max);
				self.refresh();
				
			}
		});
		
		this.domElem.onselectstart = function() {
			return false;
		}
		
		this.curPos = 0;
		this.curOffsetX = 0;
		this.curOffsetY = 0;
		
		this.curEndPos = 0;
		this.curEndOffsetX = 0;
		this.curEndOffsetY = 0;
		
		this.updateCursor();
		this.refresh();
	}
	
	insert(i, v) {
		this.source = this.source.slice(0, i) + v + this.source.slice(i);
	}
	
	delete(i, c) {
		this.source = this.source.slice(0, i - c) + this.source.slice(i);
	}
	
	deleteChars(start, end) {
		if (start === end) return;
		
		var min, max;
		
		if (start > end) {
			max = start;
			min = end;
		} else {
			max = end;
			min = start;
		}
		
		console.log("Delete");
		console.log(min, max);
		this.source = this.source.slice(0, min) + this.source.slice(max);
	}
	
	undo() {
		if (this.undoStack.length === 0) return;
		let state = this.undoStack.pop();
		this.redoStack.push(state);
		
		this.cursorStart = state.location;
		this.cursorEnd = state.location;
		this.updateCursor();
		
		this.source = this.source.slice(0, state.location) + state.old + this.source.slice(state.location + state.new.length);
		this.refresh();
		
	}
	
	redo() {
		if (this.redoStack.length === 0) return;
		
		let state = this.redoStack.pop();
		this.undoStack.push(state);
		
		this.source = this.source.slice(0, state.location) + state.new + this.source.slice(state.location + state.old.length);
		this.refresh();
		
		this.cursorStart = state.location + state.new.length;
		this.cursorEnd = state.location + state.new.length;
		this.updateCursor();
	}
	
	getLineLength(i) {
		// get line length
		// by counting backwards until it finds another newline or reaches the beginning
		let lineLen = 0;
		for (let j = i; j >= 0 && this.source[j] !== "\n"; j--) {
			let c = this.source[j];
			
			if (c === "\t")		lineLen += TAB_WIDTH;
			else				lineLen++;
		}
		
		return lineLen;
	}
	
	updateOffset(_pos, _ox, _oy, _opos) {
		var offsetX = this[_ox];
		var offsetY = this[_oy];
		
		if (this[_pos] > this[_opos]) {
			for (let i = this[_opos]; i < this[_pos]; i++) {
				let char = this.source[i];
				
				if (char === "\n") {
					offsetY++;
					offsetX = 0;
				} else if (char === "\t") {
					offsetX += TAB_WIDTH;
				} else {
					offsetX++;
				}
			}
		} else if (this[_pos] < this[_opos]) {
			for (let i = this[_opos] - 1; i >= this[_pos]; i--) {
				let char = this.source[i];
				
				if (char === "\n") {
					offsetY--;
					
					let lineLen = this.getLineLength(i - 1);
					
					offsetX = lineLen;
				} else if (char === "\t") {
					offsetX -= TAB_WIDTH;
				} else {
					offsetX--;
				}
			}
		}
		
		this[_ox] = offsetX;
		this[_oy] = offsetY;
		this[_opos] = this[_pos];
	}
	
	updateCursor() {
		// update start offset
		this.updateOffset("cursorStart", "curOffsetX", "curOffsetY", "curPos");
		this.updateOffset("cursorEnd", "curEndOffsetX", "curEndOffsetY", "curEndPos");
		
		var selections = [];
		
		if (this.cursorStart == this.cursorEnd) {
			// clear selection boxes
			for (let box of this.selectBoxes) {
				box.remove();
			}
			this.selectBoxes = [];
		} else {
			// create selection boxes
			var min, max;
			var offsetx, offsety;
			
			if (this.cursorStart > this.cursorEnd) {
				max = this.cursorStart;
				min = this.cursorEnd;
				
				offsetx = this.curEndOffsetX;
				offsety = this.curEndOffsetY;
			} else {
				min = this.cursorStart;
				max = this.cursorEnd;
				
				offsetx = this.curOffsetX;
				offsety = this.curOffsetY;
			}
			
			var startx = offsetx;
			var starti = min;
			
			for (let i = min; i < max; i++) {
				let ch = this.source[i];
				
				if (ch === "\n") {
					selections.push([
						offsety * this.lineHeight,
						startx * this.charWidth + EDITOR_TEXT_LEFT,
						(offsetx - startx) * this.charWidth,
						this.lineHeight,
					]);
					
					offsetx = 0;
					startx = 0;
					starti = min;
					offsety++;
				} else if (ch === "\t") {
					offsetx += TAB_WIDTH;
				} else {
					offsetx++;
				}
			}
			
			{
				selections.push([
					offsety * this.lineHeight,
					startx * this.charWidth + EDITOR_TEXT_LEFT,
					(offsetx - startx) * this.charWidth,
					this.lineHeight,
				]);
			}
			
			for (let i = 0; i < selections.length; i++) {
				let data = selections[i];
				let box;
				
				if (i >= this.selectBoxes.length) {
					box = document.createElement("div");
					box.className = "editor-selection";
					this.selectBoxes.push(box);
					this.domElem.appendChild(box);
				} else {
					box = this.selectBoxes[i];
				}
				
				box.style.top = data[0] + "px";
				box.style.left = data[1] + "px";
				box.style.width = data[2] + "px";
				box.style.height = data[3] + "px";
			}
			
			while (selections.length < this.selectBoxes.length) {
				this.selectBoxes.pop().remove();
			}
		}
		
		this.cursor.style.left = Math.floor(this.curOffsetX * this.charWidth + EDITOR_TEXT_LEFT) + "px";
		this.cursor.style.top = Math.floor(this.curOffsetY * this.lineHeight) + "px";
		
		this.cursor2.style.left = Math.floor(this.curEndOffsetX * this.charWidth + EDITOR_TEXT_LEFT) + "px";
		this.cursor2.style.top = Math.floor(this.curEndOffsetY * this.lineHeight) + "px";
	}
	
	refresh() {
		// create/replace lines
		let lines = this.source.split("\n");
		let multi = false;
		
		for (let i = 0; i < lines.length; i++) {
			let line = lines[i];
			
			if (i >= this.lineElems.length) {
				let lineElem = new EditorLine(i, line, this, multi)
				this.lineElems.push(lineElem);
				
				multi = lineElem.nextMulti;
			} else {
				let lineElem = this.lineElems[i];
				
				if (lineElem.lineNumber !== i) lineElem.setLineNum(i);
				if (lineElem.text !== line || (multi !== lineElem.startMulti)) lineElem.setText(line, multi);
				
				multi = lineElem.nextMulti;
			}
		}
		
		// remove lines that no longer exist
		while (this.lineElems.length > lines.length) {
			let el = this.lineElems.pop();
			el.remove();
		}
		
		// scroll
		let scrollY = this.curOffsetY * this.lineHeight; 
		let dist = scrollY - this.domElem.scrollTop;
		
		if (dist > this.domElem.offsetHeight - this.lineHeight * 2) {
			this.domElem.scrollTop = scrollY - this.domElem.offsetHeight + this.lineHeight * 2;
		}
		
		if (dist < this.lineHeight / 2) {
			this.domElem.scrollTop = scrollY - this.lineHeight / 2;
		}
	}
	
	getText() {
		return this.source;
	}
	
	setText(str) {
		this.undoStack = [];
		this.redoStack = [];
		
		str = str.replaceAll("\r\n", "\n");
		
		this.source = str;
		this.refresh();
	}
}