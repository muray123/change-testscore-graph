// グローバル状態
const state = {
    subjects: ['国語', '数学', '英語', '理科', '社会'],
    testData: [], // { id, name, date, scores: { subjectName: score } } の配列
};

// DOM要素
const elements = {
    subjectList: document.getElementById('subject-list'),
    newSubjectInput: document.getElementById('new-subject-name'),
    addSubjectBtn: document.getElementById('add-subject-btn'),
    scoreInputs: document.getElementById('score-inputs'),
    testNameInput: document.getElementById('test-name'),
    testDateInput: document.getElementById('test-date'),
    addTestDataBtn: document.getElementById('add-test-data-btn'),
    testDataTableBody: document.querySelector('#test-data-table tbody'),
    lineChartCanvas: document.getElementById('lineChart'),
    pieChartsContainer: document.getElementById('pie-charts-container'),
};

// Chart.js インスタンス保持用
let lineChartInstance = null;
let pieChartInstances = [];

// 初期化
function init() {
    loadState();
    renderSubjectList();
    renderScoreInputs();
    setupEventListeners();
    renderCharts();
    renderDataTable();
}

// 状態の保存
function saveState() {
    localStorage.setItem('testScoreAnalyzerState', JSON.stringify(state));
}

// 状態の読み込み
function loadState() {
    const saved = localStorage.getItem('testScoreAnalyzerState');
    if (saved) {
        const parsed = JSON.parse(saved);
        state.subjects = parsed.subjects || state.subjects;
        state.testData = parsed.testData || state.testData;
    }
}

// イベントリスナー設定
function setupEventListeners() {
    elements.addSubjectBtn.addEventListener('click', handleAddSubject);
    elements.addTestDataBtn.addEventListener('click', handleAddTestData);
}

// 教科追加処理
function handleAddSubject() {
    const name = elements.newSubjectInput.value.trim();
    if (name && !state.subjects.includes(name)) {
        state.subjects.push(name);
        elements.newSubjectInput.value = '';
        renderSubjectList();
        renderScoreInputs();
        saveState();
        alert(`${name}を追加しました。`);
    } else if (state.subjects.includes(name)) {
        alert('その教科は既に追加されています。');
    }
}

// 教科リスト描画
function renderSubjectList() {
    elements.subjectList.innerHTML = state.subjects
        .map(sub => `<span>${sub}</span>`)
        .join('');
}

// 点数入力フォーム描画
function renderScoreInputs() {
    elements.scoreInputs.innerHTML = state.subjects.map(sub => `
        <div class="score-input-item">
            <label>${sub}</label>
            <input type="number" min="0" max="100" data-subject="${sub}" placeholder="0">
        </div>
    `).join('');
}

// テストデータ追加処理
function handleAddTestData() {
    const testName = elements.testNameInput.value.trim();
    const testDate = elements.testDateInput.value;

    if (!testName) {
        alert('テスト名を入力してください。');
        return;
    }

    const scores = {};
    let totalScore = 0;
    const inputs = elements.scoreInputs.querySelectorAll('input');

    inputs.forEach(input => {
        const subject = input.getAttribute('data-subject');
        const score = parseInt(input.value) || 0;
        scores[subject] = score;
        totalScore += score;
    });

    const newData = {
        id: Date.now(),
        name: testName,
        date: testDate,
        scores: scores,
        total: totalScore
    };

    state.testData.push(newData);

    // フォームリセット
    elements.testNameInput.value = '';
    elements.testDateInput.value = '';
    inputs.forEach(input => input.value = '');

    renderDataTable();
    renderCharts();
    saveState();
}

// データテーブル描画
function renderDataTable() {
    elements.testDataTableBody.innerHTML = state.testData.map(data => `
        <tr>
            <td>${data.name}</td>
            <td>${data.date || '-'}</td>
            <td>${data.total}</td>
            <td>${Object.entries(data.scores).map(([k, v]) => `${k}: ${v}`).join(', ')}</td>
            <td>
                <button class="danger-btn" onclick="deleteTestData(${data.id})">削除</button>
            </td>
        </tr>
    `).join('');
}

// テストデータ削除（グローバル関数として公開）
window.deleteTestData = function (id) {
    if (confirm('このデータを削除してもよろしいですか？')) {
        state.testData = state.testData.filter(d => d.id !== id);
        renderDataTable();
        renderCharts();
        saveState();
    }
};

// グラフ描画（メインロジック）
function renderCharts() {
    renderLineChart();
    renderPieCharts();
}

// 線グラフ描画
function renderLineChart() {
    // 既存のチャートがあれば破棄
    if (lineChartInstance) {
        lineChartInstance.destroy();
    }

    const datasets = state.subjects.map(subject => {
        // 色を生成（簡易的）
        const color = getRandomColor();
        return {
            label: subject,
            data: state.testData.map(d => d.scores[subject] || 0),
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.1
        };
    });

    // 平均点のデータセット計算（全教科の平均）
    // 要件：「背景には平均点が書かれたもの」 -> チャートの背景に平均ラインか、データセットとして平均を追加するか。
    // ここでは全テストの平均点推移を太線や別スタイルで表示、あるいは各テストごとの教科平均を表示？
    // 文脈的に「各教科のグラフ」＋「平均点」なので、全教科の平均（そのテストの平均点 / 教科数）を表示してみる。

    const averageScores = state.testData.map(d => {
        const total = Object.values(d.scores).reduce((a, b) => a + b, 0);
        return parseFloat((total / state.subjects.length).toFixed(1));
    });

    datasets.push({
        label: '平均点',
        data: averageScores,
        borderColor: '#999',
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        pointRadius: 0
    });

    const ctx = elements.lineChartCanvas.getContext('2d');
    lineChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: state.testData.map(d => d.name),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100
                }
            }
        }
    });
}

// 円グラフ描画
function renderPieCharts() {
    // コンテナをクリア
    elements.pieChartsContainer.innerHTML = '';

    // インスタンス配列をクリア（もし参照を保持する必要があればここでdestroyするが、DOMごと消すので簡易的に）
    pieChartInstances.forEach(chart => chart.destroy());
    pieChartInstances = [];

    state.testData.forEach((data, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'pie-chart-card';
        wrapper.innerHTML = `
            <h3>${data.name}</h3>
            <p>合計: ${data.total}点</p>
            <div class="pie-chart-wrapper">
                <canvas id="pieChart-${data.id}"></canvas>
            </div>
        `;
        elements.pieChartsContainer.appendChild(wrapper);

        const ctx = document.getElementById(`pieChart-${data.id}`).getContext('2d');
        const scores = state.subjects.map(sub => data.scores[sub] || 0);

        const chart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: state.subjects,
                datasets: [{
                    data: scores,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
            }
        });
        pieChartInstances.push(chart);
    });
}

// ユーティリティ: ランダムカラー生成
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

// 開始
init();
