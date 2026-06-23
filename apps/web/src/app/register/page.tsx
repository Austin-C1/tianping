import { AuthForm } from "../../features/auth/auth-form";

export default function RegisterPage() {
  return (
    <main>
      <div className="shell narrow">
        <div className="eyebrow">Stage 2 / User System</div>
        <h1>注册账户</h1>
        <p>创建平台账户后，后续阶段才能绑定钱包、创建 Deposit Wallet 和查看订单记录。</p>
        <AuthForm mode="register" />
      </div>
    </main>
  );
}
