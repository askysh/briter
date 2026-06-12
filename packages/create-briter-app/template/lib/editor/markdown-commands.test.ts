import { describe, expect, test } from "bun:test";

import {
  COMMANDS,
  applyCommand,
  continueListOnEnter,
  insertLink,
} from "./markdown-commands";

function select(value: string, start: number, end = start) {
  return { value, start, end };
}

describe("inline wrap commands", () => {
  test("wraps a selection in bold markers", () => {
    const result = applyCommand(select("hello world", 0, 5), COMMANDS.bold);
    expect(result.value).toBe("**hello** world");
    expect(result.value.slice(result.start, result.end)).toBe("hello");
  });

  test("inserts a placeholder when nothing is selected", () => {
    const result = applyCommand(select("", 0), COMMANDS.bold);
    expect(result.value).toBe("**bold text**");
    expect(result.value.slice(result.start, result.end)).toBe("bold text");
  });

  test("unwraps when the selection is already wrapped", () => {
    const result = applyCommand(select("**hello** world", 2, 7), COMMANDS.bold);
    expect(result.value).toBe("hello world");
  });

  test("unwraps when markers are inside the selection", () => {
    const result = applyCommand(select("**hello** world", 0, 9), COMMANDS.bold);
    expect(result.value).toBe("hello world");
  });

  test("wraps inline code", () => {
    const result = applyCommand(select("run it", 0, 3), COMMANDS.inlineCode);
    expect(result.value).toBe("`run` it");
  });
});

describe("line prefix commands", () => {
  test("turns the current line into a heading", () => {
    const result = applyCommand(select("My title", 3), COMMANDS.heading2);
    expect(result.value).toBe("## My title");
  });

  test("replaces an existing heading level", () => {
    const result = applyCommand(select("# My title", 4), COMMANDS.heading3);
    expect(result.value).toBe("### My title");
  });

  test("toggles a heading off", () => {
    const result = applyCommand(select("## My title", 4), COMMANDS.heading2);
    expect(result.value).toBe("My title");
  });

  test("prefixes every selected line as a bullet list", () => {
    const result = applyCommand(select("one\ntwo\nthree", 0, 13), COMMANDS.bulletList);
    expect(result.value).toBe("- one\n- two\n- three");
  });

  test("numbers ordered list items sequentially", () => {
    const result = applyCommand(select("one\ntwo", 0, 7), COMMANDS.orderedList);
    expect(result.value).toBe("1. one\n2. two");
  });

  test("toggles bullet list off when all lines are bulleted", () => {
    const result = applyCommand(select("- one\n- two", 0, 11), COMMANDS.bulletList);
    expect(result.value).toBe("one\ntwo");
  });

  test("adds a heading prefix on an empty document", () => {
    const result = applyCommand(select("", 0), COMMANDS.heading2);
    expect(result.value).toBe("## ");
  });

  test("adds a blockquote", () => {
    const result = applyCommand(select("quoted", 0, 6), COMMANDS.quote);
    expect(result.value).toBe("> quoted");
  });

  test("adds task list markers", () => {
    const result = applyCommand(select("ship it", 2), COMMANDS.taskList);
    expect(result.value).toBe("- [ ] ship it");
  });
});

describe("block commands", () => {
  test("inserts a code block with surrounding blank lines", () => {
    const result = applyCommand(select("before after", 7, 12), COMMANDS.codeBlock);
    expect(result.value).toBe("before \n\n```\nafter\n```");
  });

  test("selects the placeholder inside an empty code block", () => {
    const result = applyCommand(select("", 0), COMMANDS.codeBlock);
    expect(result.value).toBe("```\ncode\n```");
    expect(result.value.slice(result.start, result.end)).toBe("code");
  });

  test("inserts a table scaffold", () => {
    const result = applyCommand(select("", 0), COMMANDS.table);
    expect(result.value).toContain("| Column | Column |");
    expect(result.value).toContain("| --- | --- |");
  });

  test("inserts a horizontal rule", () => {
    const result = applyCommand(select("above", 5), COMMANDS.horizontalRule);
    expect(result.value).toBe("above\n\n---");
  });
});

describe("insertLink", () => {
  test("uses the selection as link text and selects the url", () => {
    const result = insertLink(select("read the docs", 9, 13));
    expect(result.value).toBe("read the [docs](https://)");
    expect(result.value.slice(result.start, result.end)).toBe("https://");
  });

  test("inserts placeholder text when nothing is selected", () => {
    const result = insertLink(select("", 0));
    expect(result.value).toBe("[link text](https://)");
    expect(result.value.slice(result.start, result.end)).toBe("link text");
  });
});

describe("continueListOnEnter", () => {
  test("continues a bullet list", () => {
    const value = "- first";
    const result = continueListOnEnter(select(value, value.length));
    expect(result?.value).toBe("- first\n- ");
  });

  test("increments ordered list numbers", () => {
    const value = "3. third";
    const result = continueListOnEnter(select(value, value.length));
    expect(result?.value).toBe("3. third\n4. ");
  });

  test("continues task lists with an unchecked box", () => {
    const value = "- [x] done";
    const result = continueListOnEnter(select(value, value.length));
    expect(result?.value).toBe("- [x] done\n- [ ] ");
  });

  test("exits the list when the current item is empty", () => {
    const value = "- first\n- ";
    const result = continueListOnEnter(select(value, value.length));
    expect(result?.value).toBe("- first\n");
  });

  test("returns null on a plain line", () => {
    expect(continueListOnEnter(select("plain text", 10))).toBeNull();
  });

  test("returns null when there is an active selection", () => {
    expect(continueListOnEnter(select("- item", 0, 6))).toBeNull();
  });

  test("preserves indentation for nested lists", () => {
    const value = "  - nested";
    const result = continueListOnEnter(select(value, value.length));
    expect(result?.value).toBe("  - nested\n  - ");
  });
});
