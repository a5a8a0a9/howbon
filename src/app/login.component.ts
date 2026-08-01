import { Component, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  template: `
    <main class="login-shell">
      <section class="login-copy" aria-labelledby="login-title">
        <p class="eyebrow"><span></span> 把每一次進步收藏起來</p>
        <h1 id="login-title">今天也要<br /><em>好棒棒</em></h1>
        <p class="intro">
          替值得開心的小事蓋一個章，留下當下想說的話。集滿五個章，就收下一枚徽章和一張獎賞票券。
        </p>
      </section>

      <section class="login-card" aria-labelledby="account-title">
        <span class="tape" aria-hidden="true"></span>
        <div class="login-mark" aria-hidden="true">
          <span class="material-symbols-rounded">auto_awesome</span>
        </div>
        @if (auth.configured) {
          <p class="card-kicker">WELCOME BACK</p>
          <h2 id="account-title">登入你的集章簿</h2>
          <p>使用 Google 帳號安全保存進度，換一台裝置也能接著收藏。</p>
          <button
            class="google-button"
            type="button"
            [disabled]="auth.isSigningIn()"
            (click)="auth.signInWithGoogle()"
          >
            <span class="material-symbols-rounded" aria-hidden="true">login</span>
            {{ auth.isSigningIn() ? '正在開啟登入…' : '使用 Google 帳號登入' }}
          </button>
        } @else {
          <p class="card-kicker">SETUP REQUIRED</p>
          <h2 id="account-title">還差一小步</h2>
          <p>請先將 Firebase Web App 設定填入 <code>src/environments/environment.ts</code>。</p>
          <div class="setup-note">
            啟用 Google Authentication、建立 Firestore，完成後重新啟動開發伺服器。
          </div>
        }
        @if (auth.error()) {
          <p class="error-message" role="alert">{{ auth.error() }}</p>
        }
        <small>登入代表資料會依你的 Firebase 帳號儲存；不會搬移舊的瀏覽器集章資料。</small>
      </section>
    </main>
  `,
  styles: `
    :host {
      display: block;
      min-height: calc(100dvh - 92px);
    }
    .login-shell {
      width: min(1080px, calc(100% - 40px));
      min-height: calc(100dvh - 92px);
      margin: auto;
      display: grid;
      grid-template-columns: 1fr minmax(360px, 480px);
      gap: clamp(48px, 9vw, 120px);
      align-items: center;
      padding: 70px 0 100px;
    }
    .eyebrow,
    .card-kicker {
      margin: 0;
      color: #665349;
      font-size: 0.75rem;
      font-weight: 900;
      letter-spacing: 0.14em;
    }
    .eyebrow {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .eyebrow span {
      width: 34px;
      height: 2px;
      background: #cf5f4d;
    }
    h1 {
      margin: 24px 0 28px;
      color: #47352c;
      font-size: clamp(4rem, 8vw, 6.8rem);
      line-height: 0.92;
      letter-spacing: -0.07em;
    }
    h1 em {
      color: #c95847;
      font-style: normal;
    }
    .intro {
      max-width: 430px;
      margin: 0;
      color: #69574d;
      line-height: 1.9;
    }
    .login-card {
      position: relative;
      padding: 48px 42px 40px;
      border: 1px solid rgb(91 65 47 / 14%);
      border-radius: 28px;
      background: rgb(255 252 244 / 92%);
      box-shadow: 0 28px 60px rgb(91 63 43 / 14%);
      text-align: center;
    }
    .tape {
      position: absolute;
      top: -16px;
      left: 50%;
      width: 92px;
      height: 34px;
      background: rgb(218 180 125 / 48%);
      transform: translateX(-50%) rotate(-3deg);
    }
    .login-mark {
      display: grid;
      place-items: center;
      width: 82px;
      aspect-ratio: 1;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: #cf5f4d;
      color: #fff9ed;
      font-size: 2.2rem;
      box-shadow: inset 0 0 0 6px #f4d28f;
    }
    .card-kicker {
      color: #a84f42;
    }
    h2 {
      margin: 10px 0 14px;
      color: #49382f;
      font-size: 2rem;
      letter-spacing: -0.04em;
    }
    .login-card > p:not(.card-kicker, .error-message) {
      margin: 0 auto 24px;
      color: #76645a;
      line-height: 1.7;
    }
    .google-button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      width: 100%;
      min-height: 54px;
      border: 0;
      border-radius: 14px;
      background: #ca5948;
      color: white;
      font: inherit;
      font-weight: 900;
      cursor: pointer;
      box-shadow: 0 6px 0 #9d4035;
    }
    .google-button:disabled {
      opacity: 0.65;
      cursor: wait;
    }
    .setup-note {
      margin: 16px 0 22px;
      padding: 14px;
      border-radius: 12px;
      background: #f1e8d9;
      color: #665249;
      font-size: 0.86rem;
      line-height: 1.6;
    }
    code {
      color: #a44539;
      font-size: 0.82em;
    }
    .error-message {
      margin: 18px 0 0;
      color: #a33b34;
      font-size: 0.86rem;
    }
    small {
      display: block;
      margin-top: 24px;
      color: #9a877c;
      line-height: 1.6;
    }
    @media (max-width: 780px) {
      .login-shell {
        grid-template-columns: 1fr;
        gap: 50px;
        padding-top: 50px;
      }
      .login-copy {
        text-align: center;
      }
      .eyebrow {
        justify-content: center;
      }
      .intro {
        margin-inline: auto;
      }
    }
    @media (max-width: 520px) {
      .login-shell {
        width: calc(100% - 28px);
      }
      .login-card {
        padding: 40px 24px 32px;
      }
      h1 {
        font-size: clamp(3.7rem, 19vw, 5rem);
      }
    }
  `,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
}
