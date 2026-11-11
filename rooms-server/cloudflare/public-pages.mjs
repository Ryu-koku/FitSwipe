import { deleteUser, SafetyError, TERMS_VERSION } from './safety.mjs';
import { verifyGoogleToken } from './google-auth.mjs';

const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const css = `:root{color-scheme:light dark;font-family:system-ui,sans-serif;line-height:1.8}body{max-width:760px;margin:auto;padding:24px}a{color:#087f82}nav{display:flex;gap:18px;flex-wrap:wrap;border-bottom:1px solid #8885;padding-bottom:16px}h1{line-height:1.35}h2{font-size:1.2rem;margin-top:2rem}label{display:block;margin:18px 0}input:not([type=checkbox]),textarea,select{display:block;box-sizing:border-box;width:100%;padding:12px;font:inherit;border:1px solid #888;border-radius:8px}button{font:inherit;padding:12px 20px;background:#087f82;color:white;border:0;border-radius:8px;cursor:pointer}button:disabled{opacity:.5}small{display:block}footer{margin-top:40px;border-top:1px solid #8885;padding-top:16px}.trap{display:none}.notice{padding:16px;border:1px solid #888;border-radius:8px}`;
function page(title, body, script = '', allowGoogle = false) {
  const nonce = crypto.randomUUID().replaceAll('-', '');
  return new Response(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} | FitSwipe</title><style nonce="${nonce}">${css}</style></head><body><nav aria-label="ページ一覧"><a href="/">FitSwipe</a><a href="/privacy">プライバシー</a><a href="/terms">利用規約</a><a href="/delete-account">アカウント削除</a><a href="/support">お問い合わせ</a></nav><main><h1>${escapeHtml(title)}</h1>${body}</main><footer>FitSwipe 運営 · 文書改定日 ${TERMS_VERSION}</footer>${script ? `<script nonce="${nonce}">${script}</script>` : ''}${allowGoogle ? `<script nonce="${nonce}" src="https://accounts.google.com/gsi/client" async defer></script>` : ''}</body></html>`, {
    headers: {
      'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff',
      'Referrer-Policy':'strict-origin-when-cross-origin', 'Cross-Origin-Opener-Policy':'same-origin-allow-popups',
      'Content-Security-Policy':`default-src 'none'; style-src 'nonce-${nonce}'${allowGoogle ? " https://accounts.google.com/gsi/style" : ''}; script-src 'nonce-${nonce}'${allowGoogle ? ' https://accounts.google.com/gsi/client' : ''}; connect-src 'self'${allowGoogle ? ' https://accounts.google.com/gsi/' : ''}; frame-src ${allowGoogle ? 'https://accounts.google.com/gsi/' : "'none'"}; img-src 'self' data:; form-action 'self'; base-uri 'none'; frame-ancestors 'none'`,
    },
  });
}
const privacy = `
<p>本ポリシーは、筋トレ記録アプリ「FitSwipe」とその共有・同期サービスに適用します。お問い合わせ、個人情報の取扱い・削除のご相談は、<a href="/support">FitSwipe 運営の受付フォーム</a>をご利用ください。</p>
<h2>取得する情報と目的</h2>
<ul><li>端末だけで利用する場合：トレーニングの種目・重量・回数・日時、プリセット、体重・体脂肪率・身長、設定を端末内に保存し、記録・集計・表示に利用します。ログインせずルームも使わない場合、これらをFitSwipeのサーバーへ送信しません。</li>
<li>Googleログイン：本人識別用のGoogleアカウント識別子、名前、プロフィール画像、認証情報をログイン・プロフィール・端末間同期に利用します。名前と画像は設定で変更できます。認証用トークンにはメールアドレスが含まれる場合があり、認証処理の間だけサーバーのメモリを通過しますが、プロフィールのメールアドレスとして保存しません。Google Driveへの保存は行いません。</li>
<li>個人同期：Googleログイン中は、個人記録・日時・種目・プリセット・体組成・設定をFitSwipeのサーバーに保存します。読み込んだヘルスケア由来の測定値と取得元IDも含みます。ほかの利用者へ体組成を公開しません。</li>
<li>プロフィール・ルーム：表示名、選択した写真またはGoogleの画像、所属ルーム、共有設定、共有したメニュー名・種目名・重量・回数・左右・セット番号・開始／終了日時を共有機能に利用します。プロフィールと共有記録は同じルームのメンバーに表示されます。後から参加したメンバーも閲覧できます。</li>
<li>安全管理：利用規約への同意日時・版、ブロック関係、通報理由・説明・対象プロフィールと対象記録の写しを、不正利用への対応に利用します。通報者の情報を対象ユーザーに公開しません。</li>
<li>お問い合わせ・削除依頼：返信先メールアドレス、アカウントを特定する情報、ご記入内容を受付・本人確認・返信に利用します。パスワードや認証トークンは送信しないでください。</li></ul>
<h2>Health Connect／Appleヘルスケア</h2>
<p>利用者が「読み込む」を選び、OSの許可を与えた場合だけ、体重・体脂肪率・身長を読み取ります。記録・推移の表示に使い、書き込みは行いません。読み込みを拒否しても手入力で利用できます。読み込んだ値は端末に保存され、Googleログイン中は個人同期の対象になります。ルームには共有しません。許可はOSの設定からいつでも取り消せます。許可の取消だけでは読み込み済みのコピーは削除されません。</p>
<p>健康データを広告、販売、信用判断、保険・雇用の審査に使用しません。人による健康データへのアクセスは、利用者の同意がある対応、法令上必要な対応、セキュリティ調査等に必要な場合に限定します。本アプリは医療機器ではなく、診断・治療のためのものではありません。</p>
<h2>共有・委託・安全管理</h2>
<p>通信にはHTTPSを使います。サービス提供のため、Googleの認証サービス、CloudflareのWorkers・D1等のインフラを利用します。Google画像の表示時はGoogleの画像配信先へ接続します。これらの事業者の処理設備が日本国外にある場合があります。サービス提供と法令上必要な場合を除き、個人データを第三者へ提供しません。購入状態の管理をRevenueCatに委託し、アカウント識別子と購入情報を購入状態の確認・復元に使用します。決済はGoogle PlayまたはApp Storeが処理します。広告SDKや行動分析SDKは組み込んでいません。通信時のIPアドレス等はインフラの安全管理・アクセス制限に使用される場合があります。</p>
<p>JSON・CSVの書き出し、OSの共有機能で送ったファイルは利用者が共有先を選びます。ルームの相手が保存したコピーや利用者自身のバックアップは、FitSwipe側で遠隔削除できません。</p>
<h2>保存期間と削除</h2>
<ul><li>個人同期記録とプロフィール：利用者が削除するかアカウントを削除するまで保持します。Googleログインのセッションは最大30日、同期の再送防止情報は最大90日です。</li>
<li>自動共有：当月と過去11か月分を保持します。共有停止・退出・アカウント削除で取り下げます。以前の手動共有は自分で削除するか、退出・ルーム削除・アカウント削除まで残ります。</li>
<li>規約同意・ブロック・運営が削除した記録の再投稿防止用ID：アカウント削除まで保持します。ブロックはアプリ内で解除できます。</li>
<li>通報・お問い合わせ・削除依頼：受付から最大90日で定期削除します。通報は関係するアカウントやルームの削除でも削除されます。</li>
<li>稼働中のデータベースから削除した情報も、インフラの復旧用履歴に最長30日残る場合があります。復旧を行う際は削除済みデータを再び提供しないよう削除処理を適用します。</li></ul>
<p>アカウント削除はアプリの設定、または<a href="/delete-account">Webの削除ページ</a>から行えます。アプリ内で削除した場合、端末内の個人記録はログインなしで残ります。端末の記録も消す場合はOSからアプリの保存データを消去するかアンインストールしてください。Googleアカウント自体やHealth Connect／Appleヘルスケア内の元データは削除しません。</p>
<h2>変更とご相談</h2><p>取扱いを変更するときは、このページと必要に応じアプリ内で案内し、新たな同意が必要な処理は同意後に行います。開示・訂正・利用停止・削除のご相談は<a href="/support">受付フォーム</a>からご連絡ください。</p>`;
const terms = `
<p>FitSwipeは、トレーニング記録・個人同期と招待制ルームのサービスです。アカウント作成、プロフィール送信、ルーム作成・参加・共有の前に、本規約と<a href="/privacy">プライバシーポリシー</a>に同意してください。端末だけでの記録にはアカウントは不要です。</p>
<h2>投稿に関する禁止事項</h2><p>表示名・写真・ルーム名・メニュー名・種目名を含む投稿で、次の内容や行為を禁止します。</p><ul><li>嫌がらせ、脅迫、いじめ、差別、憎悪表現、暴力の扇動</li><li>性的・わいせつな内容、児童の性的搾取・虐待に関する一切の内容</li><li>本人の許可がない個人情報・写真の公開、なりすまし、プライバシー・著作権その他の権利侵害</li><li>違法行為、詐欺、スパム、勧誘、危険な行為の助長</li><li>招待コードや認証情報の不正利用、ブロックや利用停止の回避、虚偽の通報</li></ul>
<h2>共有範囲と安全管理</h2><p>ルーム内の共有記録とプロフィールはメンバーが閲覧できます。招待コードを慎重に扱い、機密情報を投稿しないでください。自動共有はルームごとの同意後に開始します。</p><p>不適切な内容は、ルームのメンバー一覧または記録の「通報」から運営に知らせてください。ブロックすると、同じルームにいても双方のプロフィールと共有記録をお互いの一覧・比較に表示しません。ルームの退出や管理者による除名も利用できます。</p><p>運営は通報を確認し、必要に応じて投稿・プロフィール・ルームの削除、利用停止等を行います。異議申立てや緊急のご連絡は<a href="/support">お問い合わせ</a>から受け付けます。</p>
<h2>利用上の注意</h2><p>記録や集計は運動の参考です。医療上の診断・治療や安全の保証は行いません。体調に合わせて利用してください。記録はJSON等でバックアップできます。通信障害やサービス変更に備え、必要な記録を保管してください。</p>
<h2>プレミアム</h2><p>月額サブスクリプションは自動更新です。価格は購入時のストア表示をご確認ください。解約・管理はGoogle PlayまたはApp Storeから行ってください。解約後や上限超過時も保存済みデータは削除せず、編集・利用・削除できます。無料枠を超える新規追加にはプレミアム登録が必要です。</p>
<h2>退会・規約の変更</h2><p><a href="/delete-account">アカウント削除</a>により退会できます。変更後の規約への同意が必要な場合は送信前に案内します。本規約は日本法を準拠法とし、法令により認められる利用者の権利を制限しません。</p>`;
function form(kind) {
  return `<h2>${kind === 'deletion' ? '運営にアカウントと関連データの削除を依頼' : 'FitSwipe 運営へ連絡'}</h2><p>アプリのインストールやログインなしで送信できます。本人確認と返信のためメールアドレスを使用します。${kind === 'deletion' ? '表示名、参加していたルーム、利用していたGoogleアカウント等を記入してください。本人確認後にアカウント・プロフィール・個人同期記録・共有記録を削除します。端末内のコピーとヘルスケア内の元データは削除できません。' : ''}パスワード・認証コード・認証トークン・不要な健康情報は記入しないでください。</p>
<form action="/${kind === 'deletion' ? 'delete-account' : 'support'}" method="post"><label>返信先メールアドレス<input type="email" name="email" required maxlength="254" autocomplete="email"></label><label>表示名・アカウントを特定する情報<input name="accountHint" maxlength="300" ${kind === 'deletion' ? 'required' : ''}></label><label>${kind === 'deletion' ? '削除依頼の内容' : 'お問い合わせ内容'}<textarea name="message" rows="6" required maxlength="2000"></textarea></label><label class="trap" aria-hidden="true">Website<input name="website" tabindex="-1" autocomplete="off"></label><label><input type="checkbox" name="consent" value="yes" required> <a href="/privacy">プライバシーポリシー</a>を確認し、受付・本人確認・返信のための利用に同意します。</label><button type="submit">${kind === 'deletion' ? '削除を依頼する' : '送信する'}</button></form><p>受付情報は最大90日保存します。通常7日以内を目安に返信します。メールアドレスや表示名だけを根拠に他人のアカウントを削除することはありません。</p>`;
}
function sameOrigin(request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) throw new SafetyError(403, 'このサイトのフォームから送信してください');
}
async function publicLimit(env, request) {
  const binding = env.PUBLIC_LIMIT ?? env.REGISTER_LIMIT;
  if (binding && !(await binding.limit({ key: request.headers.get('cf-connecting-ip') ?? 'unknown' })).success) {
    throw new SafetyError(429, 'しばらく待ってから送信してください');
  }
}
async function receiveForm(request, env, kind) {
  sameOrigin(request);
  await publicLimit(env, request);
  if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new SafetyError(415, 'フォーム形式を確認してください');
  if (Number(request.headers.get('content-length')) > 30000) throw new SafetyError(413, '内容が長すぎます');
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > 30000) throw new SafetyError(413, '内容が長すぎます');
  const data = new URLSearchParams(raw);
  const email = data.get('email')?.trim() ?? '', hint = data.get('accountHint')?.trim() ?? '', message = data.get('message')?.trim() ?? '';
  if (data.get('website') || data.get('consent') !== 'yes' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email) || email.length>254 || hint.length>300 || (kind==='deletion' && !hint) || !message || message.length>2000 || /[\u0000-\u0008]/u.test(email+hint+message)) {
    throw new SafetyError(400, 'メールアドレス・内容・同意のチェックを確認してください');
  }
  const id = crypto.randomUUID();
  const saved = await env.DB.prepare(`INSERT INTO support_requests(id,kind,email,account_hint,message,created_at)
    SELECT ?,?,?,?,?,? WHERE (SELECT count(*) FROM support_requests WHERE email=? AND created_at>=?) < 5`)
    .bind(id,kind,email,hint,message,new Date().toISOString(),email,new Date(Date.now()-86400000).toISOString()).run();
  if (!saved.meta.changes) throw new SafetyError(429, '本日の受付上限に達しました。後日お試しください');
  return page('受け付けました', `<p>受付番号：<strong>${id}</strong></p><p>内容を運営が確認し、入力されたメールアドレスへ返信します。${kind==='deletion' ? 'この時点では削除は完了していません。本人確認後に削除し、結果をご連絡します。' : ''}</p><a href="/">FitSwipeへ戻る</a>`);
}
const deletionText = `<p>FitSwipeのアカウントと関連データを削除できます。Googleアカウント自体は削除しません。</p><p>削除対象：プロフィール、個人同期記録（トレーニング・体組成・設定等）、共有記録、所属ルーム情報、同意・ブロック情報、関連する通報。作成したルームは残るメンバーへ引き継ぎ、最後のメンバーの場合はルームごと削除します。</p><p>サーバー上の削除は即時反映します。復旧用履歴には最長30日残る場合があります。端末内の記録、書き出したファイル、相手が保存したコピー、Health Connect／Appleヘルスケア内の元データは残ります。端末の記録はOSからアプリの保存データを消去してください。</p><p>アプリからは「設定 → アカウント・同期 → アカウントを削除」、Google未連携の共有アカウントは「ルーム → プロフィール → 共有アカウントを削除」で操作できます。</p>`;
export async function publicRoute(request, env) {
  const path = new URL(request.url).pathname.replace(/\/$/u, '') || '/';
  if (request.method==='POST' && ['/support','/delete-account'].includes(path)) return receiveForm(request,env,path==='/support'?'support':'deletion');
  if (request.method==='POST' && path==='/v1/account/web-deletion') {
    sameOrigin(request); await publicLimit(env,request);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new SafetyError(415, '送信形式を確認してください');
    const raw = await request.text();
    if (raw.length>18000) throw new SafetyError(413, '送信内容を確認してください');
    let body; try { body=JSON.parse(raw); } catch { throw new SafetyError(400,'送信内容を確認してください'); }
    if (body?.confirmed !== true) throw new SafetyError(400,'削除への同意が必要です');
    const { subject } = await verifyGoogleToken(body.idToken,env.GOOGLE_WEB_CLIENT_ID);
    const user = await env.DB.prepare('SELECT id FROM users WHERE google_subject=?').bind(subject).first();
    if (user) await deleteUser(env,user.id);
    return new Response(JSON.stringify({ deleted:true }),{ headers:{ 'Content-Type':'application/json', 'Cache-Control':'no-store' } });
  }
  if (request.method!=='GET') return null;
  if (path==='/') return page('FitSwipe', '<p>筋トレの記録を端末に保存し、必要に応じて端末間同期や仲間とのルーム共有を利用できます。</p><p>サービスの取扱い、ご相談、アカウント削除は上のメニューからご利用ください。</p>');
  if (path==='/privacy') return page('プライバシーポリシー',privacy);
  if (path==='/terms') return page('利用規約',terms);
  if (path==='/support') return page('お問い合わせ', `<h2>アカウントを残してデータだけ削除する</h2><p>特定のトレーニング記録、体組成、プロフィール写真、共有記録などの削除を希望する場合は、下のフォームの内容に「データ削除」と記入し、表示名・対象の種類・対象期間をお知らせください。アカウント全体の削除は必要ありません。本人確認後、指定したデータを稼働中のサーバーから削除し、結果をご連絡します。復旧用履歴には最長30日残る場合があります。端末内のコピーやHealth Connect／Appleヘルスケア内の元データは遠隔削除できません。依頼を処理した後も、受付情報は受付から最大90日保持します。</p>`+form('support'));
  if (path==='/delete-account') {
    const enabled = typeof env.GOOGLE_WEB_CLIENT_ID==='string' && /^[A-Za-z0-9_.-]+$/u.test(env.GOOGLE_WEB_CLIENT_ID);
    const google = enabled ? `<h2>Googleで本人確認して削除</h2><p>FitSwipeに連携したGoogleアカウントを選択してください。削除は取り消せません。</p><label><input type="checkbox" id="confirm"> 上記の削除範囲を確認し、FitSwipeのアカウントと関連データの削除に同意します。</label><div id="google-button" hidden></div><p id="result" role="status"></p>` : '';
    const script = enabled ? `const confirmBox=document.getElementById('confirm'), result=document.getElementById('result');let ready=false;confirmBox.addEventListener('change',()=>{document.getElementById('google-button').hidden=!confirmBox.checked;});window.addEventListener('load',()=>{if(!window.google){result.textContent='Googleの本人確認を読み込めませんでした。下の削除依頼フォームをご利用ください。';return;}google.accounts.id.initialize({client_id:${JSON.stringify(env.GOOGLE_WEB_CLIENT_ID)},auto_select:false,callback:async ({credential})=>{if(!confirmBox.checked||ready)return;ready=true;result.textContent='削除しています…';try{const response=await fetch('/v1/account/web-deletion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:credential,confirmed:true})});const data=await response.json();if(!response.ok)throw new Error(data.error||'削除できませんでした');document.getElementById('google-button').hidden=true;confirmBox.disabled=true;result.textContent='このGoogleアカウントに連携したFitSwipeアカウントの削除が完了しました（登録がない場合は変更ありません）。端末内のコピーは残ります。';}catch(e){ready=false;result.textContent=e.message+'。下の削除依頼フォームも利用できます。';}}});google.accounts.id.renderButton(document.getElementById('google-button'),{theme:'outline',size:'large',text:'signin_with'});});` : '';
    return page('アカウントとデータの削除',deletionText+google+form('deletion'),script,enabled);
  }
  return null;
}
