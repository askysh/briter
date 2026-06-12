export type TextSelection = {
  value: string;
  start: number;
  end: number;
};

export type CommandResult = {
  value: string;
  start: number;
  end: number;
};

export type InlineWrapCommand = {
  kind: "inline";
  prefix: string;
  suffix: string;
  placeholder: string;
};

export type LinePrefixCommand = {
  kind: "line";
  prefix: string | ((lineIndex: number) => string);
  toggle: RegExp;
};

export type BlockCommand = {
  kind: "block";
  block: (selected: string) => string;
  selectInner?: { fromStart: number; length: number };
};

export type EditorCommand = InlineWrapCommand | LinePrefixCommand | BlockCommand;

function lineBoundsAround(value: string, start: number, end: number) {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  let lineEnd = value.indexOf("\n", end);
  if (lineEnd === -1) lineEnd = value.length;
  return { lineStart, lineEnd };
}

export function applyInlineWrap(
  selection: TextSelection,
  command: InlineWrapCommand,
): CommandResult {
  const { value, start, end } = selection;
  const selected = value.slice(start, end);
  const { prefix, suffix } = command;

  const before = value.slice(start - prefix.length, start);
  const after = value.slice(end, end + suffix.length);

  if (before === prefix && after === suffix) {
    const next =
      value.slice(0, start - prefix.length) + selected + value.slice(end + suffix.length);
    return { value: next, start: start - prefix.length, end: end - prefix.length };
  }

  if (
    selected.startsWith(prefix) &&
    selected.endsWith(suffix) &&
    selected.length >= prefix.length + suffix.length
  ) {
    const inner = selected.slice(prefix.length, selected.length - suffix.length);
    const next = value.slice(0, start) + inner + value.slice(end);
    return { value: next, start, end: start + inner.length };
  }

  const content = selected || command.placeholder;
  const next = value.slice(0, start) + prefix + content + suffix + value.slice(end);
  return {
    value: next,
    start: start + prefix.length,
    end: start + prefix.length + content.length,
  };
}

export function applyLinePrefix(
  selection: TextSelection,
  command: LinePrefixCommand,
): CommandResult {
  const { value, start, end } = selection;
  const { lineStart, lineEnd } = lineBoundsAround(value, start, end);
  const segment = value.slice(lineStart, lineEnd);
  const lines = segment.split("\n");

  const prefixFor = (index: number) =>
    typeof command.prefix === "function" ? command.prefix(index) : command.prefix;

  const allExactlyPrefixed =
    lines.some((line) => line.length > 0) &&
    lines.every((line, index) => {
      if (line.length === 0) return true;
      const match = line.match(command.toggle);
      return match !== null && match[0] === prefixFor(index);
    });

  const nextLines = lines.map((line, index) => {
    if (line.length === 0 && lines.length > 1) return line;
    const cleaned = line.replace(command.toggle, "");
    if (allExactlyPrefixed) {
      return cleaned;
    }
    return prefixFor(index) + cleaned;
  });

  const nextSegment = nextLines.join("\n");
  const next = value.slice(0, lineStart) + nextSegment + value.slice(lineEnd);
  return { value: next, start: lineStart, end: lineStart + nextSegment.length };
}

export function applyBlock(selection: TextSelection, command: BlockCommand): CommandResult {
  const { value, start, end } = selection;
  const selected = value.slice(start, end);
  const block = command.block(selected);

  const needsLeadingBreak = start > 0 && value[start - 1] !== "\n";
  const needsTrailingBreak = end < value.length && value[end] !== "\n";

  const inserted =
    (needsLeadingBreak ? "\n\n" : "") + block + (needsTrailingBreak ? "\n" : "");
  const next = value.slice(0, start) + inserted + value.slice(end);

  const blockStart = start + (needsLeadingBreak ? 2 : 0);

  if (command.selectInner && selected.length === 0) {
    const innerStart = blockStart + command.selectInner.fromStart;
    return { value: next, start: innerStart, end: innerStart + command.selectInner.length };
  }

  const cursor = blockStart + block.length;
  return { value: next, start: cursor, end: cursor };
}

