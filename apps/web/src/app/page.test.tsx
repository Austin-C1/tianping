import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("shows the stage 1 skeleton status", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Polymarket 三方基础交易平台"
    );
    expect(screen.getByText("Stage 1 / Engineering Skeleton")).toBeInTheDocument();
    expect(screen.getByText("PostgreSQL + Prisma")).toBeInTheDocument();
  });
});
