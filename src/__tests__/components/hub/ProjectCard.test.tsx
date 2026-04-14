import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProjectCard } from "@/components/hub/ProjectCard";
import type { ProjectRef } from "@/types";

const mockProject: ProjectRef = {
  id: "proj-1",
  name: "The Great Novel",
  path: "/mock/the-great-novel",
  updatedAt: "2024-06-15T12:00:00.000Z",
};

describe("ProjectCard", () => {
  it("renders the project name", () => {
    render(<ProjectCard project={mockProject} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("The Great Novel")).toBeInTheDocument();
  });

  it("renders a formatted last-edited date", () => {
    render(<ProjectCard project={mockProject} onOpen={vi.fn()} onDelete={vi.fn()} />);
    // The date should be formatted (contains the year 2024)
    expect(screen.getByText(/2024/)).toBeInTheDocument();
  });

  it("calls onOpen with the project ref when the card is clicked", () => {
    const onOpen = vi.fn();
    render(<ProjectCard project={mockProject} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("The Great Novel"));
    expect(onOpen).toHaveBeenCalledWith(mockProject);
  });

  it("calls onDelete with the project ref when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<ProjectCard project={mockProject} onOpen={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByTitle("Delete project"));
    expect(onDelete).toHaveBeenCalledWith(mockProject);
  });

  it("delete button click does NOT call onOpen (stopPropagation)", () => {
    const onOpen = vi.fn();
    render(<ProjectCard project={mockProject} onOpen={onOpen} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByTitle("Delete project"));
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("renders a book icon", () => {
    const { container } = render(<ProjectCard project={mockProject} onOpen={vi.fn()} onDelete={vi.fn()} />);
    // lucide-react renders SVG icons
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders 'Last edited' prefix before the date", () => {
    render(<ProjectCard project={mockProject} onOpen={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/Last edited/)).toBeInTheDocument();
  });
});
