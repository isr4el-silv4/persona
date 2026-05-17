// Type declarations for @earendil-works/pi-coding-agent (mock for testing)
declare module "@earendil-works/pi-coding-agent" {
  export type ExtensionAPI = any;
  export type ExtensionContext = any;
}

// Type declarations for @earendil-works/pi-tui (mock for testing)
declare module "@earendil-works/pi-tui" {
  export const matchesKey: (data: string, key: string) => boolean;
  export const Key: any;
  export const truncateToWidth: (str: string, width: number, ellipsis?: string) => string;
  export const visibleWidth: (str: string) => number;
  export const CURSOR_MARKER: string;

  export interface Component {
    render(width: number): string[];
    handleInput?(data: string): void;
    invalidate(): void;
  }

  export interface Focusable {
    focused: boolean;
  }

  export class Text implements Component {
    constructor(text: string, paddingX?: number, paddingY?: number, bgFn?: (s: string) => string);
    render(width: number): string[];
    invalidate(): void;
    setText(text: string): void;
  }

  export class Box implements Component {
    constructor(paddingX?: number, paddingY?: number, bgFn?: (s: string) => string);
    render(width: number): string[];
    invalidate(): void;
    addChild(component: Component): void;
    setBgFn(fn: (s: string) => string): void;
  }

  export class Container implements Component {
    render(width: number): string[];
    invalidate(): void;
    addChild(component: Component): void;
    removeChild(component: Component): void;
    clear(): void;
  }

  export class Spacer implements Component {
    constructor(lines?: number);
    render(width: number): string[];
    invalidate(): void;
  }

  export class Markdown implements Component {
    constructor(text: string, paddingX?: number, paddingY?: number, theme?: any);
    render(width: number): string[];
    invalidate(): void;
    setText(text: string): void;
  }

  export class Image implements Component {
    constructor(base64Data: string, mimeType: string, theme: any, options?: { maxWidthCells?: number; maxHeightCells?: number });
    render(width: number): string[];
    invalidate(): void;
  }

  export class SelectList implements Component {
    constructor(items: SelectItem[], maxVisible: number, theme?: any);
    render(width: number): string[];
    handleInput?(data: string): void;
    invalidate(): void;
    onSelect?: (item: SelectItem) => void;
    onCancel?: () => void;
  }

  export interface SelectItem {
    value: string;
    label: string;
    description?: string;
  }

  export class SettingsList implements Component {
    constructor(
      items: SettingItem[],
      maxVisible: number,
      theme: any,
      onChange?: (id: string, value: string) => void,
      onClose?: () => void,
      options?: { enableSearch?: boolean }
    );
    render(width: number): string[];
    handleInput?(data: string): void;
    invalidate(): void;
  }

  export interface SettingItem {
    id: string;
    label: string;
    currentValue: string;
    values: string[];
  }

  export class BorderedLoader implements Component {
    constructor(tui: any, theme: any, message: string);
    render(width: number): string[];
    handleInput?(data: string): void;
    invalidate(): void;
    onAbort?: () => void;
    signal: AbortSignal;
  }

  export class DynamicBorder implements Component {
    constructor(colorFn: (s: string) => string);
    render(width: number): string[];
    invalidate(): void;
  }

  export class CustomEditor implements Component {
    constructor(theme: any, keybindings: any);
    render(width: number): string[];
    handleInput(data: string): void;
    invalidate(): void;
  }
}
