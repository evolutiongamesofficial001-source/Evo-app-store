// ========== CONFIGURAÇÕES GLOBAIS ==========

class AppState {
    constructor() {
        this.theme = localStorage.getItem('theme') || 'dark';
        this.sound = localStorage.getItem('sound') !== 'false';
        this.vibration = localStorage.getItem('vibration') !== 'false';
        this.precision = parseInt(localStorage.getItem('precision')) || 4;
    }

    setTheme(theme) {
        this.theme = theme;
        localStorage.setItem('theme', theme);
    }

    setSound(enabled) {
        this.sound = enabled;
        localStorage.setItem('sound', enabled);
    }

    setVibration(enabled) {
        this.vibration = enabled;
        localStorage.setItem('vibration', enabled);
    }

    setPrecision(decimal) {
        this.precision = decimal;
        localStorage.setItem('precision', decimal);
    }
}

const appState = new AppState();

// ========== CLASSE CALCULADORA ==========

class Calculator {
    constructor() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.operationDisplay = '';
        this.history = this.loadHistory();
        this.shouldResetDisplay = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDisplay();
    }

    setupEventListeners() {
        document.querySelectorAll('[data-number]').forEach(btn => {
            btn.addEventListener('click', () => this.handleNumber(btn.dataset.number));
        });

        document.querySelectorAll('[data-operator]').forEach(btn => {
            btn.addEventListener('click', () => this.handleOperator(btn.dataset.operator));
        });

        document.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', () => this.handleAction(btn.dataset.action));
        });

        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    handleNumber(num) {
        playSound();
        vibrate();

        if (this.shouldResetDisplay) {
            this.currentValue = num === '.' ? '0.' : num;
            this.shouldResetDisplay = false;
        } else {
            if (this.currentValue === '0' && num !== '.') {
                this.currentValue = num;
            } else if (num === '.') {
                if (!this.currentValue.includes('.')) {
                    this.currentValue += num;
                }
            } else {
                this.currentValue += num;
            }
        }
        this.updateDisplay();
    }

    handleOperator(op) {
        playSound();
        vibrate();

        const inputValue = parseFloat(this.currentValue);

        if (this.previousValue === '') {
            this.previousValue = inputValue.toString();
            this.operation = op;
            this.operationDisplay = `${this.previousValue} ${this.getOperatorSymbol(op)}`;
            this.shouldResetDisplay = true;
        } else if (this.operation) {
            const result = this.calculate(parseFloat(this.previousValue), inputValue, this.operation);
            this.currentValue = this.formatNumber(result);
            this.previousValue = result.toString();
            this.operation = op;
            this.operationDisplay = `${this.currentValue} ${this.getOperatorSymbol(op)}`;
            this.shouldResetDisplay = true;
        }

        this.updateDisplay();
    }

    handleAction(action) {
        playSound();
        vibrate();

        switch (action) {
            case 'clear':
                this.clear();
                break;
            case 'delete':
                this.delete();
                break;
            case 'percent':
                this.percent();
                break;
            case 'equals':
                this.equals();
                break;
        }
        this.updateDisplay();
    }

    handleKeyboard(e) {
        if (e.key >= '0' && e.key <= '9') {
            this.handleNumber(e.key);
        } else if (e.key === '.') {
            this.handleNumber('.');
        } else if (e.key === '+') {
            this.handleOperator('+');
        } else if (e.key === '-') {
            this.handleOperator('-');
        } else if (e.key === '*') {
            e.preventDefault();
            this.handleOperator('*');
        } else if (e.key === '/') {
            e.preventDefault();
            this.handleOperator('/');
        } else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            this.equals();
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            this.delete();
        } else if (e.key === 'Escape') {
            this.clear();
        } else if (e.key === '%') {
            this.percent();
        }
        this.updateDisplay();
    }

    clear() {
        this.currentValue = '0';
        this.previousValue = '';
        this.operation = null;
        this.operationDisplay = '';
        this.shouldResetDisplay = false;
    }

    delete() {
        if (this.currentValue !== '0') {
            this.currentValue = this.currentValue.slice(0, -1) || '0';
        }
    }

    percent() {
        const value = parseFloat(this.currentValue);
        this.currentValue = this.formatNumber(value / 100);
    }

    equals() {
        if (this.operation && this.previousValue !== '') {
            const current = parseFloat(this.currentValue);
            const previous = parseFloat(this.previousValue);
            const result = this.calculate(previous, current, this.operation);

            const expression = `${previous} ${this.getOperatorSymbol(this.operation)} ${current}`;
            this.addToHistory(expression, result);

            this.currentValue = this.formatNumber(result);
            this.previousValue = '';
            this.operation = null;
            this.operationDisplay = '';
            this.shouldResetDisplay = true;
        }
    }

    calculate(a, b, op) {
        switch (op) {
            case '+':
                return a + b;
            case '-':
                return a - b;
            case '*':
                return a * b;
            case '/':
                return b !== 0 ? a / b : 0;
            default:
                return b;
        }
    }

    formatNumber(num) {
        const rounded = Math.round(num * Math.pow(10, appState.precision)) / Math.pow(10, appState.precision);

        if (Math.abs(rounded) > 1e10 || (Math.abs(rounded) < 1e-6 && rounded !== 0)) {
            return rounded.toExponential(6);
        }

        return rounded.toString();
    }

    getOperatorSymbol(op) {
        const symbols = {
            '+': '+',
            '-': '−',
            '*': '×',
            '/': '÷'
        };
        return symbols[op] || op;
    }

    updateDisplay() {
        const displayCurrent = document.getElementById('displayCurrent');
        const displayHistory = document.getElementById('displayHistory');
        const displayInfo = document.getElementById('displayInfo');

        displayCurrent.textContent = this.currentValue;
        displayHistory.textContent = this.operationDisplay;
        displayInfo.textContent = this.previousValue ? `${this.previousValue}` : '';
    }

    addToHistory(expression, result) {
        const item = {
            id: Date.now(),
            expression: expression,
            result: this.formatNumber(result),
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        this.history.unshift(item);
        if (this.history.length > 100) {
            this.history.pop();
        }

        this.saveHistory();
        updateHistoryDisplay();
    }

    loadHistory() {
        const stored = localStorage.getItem('calculatorHistory');
        return stored ? JSON.parse(stored) : [];
    }

    saveHistory() {
        localStorage.setItem('calculatorHistory', JSON.stringify(this.history));
    }
}

