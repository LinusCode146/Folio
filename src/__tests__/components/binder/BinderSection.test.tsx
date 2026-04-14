import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BinderSection } from "@/components/binder/BinderSection";

function renderSection(props: Partial<React.ComponentProps<typeof BinderSection>> = {}) {
  const defaults = {
    title: "Manuscript",
    children: <div data-testid="child">Children</div>,
    onAdd: vi.fn(),
    onAddFolder: vi.fn(),
  };
  return render(<BinderSection {...defaults} {...props} />);
}

describe("BinderSection", () => {
  it("renders the section title", () => {
    renderSection({ title: "Characters" });
    expect(screen.getByText("Characters")).toBeInTheDocument();
  });

  it("renders children when expanded (default)", () => {
    renderSection();
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("hides children after clicking the toggle button", () => {
    renderSection();
    const toggle = screen.getByRole("button", { name: /manuscript/i });
    fireEvent.click(toggle);
    expect(screen.queryByTestId("child")).not.toBeInTheDocument();
  });

  it("shows children again after a second toggle click", () => {
    renderSection();
    const toggle = screen.getByRole("button", { name: /manuscript/i });
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("calls onAdd when the add (+) button is clicked", () => {
    const onAdd = vi.fn();
    renderSection({ onAdd });
    // The add button has title "Add" (default addLabel)
    const addBtn = screen.getByTitle("Add");
    fireEvent.click(addBtn);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it("uses addLabel as the title attribute of the add button", () => {
    renderSection({ onAdd: vi.fn(), addLabel: "Add Scene" });
    expect(screen.getByTitle("Add Scene")).toBeInTheDocument();
  });

  it("calls onAddFolder when the folder button is clicked", () => {
    const onAddFolder = vi.fn();
    renderSection({ onAddFolder });
    const folderBtn = screen.getByTitle("New Folder");
    fireEvent.click(folderBtn);
    expect(onAddFolder).toHaveBeenCalledTimes(1);
  });

  it("renders compile button when onCompile prop provided", () => {
    const onCompile = vi.fn();
    renderSection({ onCompile });
    expect(screen.getByTitle("Compile manuscript")).toBeInTheDocument();
  });

  it("calls onCompile when compile button clicked", () => {
    const onCompile = vi.fn();
    renderSection({ onCompile });
    fireEvent.click(screen.getByTitle("Compile manuscript"));
    expect(onCompile).toHaveBeenCalledTimes(1);
  });

  it("does NOT render compile button when onCompile is absent", () => {
    renderSection({ onCompile: undefined });
    expect(screen.queryByTitle("Compile manuscript")).not.toBeInTheDocument();
  });

  it("does NOT render add folder button when onAddFolder is absent", () => {
    renderSection({ onAddFolder: undefined });
    expect(screen.queryByTitle("New Folder")).not.toBeInTheDocument();
  });
});
