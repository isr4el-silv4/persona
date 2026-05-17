// Manual mock for @earendil-works/pi-tui
export interface Component {
  render(width: number): string[];
  handleInput?(data: string): void;
  invalidate(): void;
}

export const matchesKey = (data: string, key: string): boolean => {
  if (key === "space") return data === " " || data === "space";
  if (key === "enter") return data === "enter" || data === "\r";
  if (key === "escape") return data === "escape" || data === "\x1b";
  if (key === "ctrl+a") return data === "ctrl+a" || data === "\x01";
  return data === key;
};

export const Key: {
  readonly up: string;
  readonly down: string;
  readonly left: string;
  readonly right: string;
  readonly enter: string;
  readonly escape: string;
  readonly space: string;
  readonly backspace: string;
  readonly delete: string;
  readonly tab: string;
  readonly home: string;
  readonly end: string;
  readonly ctrl: (letter: string) => string;
} = {
  up: "up",
  down: "down",
  left: "left",
  right: "right",
  enter: "enter",
  escape: "escape",
  space: " ",
  backspace: "backspace",
  delete: "delete",
  tab: "tab",
  home: "home",
  end: "end",
  ctrl: (letter: string): string => `ctrl(${letter})`,
};

export const truncateToWidth = (str: string, width: number, ellipsis = "..."): string => {
  if (visibleWidth(str) <= width) return str;
  const ellipsisWidth = visibleWidth(ellipsis);
  const truncated = str.slice(0, width - ellipsisWidth);
  return truncated + ellipsis;
};

export const visibleWidth = (str: string): number => {
  // Remove ANSI escape codes before counting
  const cleaned = str.replace(/\x1b\[[0-9;]*m/g, "");
  return cleaned.length;
};
export const CURSOR_MARKER = "";

// Dummy implementations for test purposes
export class Text {
  constructor(
    public text: string,
    public paddingX = 1,
    public paddingY = 1,
    public bgFn?: (s: string) => string
  ) {}
  render(_width: number): string[] {
    return [this.text];
  }
  invalidate(): void {}
  setText(text: string): void {
    this.text = text;
  }
}

export class Box {
  constructor(
    public paddingX = 1,
    public paddingY = 1,
    public bgFn?: (s: string) => string
  ) {}
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
  addChild(_component: any): void {}
  setBgFn(_fn: (s: string) => string): void {}
}

export class Container {
  private children: Component[] = [];
  render(_width: number): string[] {
    return this.children.flatMap((c) => c.render(_width));
  }
  invalidate(): void {
    this.children.forEach((c) => c.invalidate());
  }
  addChild(component: Component): void {
    this.children.push(component);
  }
  removeChild(component: Component): void {
    this.children = this.children.filter((c) => c !== component);
  }
  clear(): void {
    this.children = [];
  }
}

export class Spacer {
  constructor(public lines = 1) {}
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
}

export class Markdown {
  constructor(
    public text: string,
    public paddingX = 1,
    public paddingY = 1,
    public theme?: any
  ) {}
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
  setText(text: string): void {
    this.text = text;
  }
}

export class Image {
  constructor(
    public base64Data: string,
    public mimeType: string,
    public theme: any,
    public options?: { maxWidthCells?: number; maxHeightCells?: number }
  ) {}
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
}

export class SelectList {
  onSelect?: (item: any) => void;
  onCancel?: () => void;
  constructor(
    public items: any[],
    public maxVisible: number,
    public theme?: any
  ) {}
  render(_width: number): string[] {
    return [];
  }
  handleInput?(_data: string): void {}
  invalidate(): void {}
}

export class SettingsList {
  constructor(
    public items: any[],
    public maxVisible: number,
    public theme: any,
    public onChange?: (id: string, value: string) => void,
    public onClose?: () => void,
    public options?: { enableSearch?: boolean }
  ) {}
  render(_width: number): string[] {
    return [];
  }
  handleInput?(_data: string): void {}
  invalidate(): void {}
}

export class BorderedLoader {
  onAbort?: () => void;
  constructor(
    public tui: any,
    public theme: any,
    public message: string
  ) {
    this.signal = new AbortController().signal;
  }
  render(_width: number): string[] {
    return [];
  }
  handleInput?(_data: string): void {}
  invalidate(): void {}
  signal!: AbortSignal;
}

export class DynamicBorder {
  constructor(public colorFn: (s: string) => string) {}
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
}

export class CustomEditor {
  constructor(public theme: any, public keybindings: any) {}
  render(_width: number): string[] {
    return [];
  }
  handleInput(_data: string): void {}
  invalidate(): void {}
}
