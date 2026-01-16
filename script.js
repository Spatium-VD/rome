
        // Конфигурация
const CONFIG = {
    itemsPerPage: 50,
    sortDirection: 'desc',
    sortField: 'period',
    telegramUrl: 'https://t.me/'
};

// Глобальные переменные
let allPayments = [];
let filteredPayments = [];
let currentPage = 1;
let currentSort = { field: CONFIG.sortField, direction: CONFIG.sortDirection };
let currentEmployeePayments = [];
let currentMode = null; // 'last-period', 'last-unpaid', null
let allPeriods = [];
let allStatuses = [];
let lastPeriod = '';

// Элементы DOM
const elements = {
    // Основной экран
    mainScreen: document.getElementById('main-screen'),
    employeeScreen: document.getElementById('employee-screen'),
    
    // Фильтры
    yearFilter: document.getElementById('year-filter'),
    periodFilter: document.getElementById('period-filter'),
    statusFilter: document.getElementById('status-filter'),
    searchInput: document.getElementById('search-input'),
    resetFiltersBtn: document.getElementById('reset-filters'),
    lastPeriodBtn: document.getElementById('last-period'),
    lastUnpaidBtn: document.getElementById('last-unpaid'),
    
    // Индикатор режима
    modeIndicator: document.getElementById('mode-indicator'),
    modeMessage: document.getElementById('mode-message'),
    
    // Таблица
    loading: document.getElementById('loading'),
    tableContainer: document.getElementById('table-container'),
    tableBody: document.getElementById('table-body'),
    rowCount: document.getElementById('row-count'),
    periodInfo: document.getElementById('period-info'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-load'),
    
    // Пагинация
    prevPageBtn: document.getElementById('prev-page'),
    nextPageBtn: document.getElementById('next-page'),
    pageInfo: document.getElementById('page-info'),
    
    // Карточка сотрудника
    backButton: document.getElementById('back-button'),
    employeeName: document.getElementById('employee-name'),
    employeePhone: document.getElementById('employee-phone'),
    telegramLink: document.getElementById('telegram-link'),
    employeeLoading: document.getElementById('employee-loading'),
    employeeTableContainer: document.getElementById('employee-table-container'),
    employeeTableBody: document.getElementById('employee-table-body'),
    employeeError: document.getElementById('employee-error'),
    
    // Итоги
    totalPayments: document.getElementById('total-payments'),
    totalAmount: document.getElementById('total-amount'),
    lastPaymentDate: document.getElementById('last-payment-date'),
    
    // Общее
    lastUpdate: document.getElementById('last-update'),
    exportCsvBtn: document.getElementById('export-csv')
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Загрузка данных
    loadData();
    
    // Назначение обработчиков событий
    setupEventListeners();
    
    // Обновление времени последнего обновления
    updateLastUpdateTime();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Фильтры
    elements.yearFilter.addEventListener('change', applyFilters);
    elements.periodFilter.addEventListener('change', applyFilters);
    elements.statusFilter.addEventListener('change', applyFilters);
    elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    elements.resetFiltersBtn.addEventListener('click', resetFilters);
    elements.lastPeriodBtn.addEventListener('click', () => showLastPeriod());
    elements.lastUnpaidBtn.addEventListener('click', () => showLastUnpaid());
    
    // Пагинация
    elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    elements.nextPageBtn.addEventListener('click', () => changePage(1));
    
    // Кнопки
    elements.retryBtn.addEventListener('click', loadData);
    elements.backButton.addEventListener('click', showMainScreen);
    elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
    // Сортировка таблицы
    document.querySelectorAll('#payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortTable(field);
        });
    });
    
    // Сортировка таблицы сотрудника
    document.querySelectorAll('#employee-payments-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortEmployeeTable(field);
        });
    });
}

