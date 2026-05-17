// Manual mock for @earendil-works/pi-tui
export const matchesKey = (data: string, key: string): boolean => {
  if (key === " ") return data === " " || data === "space";
  if (key === "enter") return data === "enter" || data === "\r";
  if (key === "escape") return data === "escape" || data === "\x1b";
  return data === key;
};

export const Key = {
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
} as const;

export const truncateToWidth = (str: string, _width: number, _ellipsis?: string): string => str;
export const visibleWidth = (str: string): number => str.length;
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
  private children: any[] = [];
  render(_width: number): string[] {
    return [];
  }
  invalidate(): void {}
  addChild(component: any): void {
    this.children.push(component);
  }
  removeChild(component: any): void {
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
