// ========== ИМПОРТЫ FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-firestore.js";

// ---------- FIREBASE КОНФИГ ----------
const firebaseConfig = {
  apiKey: "AIzaSyDAKLxijpRlZDP-gCsidr984g_TO_RUsLs",
  authDomain: "math-escape-room-3d927.firebaseapp.com",
  projectId: "math-escape-room-3d927",
  storageBucket: "math-escape-room-3d927.appspot.com",
  messagingSenderId: "193374896672",
  appId: "1:193374896672:web:3e971966181c8755e8b245"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ---------- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----------
let currentUser = null;
let currentRoom = 1;
let totalScore = 0;
let gameActive = false;
let currentTaskObj = null;
let isWaiting = false;

// ---------- MATHJAX РЕНДЕРИНГ ----------
function renderMath() {
  if (window.MathJax) {
    MathJax.typesetPromise();
  }
}

// ---------- ПУЛ ЗАДАНИЙ (ВСЕ ФОРМУЛЫ В LATEX) ----------
const roomsData = {
  1: {
    lecture: "📖 Лекция (Однородные ДУ): Для уравнения $y'' + py' + qy = 0$ составляют характеристическое $\\lambda^2 + p\\lambda + q = 0$. Корни $\\lambda_1, \\lambda_2$ определяют вид общего решения: если корни действительные и разные → $y = C_1 e^{\\lambda_1 x} + C_2 e^{\\lambda_2 x}$.",
    tasks: [
      { task: "📝 Задание: Найдите корни характеристического уравнения для $y'' - 5y' + 6y = 0$.", correct: "$\\lambda = 2,\\ \\lambda = 3$", options: ["$\\lambda = -2,\\ \\lambda = -3$", "$\\lambda = 2,\\ \\lambda = 3$", "$\\lambda = 1,\\ \\lambda = 6$"] },
      { task: "📝 Задание: Для $y'' + 4y' + 4y = 0$ характеристическое уравнение имеет корни:", correct: "$\\lambda = -2,\\ \\lambda = -2$", options: ["$\\lambda = 2,\\ \\lambda = 2$", "$\\lambda = -2,\\ \\lambda = -2$", "$\\lambda = \\pm 2i$"] },
      { task: "📝 Задание: Уравнение $y'' - 2y' - 3y = 0$. Корни характеристического:", correct: "$\\lambda = -1,\\ \\lambda = 3$", options: ["$\\lambda = 1,\\ \\lambda = -3$", "$\\lambda = -1,\\ \\lambda = 3$", "$\\lambda = 1\\pm 2i$"] },
      { task: "📝 Задание: Для $y'' + 6y' + 9y = 0$ характеристическое уравнение имеет корни:", correct: "$\\lambda = -3,\\ \\lambda = -3$", options: ["$\\lambda = 3,\\ \\lambda = 3$", "$\\lambda = \\pm 3i$", "$\\lambda = -3,\\ \\lambda = -3$"] }
    ]
  },
  2: {
    lecture: "📖 Лекция (Общее решение однородного): Для разных действительных корней $\\lambda_1, \\lambda_2$ → $y = C_1 e^{\\lambda_1 x} + C_2 e^{\\lambda_2 x}$. Для кратного корня $\\lambda$ → $y = (C_1 + C_2 x)e^{\\lambda x}$. Для комплексных $\\lambda = \\alpha \\pm i\\beta$ → $y = e^{\\alpha x}(C_1 \\cos \\beta x + C_2 \\sin \\beta x)$.",
    tasks: [
      { task: "📝 Задание: Дано ДУ $y'' - 5y' + 6y = 0$. Выберите общее решение.", correct: "$C_1 e^{2x} + C_2 e^{3x}$", options: ["$C_1 e^{-2x} + C_2 e^{-3x}$", "$C_1 e^{2x} + C_2 e^{3x}$", "$C_1 e^{2x} + C_2 x e^{2x}$"] },
      { task: "📝 Задание: Для $y'' - 4y' + 4y = 0$ (корень $\\lambda=2$ кратный) общее решение:", correct: "$(C_1 + C_2 x)e^{2x}$", options: ["$C_1 e^{2x} + C_2 e^{2x}$", "$(C_1 + C_2 x)e^{2x}$", "$C_1 e^{2x}\\cos x + C_2 e^{2x}\\sin x$"] },
      { task: "📝 Задание: Уравнение $y'' + 2y' + 5y = 0$ имеет корни $\\lambda = -1 \\pm 2i$. Общее решение:", correct: "$e^{-x}(C_1 \\cos 2x + C_2 \\sin 2x)$", options: ["$e^{-x}(C_1 \\cos 2x + C_2 \\sin 2x)$", "$e^{-x}(C_1 \\cos x + C_2 \\sin x)$", "$C_1 e^{-x} + C_2 e^{-x}$"] },
      { task: "📝 Задание: Для $y'' - 2y' - 3y = 0$ выберите общее решение:", correct: "$C_1 e^{-x} + C_2 e^{3x}$", options: ["$C_1 e^{x} + C_2 e^{-3x}$", "$C_1 e^{-x} + C_2 e^{3x}$", "$C_1 e^{-x} + C_2 x e^{3x}$"] },
      { task: "📝 Задание: Для $y'' + 9y = 0$ (корни $\\pm 3i$) общее решение:", correct: "$C_1 \\cos 3x + C_2 \\sin 3x$", options: ["$C_1 e^{3x} + C_2 e^{-3x}$", "$C_1 \\cos 3x + C_2 \\sin 3x$", "$(C_1 + C_2 x) \\cos 3x$"] }
    ]
  },
  3: {
    lecture: "📖 Лекция (I вид правой части: $f(x)=P(x)e^{\\alpha x}$). Частное решение ищут в виде $y^* = x^r Q(x)e^{\\alpha x}$, где $r$ — кратность $\\alpha$ среди корней характеристического уравнения. $Q(x)$ — многочлен той же степени, что $P(x)$.",
    tasks: [
      { task: "📝 Задание: Для $y'' - 3y' + 2y = e^{x}$ ($\\alpha=1$ совпадает с корнем $\\lambda=1$, кратность 1). Укажите форму частного решения.", correct: "$A x e^{x}$", options: ["$A e^{x}$", "$A x e^{x}$", "$A x^2 e^{x}$"] },
      { task: "📝 Задание: Для $y'' - 4y' + 4y = e^{2x}$ ($\\lambda=2$ кратный, $\\alpha=2$, кратность 2). Частное решение:", correct: "$A x^2 e^{2x}$", options: ["$A e^{2x}$", "$A x e^{2x}$", "$A x^2 e^{2x}$"] },
      { task: "📝 Задание: Дано ДУ $y'' + 2y' + y = x^2 e^{-x}$ ($\\alpha=-1$ — корень кратности 2). Выберите верную форму $y^*$:", correct: "$x^2 (Ax^2 + Bx + C) e^{-x}$", options: ["$(Ax^2+Bx+C) e^{-x}$", "$x (Ax^2+Bx+C) e^{-x}$", "$x^2 (Ax^2+Bx+C) e^{-x}$"] },
      { task: "📝 Задание: Для $y'' - 2y' - 3y = 4e^{3x}$ ($\\alpha=3$ не корень). Форма частного решения:", correct: "$A e^{3x}$", options: ["$A e^{3x}$", "$A x e^{3x}$", "$A x^2 e^{3x}$"] },
      { task: "📝 Задание: Для $y'' + y' = 2e^{0\\cdot x}$ ($\\alpha=0$, один корень $\\lambda=0$, кратность 1). Частное решение:", correct: "$A x$", options: ["$A$", "$A x$", "$A x^2$"] }
    ]
  },
  4: {
    lecture: "📖 Лекция (II вид правой части: $f(x)=e^{\\alpha x}(P_1(x)\\cos \\beta x + P_2(x)\\sin \\beta x)$). Частное решение: $y^* = x^r e^{\\alpha x}(Q_1(x)\\cos \\beta x + Q_2(x)\\sin \\beta x)$, где $r$ — кратность $\\alpha+i\\beta$ среди корней. Степени $Q_1, Q_2$ равны $\\max(\\deg P_1, \\deg P_2)$.",
    tasks: [
      { task: "📝 Задание: Для $y'' + y = \\cos x$ ($\\alpha=0$, $\\beta=1$, корни $\\pm i$, совпадение, $r=1$). Форма частного решения:", correct: "$x (A \\cos x + B \\sin x)$", options: ["$A \\cos x + B \\sin x$", "$x (A \\cos x + B \\sin x)$", "$x^2 (A \\cos x + B \\sin x)$"] },
      { task: "📝 Задание: Для $y'' + 4y = 3 \\sin 2x$ ($\\alpha=0$, $\\beta=2$, корни $\\pm 2i$, совпадение). Выберите $y^*$:", correct: "$x (A \\cos 2x + B \\sin 2x)$", options: ["$A \\cos 2x + B \\sin 2x$", "$x (A \\cos 2x + B \\sin 2x)$", "$x^2 (A \\cos 2x + B \\sin 2x)$"] },
      { task: "📝 Задание: Для $y'' - 2y' + 2y = e^{x} \\sin x$ ($\\alpha=1$, $\\beta=1$, корни $1\\pm i$, совпадение, $r=1$). Правильная форма частного:", correct: "$x e^{x}(A \\cos x + B \\sin x)$", options: ["$e^{x}(A \\cos x + B \\sin x)$", "$x e^{x}(A \\cos x + B \\sin x)$", "$x^2 e^{x}(A \\cos x + B \\sin x)$"] },
      { task: "📝 Задание: Для $y'' + 9y = 2 \\cos 3x$ (корни $\\pm 3i$, резонанс). Форма частного решения:", correct: "$x (A \\cos 3x + B \\sin 3x)$", options: ["$A \\cos 3x + B \\sin 3x$", "$x (A \\cos 3x + B \\sin 3x)$", "$x^2 (A \\cos 3x + B \\sin 3x)$"] }
    ]
  },
  5: {
    lecture: "📖 Лекция (III вид — принцип суперпозиции). Если $f(x)=f_1(x)+f_2(x)$, то частное решение $y^* = y_1^* + y_2^*$, где $y_1^*$ — частное решение для $f_1$, $y_2^*$ — для $f_2$.",
    tasks: [
      { task: "📝 Задание: Для $y'' - y = e^{x} + \\cos x$. Укажите структуру частного решения (корни $\\lambda=\\pm1$, резонанс для $e^{x}$ кратность 1).", correct: "$A x e^{x} + B \\cos x + C \\sin x$", options: ["$A e^{x} + B \\cos x + C \\sin x$", "$A x e^{x} + B \\cos x + C \\sin x$", "$A x e^{x} + x(B \\cos x + C \\sin x)$"] },
      { task: "📝 Задание: Для $y'' + y = x^2 + \\sin x$ (корни $\\pm i$, резонанс для $\\sin x$). Выберите верную сумму:", correct: "$(Ax^2+Bx+C) + x(D \\cos x + E \\sin x)$", options: ["$Ax^2+Bx+C + D \\cos x + E \\sin x$", "$(Ax^2+Bx+C) + x(D \\cos x + E \\sin x)$", "$x(Ax^2+Bx+C) + x(D \\cos x + E \\sin x)$"] },
      { task: "📝 Задание: Для $y'' - 3y' + 2y = e^{x} + e^{2x}$ (корни 1 и 2, оба резонанс кратности 1). Частное решение:", correct: "$A x e^{x} + B x e^{2x}$", options: ["$A e^{x} + B e^{2x}$", "$A x e^{x} + B x e^{2x}$", "$A x e^{x} + B e^{2x}$"] },
      { task: "📝 Задание: Для $y'' + y = 1 + \\sin x$ (корни $\\pm i$, резонанс для $\\sin x$). Верная структура:", correct: "$A + x(B \\cos x + C \\sin x)$", options: ["$A + B \\cos x + C \\sin x$", "$A + x(B \\cos x + C \\sin x)$", "$x(A + B \\cos x + C \\sin x)$"] }
    ]
  },
  6: {
    lecture: "📖 Лекция (Сложные случаи и финал). Комбинируйте изученное: учитывайте кратность корней, степени многочленов, суперпозицию. Вы готовы к итоговому испытанию!",
    tasks: [
      { task: "📝 Задание: Для $y'' - 4y' + 4y = e^{2x} + x e^{2x}$ ($\\lambda=2$ кратный). Какая форма частного верна?", correct: "$x^2 (A + Bx) e^{2x}$", options: ["$(A + Bx) e^{2x}$", "$x (A + Bx) e^{2x}$", "$x^2 (A + Bx) e^{2x}$"] },
      { task: "📝 Задание: Для $y'' + 4y = x \\cos 2x$ ($\\alpha=0$, $\\beta=2$, корни $\\pm 2i$, резонанс). Правильный вид $y^*$:", correct: "$x[(Ax+B) \\cos 2x + (Cx+D) \\sin 2x]$", options: ["$(Ax+B) \\cos 2x + (Cx+D) \\sin 2x$", "$x[(Ax+B) \\cos 2x + (Cx+D) \\sin 2x]$", "$x^2[(Ax+B) \\cos 2x + (Cx+D) \\sin 2x]$"] },
      { task: "📝 Задание: Принцип суперпозиции: если $f(x)=e^{x} + x e^{2x}$ и $\\lambda=1$ (корень), $\\lambda=2$ (не корень). Выберите верную сумму частных:", correct: "$A x e^{x} + (Bx + C) e^{2x}$", options: ["$A e^{x} + (Bx+C) e^{2x}$", "$A x e^{x} + (Bx+C) e^{2x}$", "$A x e^{x} + (Bx^2+Cx) e^{2x}$"] },
      { task: "📝 Задание: Для $y'' + 2y' + y = x e^{-x}$ ($\\lambda=-1$ кратный, степень многочлена 1). Форма частного:", correct: "$x^2 (Ax + B) e^{-x}$", options: ["$(Ax+B) e^{-x}$", "$x (Ax+B) e^{-x}$", "$x^2 (Ax+B) e^{-x}$"] },
      { task: "📝 Задание: Для $y'' + y = \\cos x + \\sin x$ (резонанс). Выберите верную форму:", correct: "$x (A \\cos x + B \\sin x)$", options: ["$A \\cos x + B \\sin x$", "$x (A \\cos x + B \\sin x)$", "$x^2 (A \\cos x + B \\sin x)$"] }
    ]
  }
};

// ---------- ВАЛИДАЦИЯ ЗАДАНИЙ ----------
function validateRooms() {
  Object.entries(roomsData).forEach(([room, data]) => {
    data.tasks.forEach((task, idx) => {
      if (!task.options.includes(task.correct)) {
        console.error(`❌ Ошибка в комнате ${room}, задание ${idx+1}:`, task.task);
        console.error(`   Правильный ответ: "${task.correct}" не найден в вариантах:`, task.options);
      }
    });
  });
}
validateRooms();

// ---------- ПОДРОБНАЯ ТЕОРИЯ ДЛЯ КАЖДОЙ КОМНАТЫ (ВСПЛЫВАЮЩЕЕ ОКНО) ----------
const theoryByRoom = {
  1: `
    <h2>📖 Однородные линейные ДУ 2-го порядка</h2>
    <p>Уравнение: $y'' + p y' + q y = 0$.</p>
    <h3>🔍 Алгоритм:</h3>
    <ol>
      <li>Составить характеристическое уравнение: $\\lambda^2 + p\\lambda + q = 0$.</li>
      <li>Найти его корни $\\lambda_1, \\lambda_2$.</li>
      <li>По виду корней записать общее решение:
        <ul>
          <li>Действительные и разные: $y = C_1 e^{\\lambda_1 x} + C_2 e^{\\lambda_2 x}$</li>
          <li>Действительные кратные ($\\lambda_1 = \\lambda_2 = \\lambda$): $y = (C_1 + C_2 x) e^{\\lambda x}$</li>
          <li>Комплексные $\\lambda = \\alpha \\pm i\\beta$: $y = e^{\\alpha x}(C_1 \\cos \\beta x + C_2 \\sin \\beta x)$</li>
        </ul>
      </li>
    </ol>
    <h3>📌 Пример (разные корни):</h3>
    <p>$y'' - 5y' + 6y = 0$ → $\\lambda^2 -5\\lambda +6 = 0$ → $\\lambda_1=2,\\ \\lambda_2=3$ → $y = C_1 e^{2x} + C_2 e^{3x}$.</p>
    <h3>📌 Пример (кратный корень):</h3>
    <p>$y'' - 4y' + 4y = 0$ → $(\\lambda-2)^2=0$ → $\\lambda=2$ → $y = (C_1 + C_2 x)e^{2x}$.</p>
    <h3>📌 Пример (комплексные):</h3>
    <p>$y'' + 2y' + 5y = 0$ → $\\lambda = -1 \\pm 2i$ → $y = e^{-x}(C_1 \\cos 2x + C_2 \\sin 2x)$.</p>
  `,
  2: `
    <h2>📖 Общее решение однородного ДУ</h2>
    <p>Закрепление материала комнаты 1. Три случая корней характеристического уравнения.</p>
    <h3>📌 Важные формулы:</h3>
    <ul>
      <li>$\\lambda_1 \\ne \\lambda_2$ (действит.): $y = C_1 e^{\\lambda_1 x} + C_2 e^{\\lambda_2 x}$</li>
      <li>$\\lambda_1 = \\lambda_2 = \\lambda$: $y = (C_1 + C_2 x) e^{\\lambda x}$</li>
      <li>$\\lambda = \\alpha \\pm i\\beta$: $y = e^{\\alpha x}(C_1 \\cos \\beta x + C_2 \\sin \\beta x)$</li>
    </ul>
    <p>🔹 <strong>Совет</strong>: всегда сначала выписывайте характеристическое уравнение.</p>
  `,
  3: `
    <h2>📖 ЛНДУ с правой частью $P(x)e^{\\alpha x}$</h2>
    <p>Уравнение: $y'' + p y' + q y = P(x) e^{\\alpha x}$, где $P(x)$ – многочлен степени $n$.</p>
    <h3>🔍 Алгоритм подбора частного решения $y^*$:</h3>
    <ol>
      <li>Найти корни характеристического уравнения однородного ДУ.</li>
      <li>Определить кратность $r$ числа $\\alpha$ среди этих корней ($r = 0,1,2$).</li>
      <li>Записать $y^* = x^r Q(x) e^{\\alpha x}$, где $Q(x)$ – многочлен степени $n$ (с неопределёнными коэффициентами).</li>
      <li>Подставить $y^*$ в исходное уравнение и найти коэффициенты.</li>
    </ol>
    <h3>📌 Примеры:</h3>
    <ul>
      <li>$y'' - 3y' + 2y = e^{x}$: $\\alpha=1$ – корень хар. ур. (кратность 1) → $y^* = A x e^{x}$.</li>
      <li>$y'' - 4y' + 4y = e^{2x}$: $\\alpha=2$ – кратный корень (кратность 2) → $y^* = A x^2 e^{2x}$.</li>
      <li>$y'' + y' = 2$ (здесь $\\alpha=0$, многочлен $P(x)=2$, степень 0): $\\alpha=0$ – корень кратности 1 → $y^* = A x$.</li>
    </ul>
  `,
  4: `
    <h2>📖 ЛНДУ с правой частью $e^{\\alpha x}(P_1\\cos \\beta x + P_2\\sin \\beta x)$</h2>
    <p>Этот вид называют «тригонометрическая правая часть».</p>
    <h3>🔍 Алгоритм:</h3>
    <ol>
      <li>Найти корни характеристического уравнения.</li>
      <li>Проверить, является ли число $\\alpha + i\\beta$ корнем характеристического. Если да, то кратность $r = 1$ (для ДУ 2-го порядка), иначе $r = 0$.</li>
      <li>Частное решение: $y^* = x^r e^{\\alpha x} \\big( Q_1(x)\\cos \\beta x + Q_2(x)\\sin \\beta x \\big)$, где $Q_1, Q_2$ – многочлены степени $m = \\max(\\deg P_1, \\deg P_2)$.</li>
    </ol>
    <h3>📌 Примеры:</h3>
    <ul>
      <li>$y'' + y = \\cos x$: $\\alpha=0,\\beta=1$, $i$ – корень (резонанс) → $y^* = x(A\\cos x + B\\sin x)$.</li>
      <li>$y'' + 4y = 3\\sin 2x$: корни $\\pm 2i$ → резонанс → $y^* = x(A\\cos 2x + B\\sin 2x)$.</li>
      <li>$y'' - 2y' + 2y = e^{x}\\sin x$: корни $1\\pm i$, $\\alpha+i\\beta = 1+i$ – корень → $y^* = x e^{x}(A\\cos x + B\\sin x)$.</li>
    </ul>
  `,
  5: `
    <h2>📖 Принцип суперпозиции</h2>
    <p>Если $f(x) = f_1(x) + f_2(x)$, то частное решение $y^* = y_1^* + y_2^*$, где $y_1^*$ – частное решение для $f_1$, $y_2^*$ – для $f_2$.</p>
    <h3>📌 Пример:</h3>
    <p>$y'' - y = e^{x} + \\cos x$</p>
    <ul>
      <li>Для $e^{x}$: $\\alpha=1$ – корень хар. ур. ($\\lambda=\\pm1$) → $y_1^* = A x e^{x}$.</li>
      <li>Для $\\cos x$: $\\alpha=0,\\beta=1$, $i$ – не корень → $y_2^* = B\\cos x + C\\sin x$.</li>
      <li>Итого: $y^* = A x e^{x} + B\\cos x + C\\sin x$.</li>
    </ul>
    <p>⚠️ Важно: каждый компонент правой части обрабатывается отдельно, а результаты складываются.</p>
  `,
  6: `
    <h2>📖 Сложные случаи + итоговое закрепление</h2>
    <p>Здесь требуется комбинировать всё изученное:</p>
    <ul>
      <li>Если правая часть содержит $x^k$ – повышайте степень многочлена при резонансе.</li>
      <li>Если $f(x) = e^{\\alpha x} \\cdot (\\text{многочлен})$ и $\\alpha$ – кратный корень, домножайте на $x^r$.</li>
      <li>При суперпозиции складывайте частные решения.</li>
      <li>Для $\\cos / \\sin$ с множителем $x$ (например $x\\cos 2x$) – степень многочлена увеличивается.</li>
    </ul>
    <h3>📌 Пример:</h3>
    <p>$y'' + 4y = x \\cos 2x$:</p>
    <ul>
      <li>Корни $\\pm 2i$ → резонанс.</li>
      <li>Правая часть – произведение $x$ (многочлен 1-й степени) на $\\cos 2x$.</li>
      <li>Поэтому $y^* = x\\big[ (Ax+B)\\cos 2x + (Cx+D)\\sin 2x \\big]$.</li>
    </ul>
    <p>💪 Попробуйте пройти все 6 комнат без ошибок!</p>
  `
};

// ---------- ЭЛЕМЕНТЫ DOM ----------
const authBox = document.getElementById("authBox");
const userPanel = document.getElementById("userPanel");
const userEmailSpan = document.getElementById("userEmail");
const startBtn = document.getElementById("startBtn");
const gameDiv = document.getElementById("game");
const scoreDisplaySpan = document.getElementById("scoreDisplay");
const roomDisplaySpan = document.getElementById("roomDisplay");
const gameStatusDiv = document.getElementById("gameStatus");
const profilesDiv = document.getElementById("profiles");

// ---------- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ UI ----------
function updateStatusUI() {
  if (gameActive) {
    gameStatusDiv.style.display = "flex";
    scoreDisplaySpan.innerText = totalScore;
    roomDisplaySpan.innerText = currentRoom;
  } else {
    gameStatusDiv.style.display = "none";
  }
}

function showFeedback(message, isError = false, explanation = "") {
  const existing = document.querySelector(".feedback");
  if (existing) existing.remove();
  const fb = document.createElement("div");
  fb.className = "feedback";
  fb.style.background = isError ? "#7f1a1acc" : "#14532dcc";
  fb.style.borderLeftColor = isError ? "#f87171" : "#4ade80";
  fb.innerHTML = message + (explanation ? `<br><small>📘 ${explanation}</small>` : "");
  gameDiv.appendChild(fb);
  setTimeout(() => fb.remove(), 3000);
}

function escapeHtml(str) {
  return str.replace(/[&<>]/g, m => m === '&' ? '&amp;' : m === '<' ? '&lt;' : '&gt;');
}

function getExplanation(question, correctAnswer) {
  if (correctAnswer.includes("x e^{x}") && question.includes("e^{x}")) return "α=1 совпадает с корнем → домножаем на x.";
  if (correctAnswer.includes("x² e^{2x}")) return "Корень λ=2 кратности 2 → домножаем на x².";
  if (correctAnswer.includes("x (A cos")) return "Правая часть cos x или sin x совпадает с решением однородного → нужен множитель x.";
  if (correctAnswer.includes("+ x(") || correctAnswer.includes("принцип суперпозиции")) return "Сумма разных правых частей → сумма частных решений (принцип суперпозиции).";
  if (correctAnswer.includes("(C₁ + C₂x)")) return "Кратный корень характеристического уравнения → множитель x в общем решении.";
  if (correctAnswer.includes("e^{-x}(C₁ cos")) return "Комплексные корни λ = α ± iβ → решение: e^{αx}(C₁ cos βx + C₂ sin βx).";
  if (correctAnswer.includes("x² (Ax²")) return "Корень кратности 2 и многочлен 2-й степени → домножаем на x² и берём многочлен степени 2.";
  if (correctAnswer.includes("x[(Ax+B) cos")) return "Резонанс для cos/sin и правая часть содержит множитель x → степень многочлена повышается.";
  return "Изучите лекцию внимательнее, обратите внимание на кратность корней и степень многочлена.";
}

function getRandomTaskForRoom(roomNumber) {
  const tasks = roomsData[roomNumber].tasks;
  return tasks[Math.floor(Math.random() * tasks.length)];
}

// ---------- МОДАЛЬНОЕ ОКНО ТЕОРИИ ----------
function showTheoryModal(roomNumber) {
  const theoryHtml = theoryByRoom[roomNumber] || "<p>Теория временно недоступна.</p>";
  const existingModal = document.getElementById("theoryModal");
  if (existingModal) existingModal.remove();
  
  const modal = document.createElement("div");
  modal.id = "theoryModal";
  modal.className = "modal";
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-btn">&times;</button>
      ${theoryHtml}
    </div>
  `;
  document.body.appendChild(modal);
  modal.style.display = "block";
  
  const closeBtn = modal.querySelector(".close-btn");
  closeBtn.onclick = () => {
    modal.style.display = "none";
    modal.remove();
  };
  window.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = "none";
      modal.remove();
    }
  };
  renderMath();
}

// ---------- ЭТАП 1: ПОКАЗ ЛЕКЦИИ (с кнопкой теории) ----------
function showLecture() {
  if (!gameActive) return;
  const roomInfo = roomsData[currentRoom];
  if (!roomInfo) {
    finishGame();
    return;
  }
  currentTaskObj = getRandomTaskForRoom(currentRoom);
  
  const isValid = currentTaskObj.options.includes(currentTaskObj.correct);
  if (!isValid) {
    console.error("Ошибка: правильный ответ не найден среди вариантов!", currentTaskObj);
    showFeedback("⚠️ Техническая ошибка: правильный ответ отсутствует. Перезапустите игру.", true, "");
    gameActive = false;
    return;
  }
  
  gameDiv.innerHTML = `
    <div class="lecture-container panel">
      <h3>📚 Комната ${currentRoom} / 6</h3>
      <p style="font-size:1.1rem; background:#0f172a; padding:12px; border-radius:20px;">${roomInfo.lecture}</p>
      <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: center;">
        <button id="theoryBtn" class="btn secondary">📘 Теория (подробно)</button>
        <button id="enterRoomBtn" class="btn primary">🚪 Войти в комнату и решить задание</button>
      </div>
    </div>
  `;
  renderMath();
  document.getElementById("theoryBtn").onclick = () => showTheoryModal(currentRoom);
  document.getElementById("enterRoomBtn").onclick = () => showRoomWithDoors();
}

// ---------- ЭТАП 2: ПОКАЗ ЗАДАНИЯ И ДВЕРЕЙ ----------
function showRoomWithDoors() {
  if (!gameActive) return;
  isWaiting = false;
  if (!currentTaskObj) {
    currentTaskObj = getRandomTaskForRoom(currentRoom);
  }
  const taskText = currentTaskObj.task;
  const correctAnswer = currentTaskObj.correct;
  let options = [...currentTaskObj.options];
  
  // Перемешиваем варианты
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  let html = `
    <div class="task-container panel">
      <h3>🔓 Комната ${currentRoom} / 6 — решите пример</h3>
      <p style="font-size:1.1rem; background:#0f172a; padding:12px; border-radius:20px;">${taskText}</p>
    </div>
    <div class="doors-container">
      <div class="doors">
        <h3 style="margin-bottom:15px;">🚪 Выберите дверь с правильным ответом</h3>
  `;
  options.forEach((opt) => {
    const isCorrectOpt = (opt === correctAnswer);
    html += `
      <div class="door" data-answer="${escapeHtml(opt)}" data-correct="${isCorrectOpt}">
        <span>${escapeHtml(opt)}</span>
      </div>
    `;
  });
  html += `</div></div>`;
  
  gameDiv.innerHTML = html;
  renderMath();
  
  const doors = document.querySelectorAll('.door');
  
  function handleDoorClick(e) {
    if (!gameActive || isWaiting) return;
    const door = this;
    const isCorrect = door.getAttribute('data-correct') === 'true';
    
    if (door.classList.contains('disabled')) return;
    
    isWaiting = true;
    door.classList.add('open');
    
    if (isCorrect) {
      totalScore += 100;
      const explanation = getExplanation(currentTaskObj.task, currentTaskObj.correct);
      showFeedback(`✅ Правильно! +100 очков`, false, explanation);
      currentRoom++;
      updateStatusUI();
      if (currentRoom > 6) {
        finishGame();
      } else {
        currentTaskObj = null;
        setTimeout(() => {
          isWaiting = false;
          showLecture();
        }, 500);
      }
    } else {
      door.classList.add('disabled');
      door.style.opacity = '0.6';
      door.style.pointerEvents = 'none';
      totalScore = Math.max(0, totalScore - 15);
      updateStatusUI();
      const explanation = `Правильный ответ: ${currentTaskObj.correct}. ${getExplanation(currentTaskObj.task, currentTaskObj.correct)}`;
      showFeedback(`❌ Неверно! -15 очков`, true, explanation);
      isWaiting = false;
    }
  }
  
  doors.forEach(door => {
    door.addEventListener('click', handleDoorClick);
  });
}

// ---------- ЗАВЕРШЕНИЕ ИГРЫ ----------
async function finishGame() {
  if (!gameActive) return;
  gameActive = false;
  isWaiting = false;
  const finalScore = totalScore;
  gameDiv.innerHTML = `
    <div class="panel">
      <h2>🏁 Игра завершена!</h2>
      <p>🎉 ${currentUser?.email || "Игрок"}, вы прошли все комнаты.</p>
      <p>💰 Итоговый счёт: <strong>${finalScore}</strong></p>
      <p>🧠 Теперь вы умеете подбирать частные решения ЛНДУ!</p>
      <button id="restartBtn" class="btn primary">🔄 Играть заново</button>
    </div>
  `;
  renderMath();
  document.getElementById("restartBtn").onclick = () => startGame();
  updateStatusUI();
  
  if (currentUser) {
    const userRef = doc(db, "players", currentUser.uid);
    const snap = await getDoc(userRef);
    const gameRecord = {
      score: finalScore,
      date: Date.now(),
      level: 6
    };
    if (!snap.exists()) {
      await setDoc(userRef, {
        email: currentUser.email,
        bestScore: finalScore,
        games: [gameRecord]
      });
    } else {
      const oldData = snap.data();
      const newBest = Math.max(oldData.bestScore || 0, finalScore);
      await updateDoc(userRef, {
        bestScore: newBest,
        games: arrayUnion(gameRecord)
      });
    }
    await loadLeaderboard();
  }
}

function startGame() {
  if (!currentUser) {
    alert("Сначала войдите или зарегистрируйтесь");
    return;
  }
  gameActive = true;
  currentRoom = 1;
  totalScore = 0;
  currentTaskObj = null;
  isWaiting = false;
  updateStatusUI();
  showLecture();
}

// ---------- ЛИДЕРБОРД ----------
async function loadLeaderboard() {
  try {
    const q = query(collection(db, "players"), orderBy("bestScore", "desc"), limit(15));
    const snapshot = await getDocs(q);
    let html = "";
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      html += `
        <div class="profile-card">
          <b>${escapeHtml(data.email || "Аноним")}</b><br>
          🏆 Лучший счёт: ${data.bestScore ?? 0}
        </div>
      `;
    });
    if (html === "") html = "<p>Нет данных</p>";
    profilesDiv.innerHTML = html;
    renderMath();
  } catch(e) {
    console.warn("Ошибка загрузки лидерборда", e);
    profilesDiv.innerHTML = "<p>Ошибка загрузки</p>";
  }
}

// ---------- АВТОРИЗАЦИЯ ----------
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    authBox.style.display = "none";
    userPanel.style.display = "flex";
    userEmailSpan.innerText = user.email;
    startBtn.disabled = false;
    loadLeaderboard();
    if(!gameActive) gameDiv.innerHTML = "<div class='panel'>✨ Нажмите 'Начать игру'</div>";
    renderMath();
  } else {
    authBox.style.display = "block";
    userPanel.style.display = "none";
    startBtn.disabled = true;
    gameActive = false;
    isWaiting = false;
    gameDiv.innerHTML = "<div class='panel'>🔑 Авторизуйтесь, чтобы играть и попасть в таблицу лидеров</div>";
    renderMath();
    gameStatusDiv.style.display = "none";
    profilesDiv.innerHTML = "<p>Войдите, чтобы увидеть рейтинг</p>";
  }
});

document.getElementById("registerBtn").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  if (password.length < 6) {
    alert("Пароль должен быть минимум 6 символов");
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Регистрация успешна!");
  } catch(e) {
    alert("Ошибка: " + e.message);
  }
};

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch(e) {
    alert("Ошибка входа: " + e.message);
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  await signOut(auth);
  gameActive = false;
  isWaiting = false;
};

startBtn.onclick = startGame;