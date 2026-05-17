import {
  matchesKey,
  truncateToWidth,
  type Component,
} from "@earendil-works/pi-tui";

export interface MultiSelectItem {
  value: string;
  label: string;
}

interface MultiSelectListOptions {
  highlightPrefix?: (s: string) => string;
  selectedPrefix?: (s: string) => string;
  unselectedPrefix?: (s: string) => string;
  selectedText?: (s: string) => string;
  unselectedText?: (s: string) => string;
}

const DEFAULT_OPTIONS: Required<MultiSelectListOptions> = {
  highlightPrefix: (s: string) => `→ `,
  selectedPrefix: (s: string) => `✓ `,
  unselectedPrefix: (s: string) => `○ `,
  selectedText: (s: string) => s,
  unselectedText: (s: string) => s,
};

export class MultiSelectList implements Component {
  private items: MultiSelectItem[];
  public selected: Set<string> = new Set();
  private highlighted = 0;
  private maxVisible: number;
  private options: Required<MultiSelectListOptions>;
  private cachedWidth?: number;
  private cachedLines?: string[];

  public onSelect?: () => void;
  public onCancel?: () => void;
  public onEmpty?: () => void;

  constructor(
    items: MultiSelectItem[],
    maxVisible: number,
    options: MultiSelectListOptions = {}
  ) {
    this.items = items;
    this.maxVisible = Math.max(3, Math.min(maxVisible, items.length));
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  handleInput(data: string): void {
    if (matchesKey(data, "up") && this.highlighted > 0) {
      this.highlighted--;
      this.invalidate();
    } else if (
      matchesKey(data, "down") &&
      this.highlighted < this.items.length - 1
    ) {
      this.highlighted++;
      this.invalidate();
    } else if (matchesKey(data, "space")) {
      const item = this.items[this.highlighted];
      if (item) {
        if (this.selected.has(item.value)) {
          this.selected.delete(item.value);
        } else {
          this.selected.add(item.value);
        }
        this.invalidate();
      }
    } else if (matchesKey(data, "ctrl+a")) {
      // Ctrl+A: select/deselect all
      const allSelected = this.items.every((item) => this.selected.has(item.value));
      if (allSelected) {
        this.selected.clear();
      } else {
        this.items.forEach((item) => this.selected.add(item.value));
      }
      this.invalidate();
    } else if (matchesKey(data, "enter")) {
      if (this.selected.size === 0) {
        this.onEmpty?.();
      } else {
        this.onSelect?.();
      }
    } else if (matchesKey(data, "escape")) {
      this.onCancel?.();
    }
  }

  render(width: number): string[] {
    if (this.cachedLines && this.cachedWidth === width) {
      return this.cachedLines;
    }

    const maxOffset = Math.max(0, this.items.length - this.maxVisible);
    const offset = Math.min(
      Math.max(0, this.highlighted - Math.floor(this.maxVisible / 2)),
      maxOffset
    );
    const visibleItems = this.items.slice(offset, offset + this.maxVisible);

    this.cachedLines = visibleItems.map((item) => {
      const index = this.items.indexOf(item);
      const isHighlighted = index === this.highlighted;
      const isSelected = this.selected.has(item.value);

      let prefix: string;
      if (isHighlighted) {
        prefix = this.options.highlightPrefix("→ ");
      } else {
        prefix = "  ";
      }

      const checkbox = isSelected
        ? this.options.selectedPrefix("✓ ")
        : this.options.unselectedPrefix("○ ");

      const text = isSelected
        ? this.options.selectedText(item.label)
        : this.options.unselectedText(item.label);

      return truncateToWidth(`${prefix}${checkbox}${text}`, width);
    });

    this.cachedWidth = width;
    return this.cachedLines;
  }

  invalidate(): void {
    this.cachedWidth = undefined;
    this.cachedLines = undefined;
  }

  getSelectedValues(): string[] {
    return this.items
      .filter((item) => this.selected.has(item.value))
      .map((item) => item.value);
  }
}
