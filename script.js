// グローバル状態
const state = {
    subjects: ['国語', '数学', '英語', '理科', '社会'],
    testData: [], // { id, name, date, scores: { subjectName: score } } の配列
    editingId: null // 編集中のデータID
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
    cancelEditBtn: document.getElementById('cancel-edit-btn'),
    testDataTableBody: document.querySelector('#test-data-table tbody'),
    lineChartsContainer: document.getElementById('line-charts-container'),
    pieChartsContainer: document.getElementById('pie-charts-container'),
};

// Chart.js インスタンス保持用
let lineChartInstances = [];
let pieChartInstances = [];

// 初期化
function init() {
    loadState();
    // Chart.js データラベルプラグインの登録
    Chart.register(ChartDataLabels);

    renderSubjectList();
    renderScoreInputs();
    setupEventListeners();
    renderDataTable();
    renderCharts();
}

// 状態の保存
function saveState() {
    // editingIdは保存しない
    const toSave = {
        subjects: state.subjects,
        testData: state.testData
    };
    localStorage.setItem('testScoreAnalyzerState', JSON.stringify(toSave));
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
    elements.addTestDataBtn.addEventListener('click', handleAddOrUpdateTestData);
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
}

// 教科追加処理
function handleAddSubject() {
    const name = elements.newSubjectInput.value.trim();
    if (name && !state.subjects.includes(name)) {
        state.subjects.push(name);
        elements.newSubjectInput.value = '';
        renderSubjectList();
        renderScoreInputs();
        // 既存のテストデータにもその教科のスコア（0点）を追加しておく方が安全だが、ない場合はundefined/0扱いにするのでそのままでOK
        renderDataTable(); // テーブルのヘッダーが変わるわけではないが、詳細列などに影響する場合のため
        renderCharts();
        saveState();
        alert(`${name}を追加しました。`);
    } else if (state.subjects.includes(name)) {
        alert('その教科は既に追加されています。');
    }
}

// 教科削除処理（グローバル公開）
window.deleteSubject = function (subjectName) {
    if (confirm(`${subjectName}を削除してもよろしいですか？\n登録済みのテストデータからもこの教科の点数は削除されませんが、グラフや入力欄には表示されなくなります。`)) {
        state.subjects = state.subjects.filter(s => s !== subjectName);
        renderSubjectList();
        renderScoreInputs();
        renderCharts();
        saveState();
    }
};

// 教科リスト描画
function renderSubjectList() {
    elements.subjectList.innerHTML = state.subjects
        .map(sub => `
            <span>
                ${sub}
                <button class="delete-subject-btn" onclick="deleteSubject('${sub}')">×</button>
            </span>
        `)
        .join('');
}

// 点数入力フォーム描画
function renderScoreInputs(scoresToFill = {}) {
    elements.scoreInputs.innerHTML = state.subjects.map(sub => `
        <div class="score-input-item">
            <label>${sub}</label>
            <input type="number" min="0" max="100" data-subject="${sub}" placeholder="0" value="${scoresToFill[sub] !== undefined ? scoresToFill[sub] : ''}">
        </div>
    `).join('');
}

// テストデータ追加・更新処理
function handleAddOrUpdateTestData() {
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

    if (state.editingId) {
        // 更新モード
        const index = state.testData.findIndex(d => d.id === state.editingId);
        if (index !== -1) {
            state.testData[index] = {
                ...state.testData[index], // IDなどは維持
                name: testName,
                date: testDate,
                scores: { ...state.testData[index].scores, ...scores }, // 既存の未表示教科のスコアも保持したほうがいいかもしれないが、今回は上書きでOK
                total: totalScore
            };
            alert('データを更新しました。');
            cancelEdit(); // 編集モード終了
        }
    } else {
        // 新規追加モード
        const newData = {
            id: Date.now(),
            name: testName,
            date: testDate,
            scores: scores,
            total: totalScore
        };
        state.testData.push(newData);
    }

    // フォームリセット（cancelEdit内でやっているが、新規の場合も必要）
    if (!state.editingId) {
        elements.testNameInput.value = '';
        elements.testDateInput.value = '';
        inputs.forEach(input => input.value = '');
    }

    renderDataTable();
    renderCharts();
    saveState();
}

