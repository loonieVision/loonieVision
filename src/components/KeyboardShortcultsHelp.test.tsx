import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KeyboardShortcutsHelp } from "./KeyboardShortcultsHelp";

describe("KeyboardShortcutsHelp", () => {
  it("renders the help button with icon", () => {
    render(<KeyboardShortcutsHelp />);

    const helpButton = screen.getByRole("button");
    expect(helpButton).toBeInTheDocument();
    expect(helpButton).toHaveClass("p-1", "text-slate-400");
  });

  it("renders all keyboard shortcuts on hover", () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("Focus audio on viewport")).toBeInTheDocument();
    expect(screen.getByText("Toggle fullscreen")).toBeInTheDocument();
    expect(screen.getByText("Mute/unmute")).toBeInTheDocument();
    expect(screen.getByText("Toggle sidebar")).toBeInTheDocument();
    expect(screen.getByText("Volume control")).toBeInTheDocument();
    expect(screen.getByText("Remove stream")).toBeInTheDocument();
    expect(screen.getByText("Exit fullscreen")).toBeInTheDocument();
  });

  it("displays correct keyboard shortcut labels", () => {
    render(<KeyboardShortcutsHelp />);

    expect(screen.getByText("1-4")).toBeInTheDocument();
    expect(screen.getByText("F")).toBeInTheDocument();
    expect(screen.getByText("M")).toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
    expect(screen.getByText("↑↓")).toBeInTheDocument();
    expect(screen.getByText("Del")).toBeInTheDocument();
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("has correct hover group class for tooltip behavior", () => {
    const { container } = render(<KeyboardShortcutsHelp />);

    const groupDiv = container.querySelector(".group.relative");
    expect(groupDiv).toBeInTheDocument();
  });

  it("has tooltip with correct positioning and styling", () => {
    const { container } = render(<KeyboardShortcutsHelp />);

    const tooltip = container.querySelector(".absolute.right-0.top-full.z-50.mt-2");
    expect(tooltip).toBeInTheDocument();
    expect(tooltip).toHaveClass("hidden", "group-hover:block");
  });

  it("has correct number of shortcuts displayed", () => {
    const { container } = render(<KeyboardShortcutsHelp />);

    const shortcutRows = container.querySelectorAll(".group.relative .space-y-2 > div");
    expect(shortcutRows).toHaveLength(7);
  });

  it("displays shortcuts in correct order", () => {
    const { container } = render(<KeyboardShortcutsHelp />);

    const shortcutRows = container.querySelectorAll(".group.relative .space-y-2 > div");
    const firstRowShortcut = shortcutRows[0].querySelector("kbd");
    expect(firstRowShortcut).toHaveTextContent("1-4");

    const lastRowShortcut = shortcutRows[6].querySelector("kbd");
    expect(lastRowShortcut).toHaveTextContent("Esc");
  });
});
