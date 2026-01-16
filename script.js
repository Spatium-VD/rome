// Конфигурация
const CONFIG = {
    itemsPerPage: 50,
    sortDirection: 'desc',
    sortField: 'period'
};

// Глобальные переменные
let allPayments = [];
let filteredPayments = [];
let currentPage = 1;
let currentSort = { field: CONFIG.sortField, direction: CONFIG.sortDirection };
let currentEmployeePayments = [];
let isLastPaymentsMode = false;
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
    lastPaymentsBtn: document.getElementById('last-payments'),
    
    // Таблица
    loading: document.getElementById('loading'),
    tableContainer: document.getElementById('table-container'),
    tableBody: document.getElementById('table-body'),
    rowCount: document.getElementById('row-count'),
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
    elements.lastPaymentsBtn.addEventListener('click', showLastPayments);
    
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
        
        // ⭐⭐⭐ ВАШ КЛЮЧЕВОЙ ШАГ ⭐⭐⭐
        // ЗАМЕНИТЕ ЭТУ СТРОКУ НА ВАШ РЕАЛЬНЫЙ URL АППС СКРИПТА
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl3W8gDtZcjWuwwhLfE_EmRXGSbViv7xwjPuNn8cVoXvnlKuDz2xCBy_kMWiBmUdQ-nA/exec';
        // ⭐⭐⭐ ВСТАВЬТЕ СЮДА ВАШ URL ⭐⭐⭐
        
        console.log('Загрузка данных с:', APPS_SCRIPT_URL);
        
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Получены данные:', result);
        
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
            
            console.log('Обработано записей:', allPayments.length);
            
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
        
        // ⭐ БОНУС: Если не работает API, покажем демо-данные
        console.log('Показываем демо-данные для тестирования интерфейса');
        allPayments = generateTestData();
        lastPeriod = getLastPeriod(allPayments);
        populateFilters(allPayments);
        applyFilters();
        
        // Покажем предупреждение, но не ошибку
        showWarning('Используются демо-данные. Настройте подключение к Google Таблице.');
    }
}

// Добавьте эту функцию для показа предупреждения
function showWarning(message) {
    const warningDiv = document.createElement('div');
    warningDiv.className = 'warning-message';
    warningDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.querySelector('.container').prepend(warningDiv);
    
    // Добавьте стили для предупреждения в style.css
    const style = document.createElement('style');
    style.textContent = `
        .warning-message {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            color: #856404;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
            position: relative;
        }
        .warning-message i {
            font-size: 1.5rem;
        }
        .warning-message button {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            position: absolute;
            right: 10px;
            top: 10px;
            color: #856404;
        }
    `;
    document.head.appendChild(style);
}

// Генерация тестовых данных (для демонстрации)
function generateTestData() {
    const periods = [
        '16.10-5.11', '06.11-15.11', '16.11-30.11', '01.12-15.12'
    ];
    
    const statuses = [
        'Оплатили', 'оплатили в QUGO', 'Не платим'
    ];
    
    const comments = [
        '', '300,00', '62 350,00', '17 487,00', '5 300,00', 
        '4 590,00', '33,00', '30,00', '334,00', 'ошибка карты',
        'сказали что новый номер актуален', 'меняли номер и назад на наш'
    ];
    
    const testData = [];
    
    // Используем данные из примера для генерации
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
            const commentIndex = Math.floor(Math.random() * comments.length);
            
            testData.push({
                id: id++,
                year: 2025,
                period: period,
                employee: employee.name,
                phone: employee.phone,
                amount: amount,
                status: statuses[statusIndex],
                comment: comments[commentIndex],
                formattedAmount: formatCurrency(amount)
            });
        }
    }
    
    return testData;
}

// Определение последнего периода
function getLastPeriod(payments) {
    if (!payments || payments.length === 0) return '';
    
    // Извлекаем уникальные периоды и сортируем их
    const periods = [...new Set(payments.map(p => p.period))];
    
    // Простая логика: считаем, что последний период - с наибольшей датой начала
    // В реальном приложении нужно парсить даты
    return periods[periods.length - 1];
}

// Заполнение фильтров
function populateFilters(payments) {
    // Годы
    const years = [...new Set(payments.map(p => p.year))].sort((a, b) => b - a);
    elements.yearFilter.innerHTML = '<option value="">Все годы</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        elements.yearFilter.appendChild(option);
    });
    
    // Периоды
    const periods = [...new Set(payments.map(p => p.period))].sort();
    elements.periodFilter.innerHTML = '<option value="">Все периоды</option>';
    periods.forEach(period => {
        const option = document.createElement('option');
        option.value = period;
        option.textContent = period;
        elements.periodFilter.appendChild(option);
    });
}