// Загрузка данных из Google Apps Script
async function loadData() {
    try {
        showLoading();
        
        // ⭐ ВСТАВЬТЕ ВАШ URL Google Apps Script ЗДЕСЬ ⭐
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl3W8gDtZcjWuwwhLfE_EmRXGSbViv7xwjPuNn8cVoXvnlKuDz2xCBy_kMWiBmUdQ-nA/exec';
        
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.data) {
            // Преобразуем данные в нужный формат
            allPayments = result.data.map((item, index) => ({
                id: index + 1,
                year: item.year || new Date().getFullYear(),
                period: item.period || '',
                employee: item.employee || '',
                phone: String(item.phone || ''),
                amount: parseFloat(item.amount) || 0,
                status: item.status || '',
                comment: item.comment || '',
                formattedAmount: formatCurrency(parseFloat(item.amount) || 0)
            }));
            
            // ⭐ ДИНАМИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ПЕРИОДОВ И СТАТУСОВ
            updatePeriodsAndStatuses(allPayments);
            
            // Определяем последний период
            lastPeriod = getLastPeriod(allPayments);
            
            // Заполняем фильтры
            populateFilters(allPayments);
            
            // Применяем фильтры и отображаем данные
            applyFilters();
            
            // Обновляем время последнего обновления
            updateLastUpdateTime();
            
            hideError();
        } else {
            throw new Error(result.error || 'Неверный формат данных');
        }
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Для тестирования используем демо-данные
        console.log('Используются демо-данные для тестирования интерфейса');
        allPayments = generateTestData();
        updatePeriodsAndStatuses(allPayments);
        lastPeriod = getLastPeriod(allPayments);
        populateFilters(allPayments);
        applyFilters();
        showWarning('Используются демо-данные. Настройте подключение к Google Таблице.');
    }
}

// ⭐ ДИНАМИЧЕСКОЕ ОБНОВЛЕНИЕ ПЕРИОДОВ И СТАТУСОВ
function updatePeriodsAndStatuses(payments) {
    // Получаем все уникальные периоды
    const periodsSet = new Set();
    const statusesSet = new Set();
    
    payments.forEach(payment => {
        if (payment.period) periodsSet.add(payment.period);
        if (payment.status) statusesSet.add(payment.status);
    });
    
    // Сортируем периоды (предполагаем формат DD.MM-DD.MM)
    allPeriods = Array.from(periodsSet).sort((a, b) => {
        // Простая сортировка по строкам, для более сложной нужен парсинг дат
        return b.localeCompare(a); // От новых к старым
    });
    
    // Сортируем статусы
    allStatuses = Array.from(statusesSet).sort();
    
    // Сохраняем в localStorage для будущих сессий
    localStorage.setItem('payment_periods', JSON.stringify(allPeriods));
    localStorage.setItem('payment_statuses', JSON.stringify(allStatuses));
}

// Заполнение фильтров
function populateFilters(payments) {
    // Годы (динамически из данных)
    const years = [...new Set(payments.map(p => p.year))].sort((a, b) => b - a);
    elements.yearFilter.innerHTML = '<option value="">Все годы</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        elements.yearFilter.appendChild(option);
    });
    
    // Периоды (динамически из allPeriods)
    elements.periodFilter.innerHTML = '<option value="">Все периоды</option>';
    allPeriods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.textContent = period;
        elements.periodFilter.appendChild(option);
    });
    
    // Статусы (динамически из allStatuses)
    elements.statusFilter.innerHTML = '<option value="">Все статусы</option>';
    allStatuses.forEach(status => {
        const option = document.createElement('option');
        option.value = status;
        option.textContent = status;
        elements.statusFilter.appendChild(option);
    });
}

// Применение фильтров
function applyFilters() {
    // Сбрасываем специальные режимы
    exitMode();
    
    // Применяем фильтры
    let filtered = [...allPayments];
    
    // Фильтр по году
    const selectedYear = elements.yearFilter.value;
    if (selectedYear) {
        filtered = filtered.filter(p => p.year == selectedYear);
    }
    
    // Фильтр по периоду
    const selectedPeriod = elements.periodFilter.value;
    if (selectedPeriod) {
        filtered = filtered.filter(p => p.period === selectedPeriod);
        elements.periodInfo.textContent = `Период: ${selectedPeriod}`;
    } else {
        elements.periodInfo.textContent = '';
    }
    
    // Фильтр по статусу
    const selectedStatus = elements.statusFilter.value;
    if (selectedStatus) {
        filtered = filtered.filter(p => p.status === selectedStatus);
    }
    
    // Фильтр по поиску
    const searchTerm = elements.searchInput.value.toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.employee.toLowerCase().includes(searchTerm) || 
            p.phone.includes(searchTerm)
        );
    }
    
    filteredPayments = filtered;
    currentPage = 1;
    
    // Сортировка
    sortPayments();
    
    // Отображение
    renderTable();
    updatePagination();
}

