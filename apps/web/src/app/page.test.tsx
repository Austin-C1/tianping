import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("shows the product trading workspace", () => {
    render(<Home />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "PMX Trading"
    );
    expect(screen.getByText("市场浏览")).toBeInTheDocument();
    expect(screen.getByText("订单预览")).toBeInTheDocument();
    expect(screen.getByText("人工确认 Gate")).toBeInTheDocument();
  });
});
