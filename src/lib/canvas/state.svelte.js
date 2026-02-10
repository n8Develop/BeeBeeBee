// Canvas state singleton — follows createAuth() pattern

function createCanvasState() {
  let tool = $state('pen');
  let color = $state('#000000');
  let brushSize = $state(4);
  let fontSize = $state(16);
  let selectedStamp = $state('icon-star');
  let operations = $state([]);
  let redoStack = $state([]);
  let drawing = $state(false);
  let soundEnabled = $state(true);

  return {
    get tool() { return tool; },
    set tool(v) { tool = v; },

    get color() { return color; },
    set color(v) { color = v; },

    get brushSize() { return brushSize; },
    set brushSize(v) { brushSize = v; },

    get fontSize() { return fontSize; },
    set fontSize(v) { fontSize = v; },

    get selectedStamp() { return selectedStamp; },
    set selectedStamp(v) { selectedStamp = v; },

    get operations() { return operations; },
    get redoStack() { return redoStack; },

    get drawing() { return drawing; },
    set drawing(v) { drawing = v; },

    get soundEnabled() { return soundEnabled; },
    set soundEnabled(v) { soundEnabled = v; },

    commit(op) {
      operations = [...operations, op];
      redoStack = [];
    },

    undo() {
      if (operations.length === 0) return;
      const op = operations[operations.length - 1];
      operations = operations.slice(0, -1);
      redoStack = [...redoStack, op];
    },

    redo() {
      if (redoStack.length === 0) return;
      const op = redoStack[redoStack.length - 1];
      redoStack = redoStack.slice(0, -1);
      operations = [...operations, op];
    },

    clear() {
      this.commit({ type: 'clear' });
    },

    reset() {
      operations = [];
      redoStack = [];
    },

    exportOps() {
      return { operations: [...operations], width: 600, height: 200 };
    },

    importOps(data) {
      operations = [...data.operations];
      redoStack = [];
    }
  };
}

export const canvasState = createCanvasState();