// ========== CLASSE CALCULADORA CIENTÍFICA ==========

class ScientificCalculator extends Calculator {
    handleScientificFunction(func) {
        playSound();
        vibrate();

        const value = parseFloat(this.currentValue);
        let result;

        switch (func) {
            case 'sin':
                result = Math.sin(value * Math.PI / 180);
                break;
            case 'cos':
                result = Math.cos(value * Math.PI / 180);
                break;
            case 'tan':
                result = Math.tan(value * Math.PI / 180);
                break;
            case 'sqrt':
                result = Math.sqrt(value);
                break;
            case 'pow2':
                result = value * value;
                break;
            case 'pow':
                this.operation = '^';
                this.previousValue = value.toString();
                this.operationDisplay = `${value}^`;
                this.shouldResetDisplay = true;
                this.updateDisplay();
                return;
            case 'log':
                result = Math.log10(value);
                break;
            case 'ln':
                result = Math.log(value);
                break;
            default:
                return;
        }

        this.currentValue = this.formatNumber(result);
        this.updateDisplay();
    }

    calculateScientific(a, b, op) {
        if (op === '^') {
            return Math.pow(a, b);
        }
        return super.calculate(a, b, op);
    }
}

// ========== CLASSE CONVERSOR ==========

class Converter {
    constructor() {
        this.conversions = {
            length: {
                m: 1,
                cm: 100,
                km: 0.001,
                in: 39.3701,
                ft: 3.28084,
                yd: 1.09361,
                mi: 0.000621371
            },
            weight: {
                kg: 1,
                g: 1000,
                mg: 1000000,
                oz: 35.274,
                lb: 2.20462,
                ton: 0.001
            },
            temperature: {
                c: 0,
                f: 1,
                k: 2
            },
            volume: {
                l: 1,
                ml: 1000,
                cm3: 1000,
                in3: 61.024,
                gal: 0.264172,
                pt: 2.11338
            },
            area: {
                m2: 1,
                cm2: 10000,
                km2: 0.000001,
                in2: 1550,
                ft2: 10.7639,
                yd2: 1.19599,
                ha: 0.0001
            }
        };

        this.init();
    }

    init() {
        document.getElementById('converterType').addEventListener('change', () => this.updateUnits());
        document.getElementById('converterInput').addEventListener('input', () => this.convert());
        document.getElementById('converterFrom').addEventListener('change', () => this.convert());
        document.getElementById('converterTo').addEventListener('change', () => this.convert());
        document.getElementById('btnSwapUnits').addEventListener('click', () => this.swapUnits());
    }

    updateUnits() {
        const type = document.getElementById('converterType').value;
        const fromSelect = document.getElementById('converterFrom');
        const toSelect = document.getElementById('converterTo');
        const units = this.conversions[type];

        [fromSelect, toSelect].forEach(select => {
            select.innerHTML = '';
            for (const unit in units) {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = this.getUnitLabel(type, unit);
                select.appendChild(option);
            }
        });

        toSelect.value = Object.keys(units)[1] || Object.keys(units)[0];
        this.convert();
    }

