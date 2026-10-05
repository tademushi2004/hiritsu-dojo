// ===== 線のデータ =====
// どの線も「細かい折れ線」として扱う（直線は点が2つだけの折れ線）。
// line.points  : 点の並び（先頭が点A、末尾が点B）。座標は SVG の viewBox（400×300）内の位置
// line.lengths : 各点までの累積長（Aからその点まで、線に沿って測った長さ）
// line.totalLength : 線の全長
let line = null;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function randomSign() {
  return Math.random() < 0.5 ? -1 : 1;
}

// 点の並びから、累積長と全長を計算して線のデータを作る
function buildLine(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y
    );
    lengths.push(lengths[i - 1] + seg);
  }
  return { points, lengths, totalLength: lengths[lengths.length - 1] };
}

// ===== 線を扱う関数 =====

// Aからの距離 s の位置にある、線上の座標を返す
function pointAt(s) {
  const { points, lengths, totalLength } = line;
  s = Math.min(Math.max(s, 0), totalLength);
  // s が入る区間 [i-1, i] を探す
  let i = 1;
  while (i < points.length - 1 && lengths[i] < s) i++;
  const segLength = lengths[i] - lengths[i - 1];
  const t = segLength === 0 ? 0 : (s - lengths[i - 1]) / segLength;
  return {
    x: points[i - 1].x + (points[i].x - points[i - 1].x) * t,
    y: points[i - 1].y + (points[i].y - points[i - 1].y) * t,
  };
}

// 座標 (x, y) にいちばん近い線上の点の「Aからの距離」を返す
function closestDistance(x, y) {
  const { points, lengths } = line;
  let bestDistance = 0;
  let bestGap = Infinity; // 線までの距離の2乗（いちばん近いものを探す）
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1];
    const q = points[i];
    const dx = q.x - p.x;
    const dy = q.y - p.y;
    const segLength2 = dx * dx + dy * dy;
    // この区間に射影する。0〜1 の範囲に収めるので、区間の外には出ない
    let t = segLength2 === 0 ? 0 : ((x - p.x) * dx + (y - p.y) * dy) / segLength2;
    t = Math.min(Math.max(t, 0), 1);
    const gapX = x - (p.x + dx * t);
    const gapY = y - (p.y + dy * t);
    const gap = gapX * gapX + gapY * gapY;
    if (gap < bestGap) {
      bestGap = gap;
      bestDistance = lengths[i - 1] + (lengths[i] - lengths[i - 1]) * t;
    }
  }
  return bestDistance;
}

// ===== 線を作る関数 =====
// どれも、画面の中心 (200, 150) のまわりに線を置き、回転させて作る。
const CENTER = { x: 200, y: 150 };
const CURVE_STEPS = 200; // 曲線を何個の短い直線に分けるか

// 中心からの相対座標 p を、angle 度だけ回転して、画面上の座標にする
function place(p, angleDeg) {
  const r = angleDeg * Math.PI / 180;
  return {
    x: CENTER.x + p.x * Math.cos(r) - p.y * Math.sin(r),
    y: CENTER.y + p.x * Math.sin(r) + p.y * Math.cos(r),
  };
}

// 水平な直線（高さを少しずらす）
function makeHorizontal() {
  const half = randomBetween(120, 150);
  const dy = randomBetween(-30, 30);
  return buildLine([
    { x: CENTER.x - half, y: CENTER.y + dy },
    { x: CENTER.x + half, y: CENTER.y + dy },
  ]);
}

// 斜めの直線（右上がり・右下がり）
function makeDiagonal() {
  const half = randomBetween(120, 150);
  const angle = randomBetween(15, 35) * randomSign();
  return buildLine([
    place({ x: -half, y: 0 }, angle),
    place({ x: half, y: 0 }, angle),
  ]);
}

