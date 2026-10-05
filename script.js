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

// ===== 画面の要素 =====
const board = document.getElementById("board");
const cursor = document.getElementById("cursor");
const debug = document.getElementById("debug");

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
  // 動作確認用（ステップ2で消す）
  debug.textContent = "確認用: Aから " + (s / totalLength * 100).toFixed(1) + "%";
}

// 画面上のマウス位置を、SVG の中の座標に直す
function toSvgPoint(event) {
  const point = new DOMPoint(event.clientX, event.clientY);
  return point.matrixTransform(board.getScreenCTM().inverse());
}

// ===== ドラッグ処理（マウスもタッチも Pointer Events で共通） =====
let dragging = false;

function followPointer(event) {
  const p = toSvgPoint(event);
  moveCursor(closestDistance(p.x, p.y));
}

board.addEventListener("pointerdown", (event) => {
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

// 最初はランダムな位置に置く（真ん中だと 1:1 のヒントになるため）
moveCursor(Math.random() * totalLength);