    getUnitLabel(type, unit) {
        const labels = {
            length: { m: 'Metro (m)', cm: 'Centímetro (cm)', km: 'Quilômetro (km)', in: 'Polegada (in)', ft: 'Pé (ft)', yd: 'Jarda (yd)', mi: 'Milha (mi)' },
            weight: { kg: 'Quilograma (kg)', g: 'Grama (g)', mg: 'Miligrama (mg)', oz: 'Onça (oz)', lb: 'Libra (lb)', ton: 'Tonelada (ton)' },
            temperature: { c: 'Celsius (°C)', f: 'Fahrenheit (°F)', k: 'Kelvin (K)' },
            volume: { l: 'Litro (L)', ml: 'Mililitro (ml)', cm3: 'Centímetro Cúbico (cm³)', in3: 'Polegada Cúbica (in³)', gal: 'Galão (gal)', pt: 'Pinta (pt)' },
            area: { m2: 'Metro Quadrado (m²)', cm2: 'Centímetro Quadrado (cm²)', km2: 'Quilômetro Quadrado (km²)', in2: 'Polegada Quadrada (in²)', ft2: 'Pé Quadrado (ft²)', yd2: 'Jarda Quadrada (yd²)', ha: 'Hectare (ha)' }
        };
        return labels[type]?.[unit] || unit;
    }

    convert() {
        const type = document.getElementById('converterType').value;
        const input = parseFloat(document.getElementById('converterInput').value) || 0;
        const fromUnit = document.getElementById('converterFrom').value;
        const toUnit = document.getElementById('converterTo').value;
        const output = document.getElementById('converterOutput');

        let result;

        if (type === 'temperature') {
            result = this.convertTemperature(input, fromUnit, toUnit);
        } else {
            const factor = this.conversions[type][toUnit] / this.conversions[type][fromUnit];
            result = input * factor;
        }

        output.value = this.formatConversion(result);
    }

    convertTemperature(value, from, to) {
        let celsius;

        if (from === 'c') celsius = value;
        else if (from === 'f') celsius = (value - 32) * 5 / 9;
        else if (from === 'k') celsius = value - 273.15;

        if (to === 'c') return celsius;
        else if (to === 'f') return celsius * 9 / 5 + 32;
        else if (to === 'k') return celsius + 273.15;
    }

    formatConversion(value) {
        const rounded = Math.round(value * 10000) / 10000;
        return rounded.toString();
    }

    swapUnits() {
        const from = document.getElementById('converterFrom').value;
        const to = document.getElementById('converterTo').value;

        document.getElementById('converterFrom').value = to;
        document.getElementById('converterTo').value = from;

        const input = document.getElementById('converterInput').value;
        const output = document.getElementById('converterOutput').value;

        document.getElementById('converterInput').value = output;
        this.convert();
    }
}

// ========== FUNÇÕES GLOBAIS ==========

const calculator = new Calculator();
const scientificCalc = new ScientificCalculator();
const converter = new Converter();

function playSound() {
    if (!appState.sound) return;
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } catch (e) {}
}

function vibrate() {
    if (!appState.vibration || !navigator.vibrate) return;
    navigator.vibrate(10);
}

function updateHistoryDisplay() {
    const historyList = document.getElementById('historyList');

    if (calculator.history.length === 0) {
        historyList.innerHTML = '<div class="empty-history">📊 Nenhuma conta realizada ainda</div>';
        return;
    }

    historyList.innerHTML = calculator.history.map(item => `
        <div class="history-item">
            <div style="flex: 1;">
                <div class="history-expression">${item.expression}</div>
                <div class="history-time">${item.timestamp}</div>
            </div>
            <div class="history-result">${item.result}</div>
        </div>
    `).join('');
}

// ========== TAB NAVIGATION ==========

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(`tab-${tabId}`).classList.add('active');

            if (tabId === 'history') {
                updateHistoryDisplay();
            }
        });
    });

    document.getElementById('tab-calculator').classList.add('active');
    document.querySelector('[data-tab="calculator"]').classList.add('active');
}

// ========== SETTINGS MODAL ==========