// Режим: Последний период (все выплаты)
function showLastPeriod() {
    if (!lastPeriod) return;
    
    currentMode = 'last-period';
    
    // Сбрасываем фильтры
    elements.yearFilter.value = '';
    elements.periodFilter.value = '';
    elements.statusFilter.value = '';
    elements.searchInput.value = '';
    
    // Показываем все записи последнего периода
    filteredPayments = allPayments.filter(p => p.period === lastPeriod);
    
    // Показываем индикатор режима
    showModeIndicator(`Показаны <strong>все выплаты</strong> за последний период: <strong>${lastPeriod}</strong>`);
    
    // Обновляем интерфейс
    currentPage = 1;
    sortPayments();
    renderTable();
    updatePagination();
}

// Режим: Неоплаченные в последнем периоде
function showLastUnpaid() {
    if (!lastPeriod) return;
    
    currentMode = 'last-unpaid';
    
    // Сбрасываем фильтры
    elements.yearFilter.value = '';
    elements.periodFilter.value = '';
    elements.statusFilter.value = '';
    elements.searchInput.value = '';
    
    // Показываем только НЕОПЛАЧЕННЫЕ записи последнего периода
    const unpaidStatuses = allStatuses.filter(status => 
        !status.includes('Оплатили') && !status.includes('оплатили')
    );
    
    filteredPayments = allPayments.filter(p => 
        p.period === lastPeriod && unpaidStatuses.includes(p.status)
    );
    
    // Показываем индикатор режима
    showModeIndicator(`Показаны <strong>неоплаченные выплаты</strong> за период: <strong>${lastPeriod}</strong>`);
    
    // Обновляем интерфейс
    currentPage = 1;
    sortPayments();
    renderTable();
    updatePagination();
}

// Выход из специального режима
function exitMode() {
    if (!currentMode) return;
    
    currentMode = null;
    elements.modeIndicator.classList.add('hidden');
    elements.lastPeriodBtn.classList.remove('active');
    elements.lastUnpaidBtn.classList.remove('active');
}

// Показать индикатор режима
function showModeIndicator(message) {
    elements.modeMessage.innerHTML = message;
    elements.modeIndicator.classList.remove('hidden');
    
    // Активируем соответствующую кнопку
    if (currentMode === 'last-period') {
        elements.lastPeriodBtn.classList.add('active');
        elements.lastUnpaidBtn.classList.remove('active');
    } else if (currentMode === 'last-unpaid') {
        elements.lastUnpaidBtn.classList.add('active');
        elements.lastPeriodBtn.classList.remove('active');
    }
}

// Сброс фильтров
function resetFilters() {
    elements.yearFilter.value = '';
    elements.periodFilter.value = '';
    elements.statusFilter.value = '';
    elements.searchInput.value = '';
    
    exitMode();
    applyFilters();
}

// Определение последнего периода
function getLastPeriod(payments) {
    if (!payments || payments.length === 0) return '';
    
    // Используем предварительно вычисленные все периоды
    return allPeriods.length > 0 ? allPeriods[0] : '';
}