export function applyCommand(selection: TextSelection, command: EditorCommand): CommandResult {
  switch (command.kind) {
    case "inline":
      return applyInlineWrap(selection, command);
    case "line":
      return applyLinePrefix(selection, command);
    case "block":
      return applyBlock(selection, command);
  }
}

export function insertLink(selection: TextSelection, url = "https://"): CommandResult {
  const { value, start, end } = selection;
  const selected = value.slice(start, end);
  const text = selected || "link text";
  const markdown = `[${text}](${url})`;
  const next = value.slice(0, start) + markdown + value.slice(end);

  if (selected) {
    const urlStart = start + selected.length + 3;
    return { value: next, start: urlStart, end: urlStart + url.length };
  }

  return { value: next, start: start + 1, end: start + 1 + text.length };
}

/**
 * Continue markdown lists when Enter is pressed. Returns null when no list
 * continuation applies (the editor should fall back to a plain newline).
 */
export function continueListOnEnter(selection: TextSelection): CommandResult | null {
  const { value, start, end } = selection;
  if (start !== end) return null;

  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const line = value.slice(lineStart, start);

  const match = line.match(/^(\s*)(?:([-*+])|(\d+)([.)]))(\s+)(\[[ xX]\]\s+)?/);
  if (!match) return null;

  const [token, indent, bullet, ordinal, ordinalDelimiter, gap, task] = match;
  const contentAfterMarker = line.slice(token.length);

  if (contentAfterMarker.trim().length === 0) {
    const next = value.slice(0, lineStart) + value.slice(start);
    return { value: next, start: lineStart, end: lineStart };
  }

  const marker = bullet
    ? `${indent}${bullet}${gap}`
    : `${indent}${Number(ordinal) + 1}${ordinalDelimiter}${gap}`;
  const continuation = `\n${marker}${task ? "[ ] " : ""}`;
  const next = value.slice(0, start) + continuation + value.slice(start);
  const cursor = start + continuation.length;
  return { value: next, start: cursor, end: cursor };
}

export const COMMANDS = {
  bold: { kind: "inline", prefix: "**", suffix: "**", placeholder: "bold text" },
  italic: { kind: "inline", prefix: "_", suffix: "_", placeholder: "italic text" },
  strikethrough: { kind: "inline", prefix: "~~", suffix: "~~", placeholder: "struck text" },
  inlineCode: { kind: "inline", prefix: "`", suffix: "`", placeholder: "code" },
  heading1: { kind: "line", prefix: "# ", toggle: /^#{1,6}\s+/ },
  heading2: { kind: "line", prefix: "## ", toggle: /^#{1,6}\s+/ },
  heading3: { kind: "line", prefix: "### ", toggle: /^#{1,6}\s+/ },
  quote: { kind: "line", prefix: "> ", toggle: /^>\s+/ },
  bulletList: { kind: "line", prefix: "- ", toggle: /^\s*[-*+]\s+/ },
  orderedList: {
    kind: "line",
    prefix: (index: number) => `${index + 1}. `,
    toggle: /^\s*\d+[.)]\s+/,
  },
  taskList: { kind: "line", prefix: "- [ ] ", toggle: /^\s*[-*+]\s+\[[ xX]\]\s+/ },
  codeBlock: {
    kind: "block",
    block: (selected: string) => `\`\`\`\n${selected || "code"}\n\`\`\``,
    selectInner: { fromStart: 4, length: 4 },
  },
  table: {
    kind: "block",
    block: () =>
      "| Column | Column |\n| --- | --- |\n| Cell | Cell |\n| Cell | Cell |",
    selectInner: { fromStart: 2, length: 6 },
  },
  horizontalRule: {
    kind: "block",
    block: () => "---",
  },
} satisfies Record<string, EditorCommand>;

export type CommandName = keyof typeof COMMANDS;