function setupSettings() {
    const modal = document.getElementById('settingsModal');
    const overlay = document.getElementById('modalOverlay');

    document.getElementById('btnSettings').addEventListener('click', () => {
        modal.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    });

    document.getElementById('btnCloseSettings').addEventListener('click', closeSettings);
    overlay.addEventListener('click', closeSettings);

    function closeSettings() {
        modal.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    // Theme
    document.querySelectorAll('[data-theme]').forEach(btn => {
        btn.addEventListener('click', () => {
            const theme = btn.dataset.theme;
            appState.setTheme(theme);
            applyTheme();

            document.querySelectorAll('[data-theme]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Precision
    document.querySelectorAll('[data-precision]').forEach(btn => {
        btn.addEventListener('click', () => {
            const precision = parseInt(btn.dataset.precision);
            appState.setPrecision(precision);

            document.querySelectorAll('[data-precision]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Sound
    document.querySelectorAll('[data-sound]').forEach(btn => {
        btn.addEventListener('click', () => {
            const enabled = btn.dataset.sound === 'on';
            appState.setSound(enabled);

            document.querySelectorAll('[data-sound]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Vibration
    document.querySelectorAll('[data-vibration]').forEach(btn => {
        btn.addEventListener('click', () => {
            const enabled = btn.dataset.vibration === 'on';
            appState.setVibration(enabled);

            document.querySelectorAll('[data-vibration]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Buttons
    document.getElementById('btnClearAllHistory').addEventListener('click', () => {
        if (confirm('Tem certeza que deseja apagar o histórico?')) {
            calculator.history = [];
            calculator.saveHistory();
            updateHistoryDisplay();
        }
    });

    document.getElementById('btnExportData').addEventListener('click', exportData);
    document.getElementById('btnImportData').addEventListener('click', () => {
        document.getElementById('fileInput').click();
    });
    document.getElementById('btnResetData').addEventListener('click', resetData);
    document.getElementById('fileInput').addEventListener('change', importData);

    // Set initial active states
    setInitialSettings();
}

function setInitialSettings() {
    document.querySelector(`[data-theme="${appState.theme}"]`).classList.add('active');
    document.querySelector(`[data-precision="${appState.precision}"]`).classList.add('active');
    document.querySelector(`[data-sound="${appState.sound ? 'on' : 'off'}"]`).classList.add('active');
    document.querySelector(`[data-vibration="${appState.vibration ? 'on' : 'off'}"]`).classList.add('active');
}

function applyTheme() {
    const body = document.body;
    if (appState.theme === 'light') {
        body.classList.add('light-mode');
    } else {
        body.classList.remove('light-mode');
    }
}

// ========== DATA IMPORT/EXPORT ==========

function exportData() {
    const data = {
        history: calculator.history,
        settings: {
            theme: appState.theme,
            precision: appState.precision,
            sound: appState.sound,
            vibration: appState.vibration
        },
        exported: new Date().toISOString()
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calculator-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.history) {
                calculator.history = data.history;
                calculator.saveHistory();
            }
            if (data.settings) {
                appState.setTheme(data.settings.theme);
                appState.setPrecision(data.settings.precision);
                appState.setSound(data.settings.sound);
                appState.setVibration(data.settings.vibration);
                applyTheme();
                setInitialSettings();
            }
            updateHistoryDisplay();
            alert('✅ Dados importados com sucesso!');
        } catch (error) {
            alert('❌ Erro ao importar dados');
        }
    };
    reader.readAsText(file);
}

function resetData() {
    if (confirm('⚠️ Tem certeza que deseja resetar TUDO? Esta ação não pode ser desfeita!')) {
        localStorage.clear();
        calculator.history = [];
        calculator.saveHistory();
        location.reload();
    }
}

// ========== THEME TOGGLE ==========

document.getElementById('btnTheme').addEventListener('click', () => {
    const themes = ['dark', 'light'];
    const currentIndex = themes.indexOf(appState.theme);
    const newTheme = themes[(currentIndex + 1) % themes.length];
    appState.setTheme(newTheme);
    applyTheme();
});

// ========== INICIALIZAÇÃO ==========

document.addEventListener('DOMContentLoaded', () => {
    applyTheme();
    setupTabs();
    setupSettings();
    converter.updateUnits();
    updateHistoryDisplay();
    registerServiceWorker();

    // Setup scientific calculator
    document.querySelectorAll('[data-sci]').forEach(btn => {
        btn.addEventListener('click', () => {
            scientificCalc.handleScientificFunction(btn.dataset.sci);
        });
    });

    document.querySelectorAll('[data-number-sci]').forEach(btn => {
        btn.addEventListener('click', () => {
            scientificCalc.handleNumber(btn.dataset.numberSci);
            document.getElementById('displayCurrentSci').textContent = scientificCalc.currentValue;
        });
    });
});

// ========== SERVICE WORKER ==========

async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
        } catch (error) {
            console.log('SW error:', error);
        }
    }
}