// 編集モード開始
window.editTestData = function (id) {
    const data = state.testData.find(d => d.id === id);
    if (!data) return;

    state.editingId = id;

    // フォームに値をセット
    elements.testNameInput.value = data.name;
    elements.testDateInput.value = data.date;
    renderScoreInputs(data.scores);

    // ボタン表示切替
    elements.addTestDataBtn.textContent = '更新';
    elements.addTestDataBtn.classList.remove('primary-btn'); // 色変更などはCSSクラスで行うと良いが今回は省略
    elements.addTestDataBtn.style.backgroundColor = '#faad14'; // 更新色
    elements.cancelEditBtn.style.display = 'block';

    // フォームへスクロール
    document.getElementById('data-entry').scrollIntoView({ behavior: 'smooth' });
};

// 編集キャンセル
function cancelEdit() {
    state.editingId = null;
    elements.testNameInput.value = '';
    elements.testDateInput.value = '';
    renderScoreInputs();

    // ボタン戻す
    elements.addTestDataBtn.textContent = 'データを追加';
    elements.addTestDataBtn.style.backgroundColor = ''; // CSS定義に戻す
    elements.addTestDataBtn.classList.add('primary-btn');
    elements.cancelEditBtn.style.display = 'none';
}

// データテーブル描画
function renderDataTable() {
    elements.testDataTableBody.innerHTML = state.testData.map(data => `
        <tr>
            <td>${data.name}</td>
            <td>${data.date || '-'}</td>
            <td>${data.total}</td>
            <td>${state.subjects.map(sub => `${sub}:${data.scores[sub] || 0}`).join(', ')}</td>
            <td>
                <button class="edit-btn" onclick="editTestData(${data.id})">編集</button>
                <button class="danger-btn" onclick="deleteTestData(${data.id})">削除</button>
            </td>
        </tr>
    `).join('');
}

// テストデータ削除
window.deleteTestData = function (id) {
    if (confirm('このデータを削除してもよろしいですか？')) {
        state.testData = state.testData.filter(d => d.id !== id);
        if (state.editingId === id) cancelEdit();
        renderDataTable();
        renderCharts();
        saveState();
    }
};

// グラフ描画（メインロジック）
function renderCharts() {
    renderLineCharts();
    renderPieCharts();
}

// 線グラフ描画（教科別）
function renderLineCharts() {
    // コンテナクリア
    elements.lineChartsContainer.innerHTML = '';

    // インスタンス破棄
    lineChartInstances.forEach(chart => chart.destroy());
    lineChartInstances = [];

    state.subjects.forEach(subject => {
        const wrapper = document.createElement('div');
        wrapper.className = 'chart-card';
        wrapper.innerHTML = `
            <h3>${subject}</h3>
            <div style="position: relative; height: 200px; width: 100%;">
                <canvas id="lineChart-${subject}"></canvas>
            </div>
        `;
        elements.lineChartsContainer.appendChild(wrapper);

        const ctx = document.getElementById(`lineChart-${subject}`).getContext('2d');

        // データ準備
        const scores = state.testData.map(d => d.scores[subject] || 0);
        const labels = state.testData.map(d => d.name);

        // 平均点計算（この教科の全テスト平均）
        const sum = scores.reduce((a, b) => a + b, 0);
        const avg = scores.length > 0 ? (sum / scores.length) : 0;
        const avgData = Array(scores.length).fill(avg);

        const color = getRandomColor();

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '点数',
                        data: scores,
                        borderColor: color,
                        backgroundColor: color,
                        tension: 0.1,
                        fill: false
                    },
                    {
                        label: '平均点',
                        data: avgData,
                        borderColor: '#999',
                        borderDash: [5, 5],
                        pointRadius: 0,
                        borderWidth: 1,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                },
                plugins: {
                    datalabels: {
                        display: false // 線グラフには数値を表示しない（うるさくなるので）
                    }
                }
            }
        });
        lineChartInstances.push(chart);
    });
}

// 円グラフ描画
function renderPieCharts() {
    // コンテナクリア
    elements.pieChartsContainer.innerHTML = '';

    // インスタンス破棄
    pieChartInstances.forEach(chart => chart.destroy());
    pieChartInstances = [];

    state.testData.forEach((data) => {
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

        // 色生成
        const bgColors = state.subjects.map(() => getRandomColor());

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
                        '#FF9F40',
                        '#8D6E63', // 色が足りない場合用
                        '#78909C'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    datalabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 14
                        },
                        formatter: (value, ctx) => {
                            if (value === 0) return ''; // 0点は表示しない
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            // 全体が0の場合は0%
                            if (sum === 0) return '0%';
                            let percentage = (value * 100 / sum).toFixed(1) + "%";
                            return percentage;
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                let label = context.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                label += context.raw + '点';
                                return label;
                            }
                        }
                    }
                }
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
