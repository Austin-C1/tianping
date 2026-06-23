import { AuthForm } from "../../features/auth/auth-form";

export default function LoginPage() {
  return (
    <main>
      <div className="shell narrow">
        <div className="eyebrow">Stage 2 / User System</div>
        <h1>登录账户</h1>
        <p>登录后可以进入受保护账户页。真实交易功能会在后续人工 Gate 后开启。</p>
        <AuthForm mode="login" />
      </div>
    </main>
  );
}
