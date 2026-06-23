import { AccountPanel } from "../../features/auth/account-panel";

export default function AccountPage() {
  return (
    <main>
      <div className="shell narrow">
        <div className="eyebrow">Protected</div>
        <h1>账户中心</h1>
        <AccountPanel />
      </div>
    </main>
  );
}