// Отображение таблицы
function renderTable() {
    if (filteredPayments.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                    <p>Нет данных, соответствующих фильтрам</p>
                </td>
            </tr>
        `;
        elements.rowCount.textContent = '0';
        return;
    }
    
    // Определяем диапазон отображаемых записей
    const startIndex = (currentPage - 1) * CONFIG.itemsPerPage;
    const endIndex = Math.min(startIndex + CONFIG.itemsPerPage, filteredPayments.length);
    const pagePayments = filteredPayments.slice(startIndex, endIndex);
    
    // Генерация строк таблицы
    let tableHTML = '';
    
    pagePayments.forEach(payment => {
        // Определяем класс для статуса
        const statusClass = getStatusClass(payment.status);
        
        tableHTML += `
            <tr>
                <td>${payment.period}</td>
                <td>
                    <a href="#" class="employee-link" data-id="${payment.id}">
                        ${payment.employee}
                    </a>
                </td>
                <td>${formatPhone(payment.phone)}</td>
                <td>${payment.formattedAmount}</td>
                <td class="${statusClass}">${payment.status}</td>
                <td>${payment.comment || '-'}</td>
            </tr>
        `;
    });
    
    elements.tableBody.innerHTML = tableHTML;
    elements.rowCount.textContent = filteredPayments.length;
    
    // Назначаем обработчики для ссылок на сотрудников
    document.querySelectorAll('.employee-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const paymentId = parseInt(link.getAttribute('data-id'));
            showEmployeeDetails(paymentId);
        });
    });
}

// Отображение деталей сотрудника
function showEmployeeDetails(paymentId) {
    // Находим платеж по ID
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) return;
    
    // Находим все платежи этого сотрудника
    currentEmployeePayments = allPayments.filter(p => 
        p.employee === payment.employee && p.phone === payment.phone
    );
    
    // Заполняем информацию о сотруднике
    elements.employeeName.textContent = payment.employee;
    elements.employeePhone.textContent = formatPhone(payment.phone);
    
    // Настраиваем Telegram ссылку
    const telegramUrl = `${CONFIG.telegramUrl}${formatPhoneForTelegram(payment.phone)}`;
    elements.telegramLink.href = telegramUrl;
    elements.telegramLink.title = `Написать ${payment.employee} в Telegram`;
    
    // Переключаем экраны
    elements.mainScreen.classList.add('hidden');
    elements.employeeScreen.classList.remove('hidden');
    
    // Отображаем историю выплат
    renderEmployeeTable();
}

// Отображение таблицы выплат сотрудника
function renderEmployeeTable() {
    if (currentEmployeePayments.length === 0) {
        elements.employeeTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                    Нет данных о выплатах
                </td>
            </tr>
        `;
        elements.totalPayments.textContent = '0';
        elements.totalAmount.textContent = '0';
        elements.lastPaymentDate.textContent = '-';
        return;
    }
    
    // Сортируем по периоду (от новых к старым)
    currentEmployeePayments.sort((a, b) => b.period.localeCompare(a.period));
    
    // Генерация строк таблицы
    let tableHTML = '';
    let totalAmount = 0;
    let lastPayment = '';
    
    currentEmployeePayments.forEach(payment => {
        const statusClass = getStatusClass(payment.status);
        
        tableHTML += `
            <tr>
                <td>${payment.period}</td>
                <td>${payment.formattedAmount}</td>
                <td class="${statusClass}">${payment.status}</td>
                <td>${payment.comment || '-'}</td>
            </tr>
        `;
        
        totalAmount += payment.amount;
        
        // Определяем последнюю выплату
        if (!lastPayment || payment.period > lastPayment) {
            lastPayment = payment.period;
        }
    });
    
    elements.employeeTableBody.innerHTML = tableHTML;
    elements.totalPayments.textContent = currentEmployeePayments.length;
    elements.totalAmount.textContent = formatCurrency(totalAmount);
    elements.lastPaymentDate.textContent = lastPayment;
    
    // Показываем таблицу
    elements.employeeLoading.classList.add('hidden');
    elements.employeeTableContainer.classList.remove('hidden');
    elements.employeeError.classList.add('hidden');
}

// Вспомогательные функции
function getStatusClass(status) {
    if (status.includes('Оплатили') || status.includes('оплатили')) {
        return 'status-paid';
    } else if (status.includes('Не') || status.includes('не')) {
        return 'status-not-paid';
    }
    return 'status-other';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatPhone(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Форматируем: +7 (XXX) XXX-XX-XX для российских номеров
    if (cleaned.length === 11 && cleaned.startsWith('7') || cleaned.startsWith('8')) {
        return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9, 11)}`;
    }
    
    return `+${cleaned}`;
}

function formatPhoneForTelegram(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    
    // Для Telegram нужен номер без + и пробелов
    return cleaned;
}

// Остальные функции (sortTable, sortPayments, changePage, updatePagination, exportToCSV и т.д.)
// остаются такими же как в предыдущей версии, но я добавлю их для полноты:

function sortTable(field) {
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    
    updateSortIcons();
    sortPayments();
    renderTable();
}

function updateSortIcons() {
    document.querySelectorAll('#payments-table th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    const activeTh = document.querySelector(`#payments-table th[data-sort="${currentSort.field}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
}