// 3次ベジェ曲線（なめらかな曲線の一般的な作り方）上の点
function bezierPoint(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

// 緩いカーブの曲線
function makeCurve() {
  const half = randomBetween(110, 140);
  const chord = half * 2;
  const side = randomSign(); // 上に曲がるか、下に曲がるか
  // 2つの制御点（曲がり方を決める見えない点）のずらし量。
  // 左右対称にすると、いちばん高い所が真ん中（1:1 の答え）になりヒントになるので、
  // 2つの差が小さすぎる場合は選び直す。
  let d1, d2;
  do {
    d1 = randomBetween(0.15, 0.30) * chord;
    d2 = randomBetween(0.15, 0.30) * chord;
  } while (Math.abs(d1 - d2) < 0.05 * chord);

  const p0 = { x: -half, y: 0 };
  const p1 = { x: -half / 3, y: side * d1 };
  const p2 = { x: half / 3, y: side * d2 };
  const p3 = { x: half, y: 0 };
  const angle = randomBetween(0, 20) * randomSign();

  const points = [];
  for (let i = 0; i <= CURVE_STEPS; i++) {
    points.push(place(bezierPoint(p0, p1, p2, p3, i / CURVE_STEPS), angle));
  }
  return buildLine(points);
}

// 直線（水平・斜め）と曲線を、ランダムに選んで作る
function makeRandomLine() {
  const r = Math.random();
  if (r < 0.25) return makeHorizontal();
  if (r < 0.5) return makeDiagonal();
  return makeCurve();
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

// ===== ラウンドの設定と状態 =====
const TOTAL_QUESTIONS = 10;
const SCORES = { Perfect: 100, Great: 70, Good: 40, Miss: 0 };
const BEST_KEY = "hiritsuDojo.bestScore";

// 1ラウンド分の状態（startRound で作り直す）
let round = null;

// ===== 自己ベストの保存（localStorage が使えなくても止まらないようにする） =====
// 保存されていない・読めない場合は null を返す
function loadBest() {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    // getItem が null のときは Number(null) = 0 になるので、0 以下は「記録なし」とみなす
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch (e) {
    return null;
  }
}

// 保存できたら true、できなかったら false
function saveBest(score) {
  try {
    localStorage.setItem(BEST_KEY, String(score));
    return true;
  } catch (e) {
    return false;
  }
}

// ===== 画面の要素 =====
const board = document.getElementById("board");
const track = document.getElementById("track");
const pointA = document.getElementById("point-a");
const pointB = document.getElementById("point-b");
const labelA = document.getElementById("label-a");
const labelB = document.getElementById("label-b");
const cursor = document.getElementById("cursor");
const answerMark = document.getElementById("answer-mark");
const questionText = document.getElementById("question");
const actionButton = document.getElementById("action");
const result = document.getElementById("result");

// 線・点A・点B・ラベルを画面に配置する
function drawLine() {
  const pts = line.points;
  track.setAttribute(
    "points",
    pts.map((p) => p.x.toFixed(2) + "," + p.y.toFixed(2)).join(" ")
  );

  const a = pts[0];
  const b = pts[pts.length - 1];
  pointA.setAttribute("cx", a.x);
  pointA.setAttribute("cy", a.y);
  pointB.setAttribute("cx", b.x);
  pointB.setAttribute("cy", b.y);

  // ラベルは線の外側（端から線と反対向き）に置く。線に重ならないようにするため
  const LABEL_GAP = 24;
  const startDir = unitVector(a, pts[1]);
  const endDir = unitVector(pts[pts.length - 2], b);
  labelA.setAttribute("x", a.x - startDir.x * LABEL_GAP);
  labelA.setAttribute("y", a.y - startDir.y * LABEL_GAP);
  labelB.setAttribute("x", b.x + endDir.x * LABEL_GAP);
  labelB.setAttribute("y", b.y + endDir.y * LABEL_GAP);
}

// p から q へ向かう、長さ1のベクトル
function unitVector(p, q) {
  const len = Math.hypot(q.x - p.x, q.y - p.y);
  return { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
}

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

  // 問題ごとに新しい線を作る
  line = makeRandomLine();
  drawLine();

  answered = false;
  board.classList.remove("answered"); // 正解の印も隠れる（style.css）
  result.hidden = true;
  actionButton.textContent = "決定";
  updateProgress();

  // 真ん中から始めると 1:1 のヒントになるので、ランダムな位置に置く
  moveCursor(Math.random() * line.totalLength);
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
  const aPart = s / line.totalLength * 100;
  return "A:B = " + aPart.toFixed(1) + " : " + (100 - aPart).toFixed(1);
}

function judge() {
  const [a, b] = currentRatio;
  const correctDistance = line.totalLength * a / (a + b);
  // 誤差 = 正解位置とのずれ（線に沿った長さ）÷ 線の全長 × 100
  const errorPercent =
    Math.abs(correctDistance - cursorDistance) / line.totalLength * 100;
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
  // 得点を加算する
  const score = SCORES[rating];
  round.totalScore += score;
  round.counts[rating]++;
  document.getElementById("question-score").textContent = score;
  updateProgress();
  result.hidden = false;

  answered = true;
  board.classList.add("answered");
  actionButton.textContent =
    round.questionNumber >= TOTAL_QUESTIONS ? "結果を見る" : "次へ";
}

actionButton.addEventListener("click", () => {
  if (!answered) {
    judge();
  } else if (round.questionNumber >= TOTAL_QUESTIONS) {
    showFinal();
  } else {
    round.questionNumber++;
    newQuestion();
  }
});

// ===== ラウンドの進行 =====
function updateProgress() {
  document.getElementById("progress-number").textContent = round.questionNumber;
  document.getElementById("progress-total").textContent = TOTAL_QUESTIONS;
  document.getElementById("total-score").textContent = round.totalScore;
}

function startRound() {
  round = {
    questionNumber: 1,
    totalScore: 0,
    counts: { Perfect: 0, Great: 0, Good: 0, Miss: 0 },
  };
  document.getElementById("final").hidden = true;
  document.getElementById("game").hidden = false;
  newQuestion();
}

function showFinal() {
  const total = round.totalScore;
  const maxScore = TOTAL_QUESTIONS * SCORES.Perfect;
  const previousBest = loadBest();

  // 0点は記録しない。同点は更新としない（超えたときだけ更新。記録なしからの初記録は更新）
  let isNewBest = false;
  let saveFailed = false;
  if (total > 0 && (previousBest === null || total > previousBest)) {
    isNewBest = true;
    saveFailed = !saveBest(total);
  }
  // 画面に出す自己ベスト（保存に失敗しても今回の点は表示する）
  const best = isNewBest ? total : previousBest;

  document.getElementById("final-score").textContent =
    total + " / " + maxScore + " 点";
  document.getElementById("count-perfect").textContent = round.counts.Perfect;
  document.getElementById("count-great").textContent = round.counts.Great;
  document.getElementById("count-good").textContent = round.counts.Good;
  document.getElementById("count-miss").textContent = round.counts.Miss;
  document.getElementById("final-this").textContent = total;
  document.getElementById("final-best").textContent =
    best === null ? "記録なし" : best + " 点";
  document.getElementById("new-best").hidden = !isNewBest;
  document.getElementById("save-warning").hidden = !saveFailed;

  document.getElementById("game").hidden = true;
  document.getElementById("final").hidden = false;
}

document.getElementById("restart").addEventListener("click", startRound);

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

startRound();
