import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { OrderTicket } from "./order-ticket";

describe("OrderTicket", () => {
  it("updates amount, shares, payout, and side without enabling real submission", () => {
    render(
      <OrderTicket
        initialSide="yes"
        locale="en"
        marketTitle="Spread: Colombia (-5.5)"
        outcomes={["Colombia", "DR Congo"]}
        prices={[0.25, 0.75]}
      />
    );

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "10" } });

    expect(screen.getByText("40 shares")).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buy DR Congo" }));

    expect(screen.getByText("13.33 shares")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();
  });
});
