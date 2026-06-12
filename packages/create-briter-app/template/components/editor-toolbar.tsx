"use client";

import type { CommandName } from "@/lib/editor/markdown-commands";

export type ToolbarAction =
  | { type: "command"; command: CommandName }
  | { type: "link" }
  | { type: "image" };

type ToolbarButton = {
  id: string;
  label: string;
  shortcut?: string;
  action: ToolbarAction;
  icon: React.ReactNode;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function Icon({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true" {...stroke}>
      {children}
    </svg>
  );
}

const GROUPS: ToolbarButton[][] = [
  [
    {
      id: "heading1",
      label: "Heading 1",
      action: { type: "command", command: "heading1" },
      icon: (
        <span className="toolbar-glyph">
          H<sub>1</sub>
        </span>
      ),
    },
    {
      id: "heading2",
      label: "Heading 2",
      action: { type: "command", command: "heading2" },
      icon: (
        <span className="toolbar-glyph">
          H<sub>2</sub>
        </span>
      ),
    },
    {
      id: "heading3",
      label: "Heading 3",
      action: { type: "command", command: "heading3" },
      icon: (
        <span className="toolbar-glyph">
          H<sub>3</sub>
        </span>
      ),
    },
  ],
  [
    {
      id: "bold",
      label: "Bold",
      shortcut: "⌘B",
      action: { type: "command", command: "bold" },
      icon: <span className="toolbar-glyph toolbar-glyph-bold">B</span>,
    },
    {
      id: "italic",
      label: "Italic",
      shortcut: "⌘I",
      action: { type: "command", command: "italic" },
      icon: <span className="toolbar-glyph toolbar-glyph-italic">I</span>,
    },
    {
      id: "strikethrough",
      label: "Strikethrough",
      action: { type: "command", command: "strikethrough" },
      icon: <span className="toolbar-glyph toolbar-glyph-strike">S</span>,
    },
    {
      id: "inlineCode",
      label: "Inline code",
      action: { type: "command", command: "inlineCode" },
      icon: (
        <Icon>
          <path d="M7.5 6.5 4 10l3.5 3.5M12.5 6.5 16 10l-3.5 3.5" />
        </Icon>
      ),
    },
  ],
  [
    {
      id: "link",
      label: "Link",
      shortcut: "⌘K",
      action: { type: "link" },
      icon: (
        <Icon>
          <path d="M8.5 11.5 11.5 8.5" />
          <path d="M9 6.8 10.8 5a2.97 2.97 0 0 1 4.2 4.2L13.2 11" />
          <path d="M11 13.2 9.2 15a2.97 2.97 0 0 1-4.2-4.2L6.8 9" />
        </Icon>
      ),
    },
    {
      id: "image",
      label: "Insert image",
      action: { type: "image" },
      icon: (
        <Icon>
          <rect x="3" y="4" width="14" height="12" rx="1.5" />
          <circle cx="7.2" cy="8.2" r="1.2" />
          <path d="m3.5 14.5 4-4 3 3 2.5-2.5 3.5 3.5" />
        </Icon>
      ),
    },
    {
      id: "quote",
      label: "Blockquote",
      action: { type: "command", command: "quote" },
      icon: (
        <Icon>
          <path d="M5 6.5c-1.2.9-2 2.2-2 3.8 0 1.7 1 3.2 2.6 3.2 1.3 0 2.2-1 2.2-2.2C7.8 10.1 7 9.2 5.8 9.2c.2-1 .8-1.9 1.7-2.7" />
          <path d="M13 6.5c-1.2.9-2 2.2-2 3.8 0 1.7 1 3.2 2.6 3.2 1.3 0 2.2-1 2.2-2.2 0-1.2-.8-2.1-2-2.1.2-1 .8-1.9 1.7-2.7" />
        </Icon>
      ),
    },
  ],
  [
    {
      id: "bulletList",
      label: "Bullet list",
      action: { type: "command", command: "bulletList" },
      icon: (
        <Icon>
          <circle cx="4.5" cy="5.5" r="0.6" fill="currentColor" />
          <circle cx="4.5" cy="10" r="0.6" fill="currentColor" />
          <circle cx="4.5" cy="14.5" r="0.6" fill="currentColor" />
          <path d="M8 5.5h8M8 10h8M8 14.5h8" />
        </Icon>
      ),
    },
    {
      id: "orderedList",
      label: "Numbered list",
      action: { type: "command", command: "orderedList" },
      icon: (
        <Icon>
          <path d="M4 4.5h1v3M3.8 12.5h1.7c.4 1-.3 1.6-1.7 3h2" strokeWidth="1.2" />
          <path d="M8.5 5.5h8M8.5 14.5h8M8.5 10h8" />
        </Icon>
      ),
    },
    {
      id: "taskList",
      label: "Task list",
      action: { type: "command", command: "taskList" },
      icon: (
        <Icon>
          <rect x="3" y="4" width="5" height="5" rx="1" />
          <path d="m4.2 6.5 1 1 1.6-2M11 6.5h6M11 13.5h6" />
          <rect x="3" y="11" width="5" height="5" rx="1" />
        </Icon>
      ),
    },
  ],
  [
    {
      id: "codeBlock",
      label: "Code block",
      action: { type: "command", command: "codeBlock" },
      icon: (
        <Icon>
          <rect x="2.5" y="3.5" width="15" height="13" rx="1.5" />
          <path d="m7.5 8-2 2 2 2M12.5 8l2 2-2 2" />
        </Icon>
      ),
    },
    {
      id: "table",
      label: "Table",
      action: { type: "command", command: "table" },
      icon: (
        <Icon>
          <rect x="3" y="4" width="14" height="12" rx="1.5" />
          <path d="M3 8.5h14M3 12.5h14M10 4v12" />
        </Icon>
      ),
    },
    {
      id: "horizontalRule",
      label: "Divider",
      action: { type: "command", command: "horizontalRule" },
      icon: (
        <Icon>
          <path d="M3 10h14" />
          <path d="M6 5.5h8M6 14.5h8" opacity="0.35" />
        </Icon>
      ),
    },
  ],
];

export function EditorToolbar({
  onAction,
  disabled,
}: {
  onAction: (action: ToolbarAction) => void;
  disabled?: boolean;
}) {
  return (
    <div className="editor-toolbar" role="toolbar" aria-label="Formatting">
      {GROUPS.map((group, index) => (
        <div className="editor-toolbar-group" key={index}>
          {group.map((button) => (
            <button
              key={button.id}
              type="button"
              className="editor-toolbar-button"
              title={button.shortcut ? `${button.label} (${button.shortcut})` : button.label}
              aria-label={button.label}
              disabled={disabled}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onAction(button.action)}
            >
              {button.icon}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