function sortPayments() {
    filteredPayments.sort((a, b) => {
        let valueA = a[currentSort.field];
        let valueB = b[currentSort.field];
        
        if (currentSort.field === 'amount') {
            valueA = a.amount;
            valueB = b.amount;
        }
        
        if (currentSort.field === 'period') {
            return currentSort.direction === 'asc' 
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return currentSort.direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
}

function changePage(delta) {
    const totalPages = Math.ceil(filteredPayments.length / CONFIG.itemsPerPage);
    const newPage = currentPage + delta;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        updatePagination();
    }
}

function updatePagination() {
    const totalPages = Math.ceil(filteredPayments.length / CONFIG.itemsPerPage);
    
    elements.pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
    elements.prevPageBtn.parentElement.classList.toggle('hidden', totalPages <= 1);
}

function exportToCSV() {
    if (filteredPayments.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    const headers = ['Период выплаты', 'Сотрудник', 'Телефон', 'Сумма из реестра', 'Статус', 'Комментарий'];
    const rows = filteredPayments.map(payment => [
        payment.period,
        payment.employee,
        payment.phone,
        payment.amount,
        payment.status,
        payment.comment || ''
    ]);
    
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', `выплаты_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    
    URL.revokeObjectURL(url);
}

function sortEmployeeTable(field) {
    currentEmployeePayments.sort((a, b) => {
        if (field === 'period') {
            return b.period.localeCompare(a.period);
        } else if (field === 'amount') {
            return b.amount - a.amount;
        } else if (field === 'status') {
            return a.status.localeCompare(b.status);
        }
        return 0;
    });
    
    renderEmployeeTable();
}

function showMainScreen() {
    elements.mainScreen.classList.remove('hidden');
    elements.employeeScreen.classList.add('hidden');
}

function showLoading() {
    elements.loading.classList.remove('hidden');
    elements.tableContainer.classList.add('hidden');
    elements.errorMessage.classList.add('hidden');
}

function hideLoading() {
    elements.loading.classList.add('hidden');
    elements.tableContainer.classList.remove('hidden');
}

function showError() {
    elements.loading.classList.add('hidden');
    elements.tableContainer.classList.add('hidden');
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
    hideLoading();
}

function showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.querySelector('.container').prepend(warningDiv);
}

function updateLastUpdateTime() {
    const now = new Date();
    const formattedTime = now.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    elements.lastUpdate.textContent = `Последнее обновление: ${formattedTime}`;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Генерация тестовых данных (для демонстрации)
function generateTestData() {
    const periods = ['01.12-15.12', '16.11-30.11', '06.11-15.11', '16.10-5.11'];
    const statuses = ['Оплатили', 'оплатили в QUGO', 'Не платим', 'В обработке', 'Ожидает подтверждения'];
    
    const testData = [];
    
    const employees = [
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185" },
        { name: "Курбонова Гулжахон Абдуразоковна", phone: "79255103455" },
        { name: "Назаров Тухтасин Мухаммади Угли", phone: "79264200393" },
        { name: "Маматова Хуршедахон Исроиловна", phone: "79288542471" },
        { name: "Шерназаров Зариф Акбарали Угли", phone: "79336677836" },
        { name: "Анорбоев Шахзод Тулгин Угли", phone: "79777470317" },
        { name: "Хамракулов Ойбек Хурсанович", phone: "79779593169" },
        { name: "Тожиева Наргиза Аминова", phone: "79856292007" },
        { name: "Мухаммаджонов Акмалджон Аюбович", phone: "79955553419" }
    ];
    
    let id = 1;
    for (const period of periods) {
        for (const employee of employees) {
            const amount = Math.floor(Math.random() * 100000) + 10000;
            const statusIndex = Math.floor(Math.random() * statuses.length);
            const comment = Math.random() > 0.7 ? 'Тестовый комментарий' : '';
            
            testData.push({
                id: id++,
                year: 2025,
                period: period,
                employee: employee.name,
                phone: employee.phone,
                amount: amount,
                status: statuses[statusIndex],
                comment: comment,
                formattedAmount: formatCurrency(amount)
            });
        }
    }
    
    return testData;
}

// Глобальная функция для выхода из режима
window.exitMode = exitMode;

// Периодическое обновление данных (каждые 5 минут)
setInterval(() => {
    loadData();
}, 5 * 60 * 1000);
