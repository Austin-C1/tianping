import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "$10" } });

    expect(screen.getByText("40 shares")).toBeInTheDocument();
    expect(screen.getByText("$40.00")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "$25" }));

    expect(screen.getByText("100 shares")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("$75.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Buy DR Congo" }));

    expect(screen.getByText("33.33 shares")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();
  });

  it("shows zero preview values for invalid amount input", () => {
    render(
      <OrderTicket
        initialSide="yes"
        locale="en"
        marketTitle="Spread: Colombia (-5.5)"
        outcomes={["Colombia", "DR Congo"]}
        prices={[0.25, 0.75]}
      />
    );

    fireEvent.change(screen.getByLabelText("Amount"), { target: { value: "not money" } });

    expect(screen.getByText("0 shares")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Manual approval Gate" })).toBeDisabled();
  });

  it("reports side changes in controlled mode", () => {
    const handleSideChange = vi.fn();

    render(
      <OrderTicket
        locale="en"
        marketTitle="Spread: Colombia (-5.5)"
        onSideChange={handleSideChange}
        outcomes={["Colombia", "DR Congo"]}
        prices={[0.25, 0.75]}
        selectedSide="yes"
      />
    );

    const yesButton = screen.getByRole("button", { name: "Buy Colombia" });
    const noButton = screen.getByRole("button", { name: "Buy DR Congo" });

    expect(yesButton).toHaveAttribute("aria-pressed", "true");
    expect(noButton).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(noButton);

    expect(handleSideChange).toHaveBeenCalledWith("no");
    expect(screen.getByText("Colombia")).toBeInTheDocument();
  });

  it("shows order preview readiness gate reasons", () => {
    render(
      <OrderTicket
        locale="en"
        marketTitle="Spread: Colombia (-5.5)"
        outcomes={["Colombia", "DR Congo"]}
        prices={[0.25, 0.75]}
        readinessGates={[
          {
            key: "wallet-binding",
            reason: "EOA wallet is not connected",
            status: "PENDING"
          },
          {
            key: "deposit-wallet",
            reason: "Deposit Wallet is not created",
            status: "PENDING"
          }
        ]}
      />
    );

    expect(screen.getByText("EOA wallet is not connected")).toBeInTheDocument();
    expect(screen.getByText("Deposit Wallet is not created")).toBeInTheDocument();
  });
});
