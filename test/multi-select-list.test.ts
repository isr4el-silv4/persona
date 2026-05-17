import { describe, it, expect } from "@jest/globals";
import { MultiSelectList, type MultiSelectItem } from "../multi-select-list";

describe("MultiSelectList", () => {
  const items: MultiSelectItem[] = [
    { value: "read", label: "read" },
    { value: "grep", label: "grep" },
    { value: "find", label: "find" },
    { value: "ls", label: "ls" },
    { value: "bash", label: "bash" },
  ];

  it("should render items with unselected markers", () => {
    const list = new MultiSelectList(items, 5);
    const lines = list.render(80);
    expect(lines).toHaveLength(5);
    expect(lines[0]).toContain("○");
  });

  it("should highlight the first item by default", () => {
    const list = new MultiSelectList(items, 5);
    const lines = list.render(80);
    expect(lines[0]).toContain("→");
  });

  it("should navigate down with Key.down", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("down");
    const lines = list.render(80);
    expect(lines[0]).not.toContain("→");
    expect(lines[1]).toContain("→");
  });

  it("should navigate up with Key.up", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("down");
    list.handleInput?.("down");
    list.handleInput?.("up");
    const lines = list.render(80);
    expect(lines[1]).toContain("→");
  });

  it("should toggle selection with space", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("space"); // select first item
    const values = list.getSelectedValues();
    expect(values).toContain("read");
  });

  it("should deselect with second space press", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("space"); // select
    list.handleInput?.("space"); // deselect
    const values = list.getSelectedValues();
    expect(values).not.toContain("read");
  });

  it("should select multiple items", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("space"); // select read
    list.handleInput?.("down");
    list.handleInput?.("space"); // select grep
    list.handleInput?.("down");
    list.handleInput?.("space"); // select find
    const values = list.getSelectedValues();
    expect(values).toContain("read");
    expect(values).toContain("grep");
    expect(values).toContain("find");
  });

  it("should respect maxVisible limit", () => {
    const list = new MultiSelectList(items, 3);
    const lines = list.render(80);
    expect(lines).toHaveLength(3);
  });

  it("should handle empty items list", () => {
    const list = new MultiSelectList([], 5);
    const lines = list.render(80);
    expect(lines).toHaveLength(0);
  });

  it("should not navigate past boundaries", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("up"); // should stay at 0
    const lines = list.render(80);
    expect(lines[0]).toContain("→");
  });

  it("should not navigate past last item", () => {
    const list = new MultiSelectList(items, 5);
    for (let i = 0; i < 5; i++) {
      list.handleInput?.("down");
    }
    list.handleInput?.("down"); // should stay at 4
    const lines = list.render(80);
    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[lines.length - 1]).toContain("→");
  });

  it("should call onSelect callback when enter is pressed", () => {
    const list = new MultiSelectList(items, 5);
    let called = false;
    list.onSelect = () => { called = true; };
    list.handleInput?.("space"); // select first item
    list.handleInput?.("enter");
    expect(called).toBe(true);
  });

  it("should call onCancel callback when escape is pressed", () => {
    const list = new MultiSelectList(items, 5);
    let called = false;
    list.onCancel = () => { called = true; };
    list.handleInput?.("escape");
    expect(called).toBe(true);
  });

  it("should select all with ctrl+a", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("ctrl+a");
    const values = list.getSelectedValues();
    expect(values).toHaveLength(5);
    expect(values).toContain("read");
    expect(values).toContain("grep");
    expect(values).toContain("find");
    expect(values).toContain("ls");
    expect(values).toContain("bash");
  });

  it("should deselect all with ctrl+a when all selected", () => {
    const list = new MultiSelectList(items, 5);
    list.handleInput?.("ctrl+a"); // select all
    list.handleInput?.("ctrl+a"); // deselect all
    const values = list.getSelectedValues();
    expect(values).toHaveLength(0);
  });

  it("should invalidate clear cache", () => {
    const list = new MultiSelectList(items, 5);
    list.render(80);
    list.invalidate();
    // After invalidate, render should return the same lines but recomputed
    const lines = list.render(80);
    expect(lines).toHaveLength(5);
  });

  it("should call onEmpty callback when enter is pressed with no selections", () => {
    const list = new MultiSelectList(items, 5);
    let called = false;
    list.onEmpty = () => { called = true; };
    list.handleInput?.("enter");
    expect(called).toBe(true);
  });

  it("should NOT call onEmpty when at least one item is selected", () => {
    const list = new MultiSelectList(items, 5);
    let emptyCalled = false;
    let selectCalled = false;
    list.onEmpty = () => { emptyCalled = true; };
    list.onSelect = () => { selectCalled = true; };
    list.handleInput?.("space"); // select first item
    list.handleInput?.("enter");
    expect(emptyCalled).toBe(false);
    expect(selectCalled).toBe(true);
  });
});
