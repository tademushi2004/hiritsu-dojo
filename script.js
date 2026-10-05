// ===== 線のデータ =====
// 点A（始点）と点B（終点）。座標は SVG の viewBox（400×300）の中での位置。
const A = { x: 50, y: 150 };
const B = { x: 350, y: 150 };
const totalLength = Math.hypot(B.x - A.x, B.y - A.y);

// ===== 線を扱う関数 =====
// ステップ3で曲線を足すときは、この2つを作り変える。

// Aからの距離 s の位置にある、線上の座標を返す
function pointAt(s) {
  const t = s / totalLength;
  return {
    x: A.x + (B.x - A.x) * t,
    y: A.y + (B.y - A.y) * t,
  };
}

// 座標 (x, y) にいちばん近い線上の点の「Aからの距離」を返す
function closestDistance(x, y) {
  // A→B の向きに、A→(x, y) を射影する
  const dx = (B.x - A.x) / totalLength;
  const dy = (B.y - A.y) / totalLength;
  const s = (x - A.x) * dx + (y - A.y) * dy;
  // 0〜全長の範囲に収める（これで線の端より外に出ない）
  return Math.min(Math.max(s, 0), totalLength);
}

// ===== 出題する比率 =====
// [A側, B側]。1:2 と 2:1 のように向きを入れ替えたものも入れている。
const RATIOS = [
  [1, 1],
  [1, 2], [2, 1],
  [1, 3], [3, 1],
  [2, 3], [3, 2],
  [3, 5], [5, 3],
];

// ===== 画面の要素 =====
const board = document.getElementById("board");
const cursor = document.getElementById("cursor");
const answerMark = document.getElementById("answer-mark");
const questionText = document.getElementById("question");
const actionButton = document.getElementById("action");
const result = document.getElementById("result");

// 線と点A・Bを配置する
const track = document.getElementById("track");
track.setAttribute("x1", A.x);
track.setAttribute("y1", A.y);
track.setAttribute("x2", B.x);
track.setAttribute("y2", B.y);

document.getElementById("point-a").setAttribute("cx", A.x);
document.getElementById("point-a").setAttribute("cy", A.y);
document.getElementById("point-b").setAttribute("cx", B.x);
document.getElementById("point-b").setAttribute("cy", B.y);

const labelA = document.getElementById("label-a");
labelA.setAttribute("x", A.x);
labelA.setAttribute("y", A.y - 18);
const labelB = document.getElementById("label-b");
labelB.setAttribute("x", B.x);
labelB.setAttribute("y", B.y - 18);

// ===== カーソル =====
let cursorDistance = 0; // カーソルの位置（Aからの距離）

function moveCursor(s) {
  cursorDistance = s;
  const p = pointAt(s);
  cursor.setAttribute("cx", p.x);
  cursor.setAttribute("cy", p.y);
}

// 画面上のマウス位置を、SVG の中の座標に直す
function toSvgPoint(event) {
  const point = new DOMPoint(event.clientX, event.clientY);
  return point.matrixTransform(board.getScreenCTM().inverse());
}

// ===== 出題と判定 =====
let currentRatio = null; // 今の問題の比率 [A側, B側]
let answered = false;    // true のときは結果表示中

function newQuestion() {
  // 直前と同じ問題は避ける
  let ratio;
  do {
    ratio = RATIOS[Math.floor(Math.random() * RATIOS.length)];
  } while (ratio === currentRatio);
  currentRatio = ratio;

  questionText.textContent =
    "A:B = " + ratio[0] + ":" + ratio[1] + " の位置にカーソルを置いてください";

  answered = false;
  board.classList.remove("answered"); // 正解の印も隠れる（style.css）
  result.hidden = true;
  actionButton.textContent = "決定";

  // 真ん中から始めると 1:1 のヒントになるので、ランダムな位置に置く
  moveCursor(Math.random() * totalLength);
}

// 誤差(%)から評価を返す
function getRating(errorPercent) {
  if (errorPercent <= 2) return "Perfect";
  if (errorPercent <= 5) return "Great";
  if (errorPercent <= 10) return "Good";
  return "Miss";
}

// Aからの距離を「A:B = 35.2 : 64.8」の形の文字にする
function formatRatio(s) {
  const aPart = s / totalLength * 100;
  return "A:B = " + aPart.toFixed(1) + " : " + (100 - aPart).toFixed(1);
}

function judge() {
  const [a, b] = currentRatio;
  const correctDistance = totalLength * a / (a + b);
  // 誤差 = 正解位置とのずれ ÷ 線の全長 × 100
  const errorPercent = Math.abs(correctDistance - cursorDistance) / totalLength * 100;
  const rating = getRating(errorPercent);

  // 正解位置の印を置く（表示されるのは下で answered クラスを付けたとき）
  const p = pointAt(correctDistance);
  answerMark.setAttribute("cx", p.x);
  answerMark.setAttribute("cy", p.y);

  // 結果の欄を埋める
  const ratingText = document.getElementById("rating");
  ratingText.textContent = rating;
  ratingText.className = rating.toLowerCase();
  document.getElementById("error").textContent = errorPercent.toFixed(1) + "%";
  document.getElementById("your-ratio").textContent = formatRatio(cursorDistance);
  document.getElementById("correct-ratio").textContent =
    formatRatio(correctDistance) + "（" + a + ":" + b + "）";
  result.hidden = false;

  answered = true;
  board.classList.add("answered");
  actionButton.textContent = "次の問題";
}

actionButton.addEventListener("click", () => {
  if (answered) {
    newQuestion();
  } else {
    judge();
  }
});

// ===== ドラッグ処理（マウスもタッチも Pointer Events で共通） =====
let dragging = false;

function followPointer(event) {
  const p = toSvgPoint(event);
  moveCursor(closestDistance(p.x, p.y));
}

board.addEventListener("pointerdown", (event) => {
  // 結果表示中はカーソルを動かせない
  if (answered) return;
  dragging = true;
  board.classList.add("dragging");
  // SVG の外に出ても追いかけるようにする
  board.setPointerCapture(event.pointerId);
  followPointer(event);
});

board.addEventListener("pointermove", (event) => {
  if (dragging) followPointer(event);
});

function endDrag() {
  dragging = false;
  board.classList.remove("dragging");
}
board.addEventListener("pointerup", endDrag);
board.addEventListener("pointercancel", endDrag);

newQuestion();
