import { MANUAL_GATES, PLATFORM_PHASES } from "@pmx/shared";
import Link from "next/link";

export default function Home() {
  return (
    <main>
      <div className="shell">
        <div className="eyebrow">Stage 1 / Engineering Skeleton</div>
        <h1>Polymarket 三方基础交易平台</h1>
        <p>
          当前版本只建立基础前后端平台、数据库、队列、测试和人工 Gate。
          真实 CLOB 下单、Relayer 权限和入金文案在人工确认后进入后续阶段。
        </p>
        <div className="actions">
          <Link href="/register">注册</Link>
          <Link href="/login">登录</Link>
          <Link href="/account">账户</Link>
        </div>

        <section className="grid" aria-label="Project status">
          <article className="panel">
            <h2>当前阶段</h2>
            <ul>
              <li>{PLATFORM_PHASES[0]}</li>
              <li>Next.js frontend</li>
              <li>NestJS backend</li>
            </ul>
          </article>

          <article className="panel">
            <h2>基础设施</h2>
            <ul>
              <li>PostgreSQL + Prisma</li>
              <li>Redis + BullMQ</li>
              <li>Playwright + unit tests</li>
            </ul>
          </article>

          <article className="panel">
            <h2>人工 Gate</h2>
            <ul>
              <li>{MANUAL_GATES[0]}</li>
              <li>{MANUAL_GATES[2]}</li>
              <li>{MANUAL_GATES[3]}</li>
            </ul>
          </article>
        </section>
      </div>
    </main>
  );
}