// Применение фильтров
function applyFilters() {
    // Сбрасываем режим "Последние выплаты"
    isLastPaymentsMode = false;
    elements.lastPaymentsBtn.classList.remove('active');
    
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

// Режим "Последние выплаты"
function showLastPayments() {
    isLastPaymentsMode = !isLastPaymentsMode;
    
    if (isLastPaymentsMode) {
        // Активируем кнопку
        elements.lastPaymentsBtn.classList.add('active');
        
        // Сбрасываем другие фильтры
        elements.yearFilter.value = '';
        elements.statusFilter.value = '';
        elements.searchInput.value = '';
        
        // Фильтруем только последний период и исключаем "Оплатили"
        filteredPayments = allPayments.filter(p => 
            p.period === lastPeriod && p.status !== 'Оплатили'
        );
        
        currentPage = 1;
        sortPayments();
        renderTable();
        updatePagination();
    } else {
        // Возвращаемся к обычным фильтрам
        applyFilters();
    }
}

// Сброс фильтров
function resetFilters() {
    elements.yearFilter.value = '';
    elements.periodFilter.value = '';
    elements.statusFilter.value = '';
    elements.searchInput.value = '';
    
    isLastPaymentsMode = false;
    elements.lastPaymentsBtn.classList.remove('active');
    
    applyFilters();
}

// Сортировка данных
function sortTable(field) {
    // Определяем направление сортировки
    if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.field = field;
        currentSort.direction = 'desc';
    }
    
    // Обновляем иконки сортировки
    updateSortIcons();
    
    // Сортируем и отображаем
    sortPayments();
    renderTable();
}

// Обновление иконок сортировки
function updateSortIcons() {
    // Сбрасываем все иконки
    document.querySelectorAll('#payments-table th i').forEach(icon => {
        icon.className = 'fas fa-sort';
    });
    
    // Устанавливаем иконку для активного столбца
    const activeTh = document.querySelector(`#payments-table th[data-sort="${currentSort.field}"]`);
    if (activeTh) {
        const icon = activeTh.querySelector('i');
        icon.className = currentSort.direction === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
    }
}

// Сортировка платежей
function sortPayments() {
    filteredPayments.sort((a, b) => {
        let valueA = a[currentSort.field];
        let valueB = b[currentSort.field];
        
        // Для числовых значений
        if (currentSort.field === 'amount') {
            valueA = a.amount;
            valueB = b.amount;
        }
        
        // Для дат (периодов) - простая логика
        if (currentSort.field === 'period') {
            // В реальном приложении нужно парсить даты
            return currentSort.direction === 'asc' 
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        // Для строк
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return currentSort.direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        // Для чисел
        return currentSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
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
        let statusClass = 'status-other';
        if (payment.status === 'Оплатили' || payment.status === 'оплатили в QUGO') {
            statusClass = 'status-paid';
        } else if (payment.status === 'Не платим') {
            statusClass = 'status-not-paid';
        }
        
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
        // Определяем класс для статуса
        let statusClass = 'status-other';
        if (payment.status === 'Оплатили' || payment.status === 'оплатили в QUGO') {
            statusClass = 'status-paid';
        } else if (payment.status === 'Не платим') {
            statusClass = 'status-not-paid';
        }
        
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

// Сортировка таблицы сотрудника
function sortEmployeeTable(field) {
    // Простая сортировка (в реальном приложении нужно добавить логику как в sortTable)
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

// Возврат к основной таблице
function showMainScreen() {
    elements.mainScreen.classList.remove('hidden');
    elements.employeeScreen.classList.add('hidden');
}

// Пагинация
function updatePagination() {
    const totalPages = Math.ceil(filteredPayments.length / CONFIG.itemsPerPage);
    
    // Обновляем информацию о странице
    elements.pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    
    // Обновляем состояние кнопок
    elements.prevPageBtn.disabled = currentPage <= 1;
    elements.nextPageBtn.disabled = currentPage >= totalPages;
    
    // Показываем/скрываем пагинацию
    elements.prevPageBtn.parentElement.classList.toggle('hidden', totalPages <= 1);
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

// Экспорт в CSV
function exportToCSV() {
    if (filteredPayments.length === 0) {
        alert('Нет данных для экспорта');
        return;
    }
    
    // Заголовки CSV
    const headers = ['Период выплаты', 'Сотрудник', 'Телефон', 'Сумма из реестра', 'Статус', 'Комментарий'];
    
    // Данные
    const rows = filteredPayments.map(payment => [
        payment.period,
        payment.employee,
        payment.phone,
        payment.amount,
        payment.status,
        payment.comment || ''
    ]);
    
    // Создаем CSV содержимое
    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Создаем Blob и ссылку для скачивания
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    link.href = url;
    link.setAttribute('download', `выплаты_${new Date().toISOString().slice(0, 10)}.csv`);
    link.click();
    
    URL.revokeObjectURL(url);
}

// Вспомогательные функции
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

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatPhone(phone) {
    if (!phone) return '';
    // Простое форматирование: +7 (925) 258-01-02
    return `+${phone}`;
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

// Дебаунс для поиска
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

// Периодическое обновление данных (каждые 5 минут)
setInterval(() => {
    loadData();
}, 5 * 60 * 1000);
