
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
let allDocuments = [];
let filteredDocuments = [];
let mergedData = {}; // Объединённые данные по телефонам
let currentPage = 1;
let currentDocPage = 1;
let currentSort = { field: CONFIG.sortField, direction: CONFIG.sortDirection };
let currentDocSort = { field: 'employee', direction: 'asc' };
let currentEmployeePayments = [];
let currentEmployee = null; // Текущий сотрудник для карточки
let currentMode = null; // 'last-period', 'last-unpaid', null
let allPeriods = [];
let allStatuses = [];
let allPositions = [];
let allRestaurants = [];
let lastPeriod = '';
let currentScreen = 'home'; // 'home', 'payments', 'documents', 'dashboard', 'sos', 'employee'

// Элементы DOM - будем заполнять после загрузки DOM
const elements = {};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Сначала инициализируем элементы DOM
    initializeDOMElements();
    
    // Затем настраиваем обработчики событий
    setupEventListeners();
    
    // И только потом загружаем данные
    loadData();
    
    // Обновление времени последнего обновления
    updateLastUpdateTime();
});

// Инициализация элементов DOM
function initializeDOMElements() {
    // Экраны
    elements.homeScreen = document.getElementById('home-screen');
    elements.paymentsScreen = document.getElementById('payments-screen');
    elements.documentsScreen = document.getElementById('documents-screen');
    elements.dashboardScreen = document.getElementById('dashboard-screen');
    elements.sosScreen = document.getElementById('sos-screen');
    elements.employeeScreen = document.getElementById('employee-screen');
    
    // Навигация
    elements.navLinks = document.querySelectorAll('.nav-link');
    elements.quickActionBtns = document.querySelectorAll('.quick-action-btn');
    
    // Фильтры
    elements.yearFilter = document.getElementById('year-filter');
    elements.periodFilter = document.getElementById('period-filter');
    elements.statusFilter = document.getElementById('status-filter');
    elements.searchInput = document.getElementById('search-input');
    elements.resetFiltersBtn = document.getElementById('reset-filters');
    elements.lastPeriodBtn = document.getElementById('last-period');
    elements.lastUnpaidBtn = document.getElementById('last-unpaid');
    
    // Индикатор режима
    elements.modeIndicator = document.getElementById('mode-indicator');
    elements.modeMessage = document.getElementById('mode-message');
    
    // Таблица
    elements.loading = document.getElementById('loading');
    elements.tableContainer = document.getElementById('table-container');
    elements.tableBody = document.getElementById('table-body');
    elements.rowCount = document.getElementById('row-count');
    elements.periodInfo = document.getElementById('period-info');
    elements.errorMessage = document.getElementById('error-message');
    elements.retryBtn = document.getElementById('retry-load');
    
    // Пагинация
    elements.prevPageBtn = document.getElementById('prev-page');
    elements.nextPageBtn = document.getElementById('next-page');
    elements.pageInfo = document.getElementById('page-info');
    
    // Фильтры документов
    elements.docStatusFilter = document.getElementById('doc-status-filter');
    elements.docPositionFilter = document.getElementById('doc-position-filter');
    elements.docRestaurantFilter = document.getElementById('doc-restaurant-filter');
    elements.docProblemsFilter = document.getElementById('doc-problems-filter');
    elements.docSearchInput = document.getElementById('doc-search-input');
    elements.docResetFiltersBtn = document.getElementById('doc-reset-filters');
    
    // Таблица документов
    elements.docLoading = document.getElementById('doc-loading');
    elements.docTableContainer = document.getElementById('doc-table-container');
    elements.docTableBody = document.getElementById('doc-table-body');
    elements.docRowCount = document.getElementById('doc-row-count');
    elements.docErrorMessage = document.getElementById('doc-error-message');
    elements.docRetryBtn = document.getElementById('doc-retry-load');
    
    // Карточка сотрудника
    elements.backButton = document.getElementById('back-button');
    elements.employeeName = document.getElementById('employee-name');
    elements.employeePhone = document.getElementById('employee-phone');
    elements.employeeCitizenship = document.getElementById('employee-citizenship');
    elements.telegramLink = document.getElementById('telegram-link');
    elements.employeeLoading = document.getElementById('employee-loading');
    elements.employeeTableContainer = document.getElementById('employee-table-container');
    elements.employeeTableBody = document.getElementById('employee-table-body');
    elements.employeeError = document.getElementById('employee-error');
    elements.employeeWarning = document.getElementById('employee-warning');
    elements.employeeDocsLoading = document.getElementById('employee-docs-loading');
    elements.employeeDocuments = document.getElementById('employee-documents');
    elements.employeeProblems = document.getElementById('employee-problems');
    elements.employeeRecommendations = document.getElementById('employee-recommendations');
    elements.problemsList = document.getElementById('problems-list');
    elements.recommendationsList = document.getElementById('recommendations-list');
    
    // Статистика
    elements.statTotalEmployees = document.getElementById('stat-total-employees');
    elements.statProcessedCount = document.getElementById('stat-processed-count');
    elements.statProcessedPercent = document.getElementById('stat-processed-percent');
    elements.statMonthlyPayments = document.getElementById('stat-monthly-payments');
    elements.statUnpaid = document.getElementById('stat-unpaid');
    
    // Итоги
    elements.totalPayments = document.getElementById('total-payments');
    elements.totalAmount = document.getElementById('total-amount');
    elements.lastPaymentDate = document.getElementById('last-payment-date');
    
    // Общее
    elements.lastUpdate = document.getElementById('last-update');
    elements.exportCsvBtn = document.getElementById('export-csv');
    
    console.log('Инициализировано элементов DOM:', Object.keys(elements).length);
}

// Настройка обработчиков событий
function setupEventListeners() {
    console.log('Настройка обработчиков событий...');
    
    // Навигация
    elements.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showScreen(page);
        });
    });
    
    // Быстрые действия
    elements.quickActionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const page = btn.getAttribute('data-page');
            const action = btn.getAttribute('data-action');
            if (page) {
                showScreen(page, action);
            }
        });
    });
    
    // Фильтры выплат (проверяем существование элементов)
    if (elements.yearFilter) elements.yearFilter.addEventListener('change', applyFilters);
    if (elements.periodFilter) elements.periodFilter.addEventListener('change', applyFilters);
    if (elements.statusFilter) elements.statusFilter.addEventListener('change', applyFilters);
    if (elements.searchInput) elements.searchInput.addEventListener('input', debounce(applyFilters, 300));
    if (elements.resetFiltersBtn) elements.resetFiltersBtn.addEventListener('click', resetFilters);
    
    // Фильтры документов
    if (elements.docStatusFilter) elements.docStatusFilter.addEventListener('change', applyDocFilters);
    if (elements.docPositionFilter) elements.docPositionFilter.addEventListener('change', applyDocFilters);
    if (elements.docRestaurantFilter) elements.docRestaurantFilter.addEventListener('change', applyDocFilters);
    if (elements.docProblemsFilter) elements.docProblemsFilter.addEventListener('change', applyDocFilters);
    if (elements.docSearchInput) elements.docSearchInput.addEventListener('input', debounce(applyDocFilters, 300));
    if (elements.docResetFiltersBtn) elements.docResetFiltersBtn.addEventListener('click', resetDocFilters);
    
    if (elements.docRetryBtn) elements.docRetryBtn.addEventListener('click', loadData);
    
    // Кнопки специальных режимов (могут отсутствовать в демо-режиме)
    if (elements.lastPeriodBtn) {
        elements.lastPeriodBtn.addEventListener('click', () => showLastPeriod());
        console.log('Кнопка "Последний период" найдена');
    } else {
        console.log('Кнопка "Последний период" не найдена');
    }
    
    if (elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.addEventListener('click', () => showLastUnpaid());
        console.log('Кнопка "Неоплаченные" найдена');
    } else {
        console.log('Кнопка "Неоплаченные" не найдена');
    }
    
    // Пагинация
    if (elements.prevPageBtn) elements.prevPageBtn.addEventListener('click', () => changePage(-1));
    if (elements.nextPageBtn) elements.nextPageBtn.addEventListener('click', () => changePage(1));
    
    // Кнопки
    if (elements.retryBtn) elements.retryBtn.addEventListener('click', loadData);
    if (elements.backButton) elements.backButton.addEventListener('click', showMainScreen);
    if (elements.exportCsvBtn) elements.exportCsvBtn.addEventListener('click', exportToCSV);
    
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
    
    // Сортировка таблицы документов
    document.querySelectorAll('#documents-table th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
            const field = th.getAttribute('data-sort');
            sortDocumentTable(field);
        });
    });
    
    console.log('Обработчики событий настроены');
}

// Сортировка таблицы документов
function sortDocumentTable(field) {
    if (currentDocSort.field === field) {
        currentDocSort.direction = currentDocSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentDocSort.field = field;
        currentDocSort.direction = 'asc';
    }
    
    sortDocuments();
    renderDocumentsTable();
}

// Загрузка данных из Google Apps Script
async function loadData() {
    try {
        showLoading();
        if (elements.docLoading) elements.docLoading.classList.remove('hidden');
        
        // ⭐ ВСТАВЬТЕ ВАШ URL Google Apps Script ЗДЕСЬ ⭐
        const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyl3W8gDtZcjWuwwhLfE_EmRXGSbViv7xwjPuNn8cVoXvnlKuDz2xCBy_kMWiBmUdQ-nA/exec';
        
        console.log('Загрузка данных с:', APPS_SCRIPT_URL);
        
        const response = await fetch(APPS_SCRIPT_URL);
        
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        
        const result = await response.json();
        processLoadedData(result);
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        
        // Для тестирования используем демо-данные
        console.log('Используются демо-данные для тестирования интерфейса');
        allPayments = generateTestData();
        allDocuments = generateTestDocuments();
        updatePeriodsAndStatuses(allPayments);
        lastPeriod = getLastPeriod(allPayments);
        populateFilters(allPayments);
        updateDocumentFilters();
        applyFilters();
        applyDocFilters();
        mergeDataByPhone();
        updateStatistics();
        showWarning('Используются демо-данные. Настройте подключение к Google Таблице.');
    }
}

// Функция для обработки загруженных данных
function processLoadedData(result) {
    console.log('Получены данные:', result);
    
    // ДИАГНОСТИКА: проверяем что пришло от сервера
    console.log('Есть поле documents?', !!result.documents);
    console.log('Количество документов:', result.documents ? result.documents.length : 0);
    if (!result.documents) {
        console.warn('⚠️ Документы не загружены. Проверьте Google Apps Script!');
    }
    
    // Обработка выплат
        if (result.success && result.data) {
            // Преобразуем данные в нужный формат
            allPayments = result.data.map((item, index) => ({
                id: index + 1,
                year: item.year || new Date().getFullYear(),
                period: item.period || '',
                employee: item.employee || '',
                phone: normalizePhone(String(item.phone || '')),
                amount: parseFloat(item.amount) || 0,
                status: item.status || '',
                comment: item.comment || '',
                formattedAmount: formatCurrency(parseFloat(item.amount) || 0)
            }));
            
            console.log('Обработано выплат:', allPayments.length);
            
            // ⭐ ДИНАМИЧЕСКОЕ ОПРЕДЕЛЕНИЕ ПЕРИОДОВ И СТАТУСОВ
            updatePeriodsAndStatuses(allPayments);
            
            // Определяем последний период
            lastPeriod = getLastPeriod(allPayments);
            console.log('Последний период:', lastPeriod);
            
            // Заполняем фильтры
            populateFilters(allPayments);
            
            // Применяем фильтры и отображаем данные
            applyFilters();
            
            hideError();
        }
        
        // Обработка документов
        if (result.success && result.documents) {
            allDocuments = result.documents.map((item, index) => ({
                id: index + 1,
                collected: item.collected || '',
                inProcess: item.inProcess || '',
                project: item.project || '',
                city: item.city || '',
                position: item.position || '',
                restaurant: item.restaurant || '',
                comment: item.comment || '',
                vacation: item.vacation || '',
                passportIssueDate: item.passportIssueDate || '',
                birthDate: item.birthDate || '',
                passportData: item.passportData || '',
                employee: item.employee || '',
                phone: normalizePhone(String(item.phone || '')),
                citizenship: item.citizenship || '',
                documentsLink: item.documentsLink || '',
                problems: item.problems || '',
                registrationEndDate: item.registrationEndDate || '',
                patentIssueDate: item.patentIssueDate || '',
                contractDate: item.contractDate || '',
                contractLink: item.contractLink || '',
                dismissedDate: item.dismissedDate || '',
                documentStatus: getDocumentStatus(item)
            }));
            
            console.log('Обработано документов:', allDocuments.length);
            
            // Обновляем фильтры документов
            updateDocumentFilters();
            
            // Применяем фильтры документов
            applyDocFilters();
            
            if (elements.docLoading) elements.docLoading.classList.add('hidden');
            if (elements.docTableContainer) elements.docTableContainer.classList.remove('hidden');
            if (elements.docErrorMessage) elements.docErrorMessage.classList.add('hidden');
        } else {
            // Если документы не пришли
            console.warn('Документы не загружены. Возможные причины:');
            console.warn('1. Лист "Документы" не существует в таблице');
            console.warn('2. Google Apps Script не обновлён');
            console.warn('3. Лист "Документы" пустой');
            
            allDocuments = []; // Инициализируем пустым массивом
            
            if (elements.docLoading) elements.docLoading.classList.add('hidden');
            if (elements.docTableContainer) {
                elements.docTableContainer.classList.remove('hidden');
                // Показываем сообщение что документы не загружены
                if (elements.docTableBody) {
                    elements.docTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" style="text-align: center; padding: 40px;">
                                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: var(--warning); margin-bottom: 15px; display: block;"></i>
                                <p><strong>Документы не загружены</strong></p>
                                <p style="font-size: 13px; color: var(--gray-600); margin-top: 10px;">
                                    Проверьте:<br>
                                    • Существует ли лист "Документы" в Google Таблице<br>
                                    • Обновлён ли код Google Apps Script<br>
                                    • Есть ли данные в листе "Документы"
                                </p>
                            </td>
                        </tr>
                    `;
                }
            }
            if (elements.docErrorMessage) elements.docErrorMessage.classList.add('hidden');
        }
        
        // Слияние данных по телефону
        mergeDataByPhone();
        
        // Обновляем статистику
        updateStatistics();
        
        // Обновляем время последнего обновления
        updateLastUpdateTime();
}


// Нормализация телефона для сравнения
function normalizePhone(phone) {
    if (!phone) return '';
    // Убираем все нецифровые символы
    const cleaned = phone.replace(/\D/g, '');
    // Если начинается с 8, заменяем на 7
    if (cleaned.length === 11 && cleaned.startsWith('8')) {
        return '7' + cleaned.substring(1);
    }
    return cleaned;
}

// Слияние данных по телефону
function mergeDataByPhone() {
    mergedData = {};
    
    // Добавляем выплаты
    allPayments.forEach(payment => {
        const phone = normalizePhone(payment.phone);
        if (!mergedData[phone]) {
            mergedData[phone] = {
                phone: phone,
                payments: [],
                documents: null
            };
        }
        mergedData[phone].payments.push(payment);
    });
    
    // Добавляем документы
    allDocuments.forEach(doc => {
        const phone = normalizePhone(doc.phone);
        if (!mergedData[phone]) {
            mergedData[phone] = {
                phone: phone,
                payments: [],
                documents: null
            };
        }
        mergedData[phone].documents = doc;
    });
    
    console.log('Объединено записей:', Object.keys(mergedData).length);
}

// Определение статуса документов
function getDocumentStatus(doc) {
    // Проверяем статус "Оформлен" в первой колонке
    const isProcessed = (doc.collected && doc.collected.toLowerCase().includes('оформлен')) || 
                       (doc.inProcess && doc.inProcess.toLowerCase().includes('оформлен'));
    
    if (isProcessed) {
        return 'processed';
    }
    
    const requiredDocs = {
        passport: !!doc.passportData,
        registration: !!doc.registrationEndDate,
        patent: !!doc.patentIssueDate,
        contract: !!doc.contractDate
    };
    
    const hasAll = Object.values(requiredDocs).every(v => v);
    const hasNone = Object.values(requiredDocs).every(v => !v);
    
    if (hasAll) return 'processed';
    if (hasNone) return 'not-processed';
    return 'partial';
}

// Обновление статистики
function updateStatistics() {
    // Всего сотрудников (уникальные телефоны в документах или выплатах)
    const uniquePhones = new Set([
        ...allPayments.map(p => p.phone),
        ...allDocuments.map(d => d.phone)
    ]);
    if (elements.statTotalEmployees) {
        elements.statTotalEmployees.textContent = uniquePhones.size;
    }
    
    // Оформлено
    const processed = allDocuments.filter(d => d.documentStatus === 'processed').length;
    const totalWithDocs = allDocuments.length;
    if (elements.statProcessedCount) {
        elements.statProcessedCount.textContent = processed;
    }
    if (elements.statProcessedPercent && totalWithDocs > 0) {
        const percent = Math.round((processed / totalWithDocs) * 100);
        elements.statProcessedPercent.textContent = `(${percent}%)`;
    }
    
    // Выплаты за месяц
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const monthlyPayments = allPayments
        .filter(p => {
            // Простая проверка - если период содержит текущий месяц в последнем периоде
            return p.year === currentYear;
        })
        .reduce((sum, p) => sum + p.amount, 0);
    if (elements.statMonthlyPayments) {
        elements.statMonthlyPayments.textContent = formatCurrency(monthlyPayments) + ' ₽';
    }
    
    // Неоплаченные
    const unpaidStatuses = allStatuses.filter(status => 
        !status.toLowerCase().includes('оплатили') && 
        !status.toLowerCase().includes('оплачено')
    );
    const unpaid = allPayments.filter(p => 
        lastPeriod && p.period === lastPeriod && unpaidStatuses.includes(p.status)
    ).length;
    if (elements.statUnpaid) {
        elements.statUnpaid.textContent = unpaid;
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
    
    console.log('Найдено периодов:', allPeriods.length);
    console.log('Найдено статусов:', allStatuses.length);
    
    // Сохраняем в localStorage для будущих сессий
    try {
        localStorage.setItem('payment_periods', JSON.stringify(allPeriods));
        localStorage.setItem('payment_statuses', JSON.stringify(allStatuses));
    } catch (e) {
        console.log('Не удалось сохранить в localStorage:', e);
    }
}

// Заполнение фильтров
function populateFilters(payments) {
    console.log('Заполнение фильтров...');
    
    // Годы (динамически из данных)
    const years = [...new Set(payments.map(p => p.year))].sort((a, b) => b - a);
    if (elements.yearFilter) {
        elements.yearFilter.innerHTML = '<option value="">Все годы</option>';
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            elements.yearFilter.appendChild(option);
        });
    }
    
    // Периоды (динамически из allPeriods)
    if (elements.periodFilter) {
        elements.periodFilter.innerHTML = '<option value="">Все периоды</option>';
        allPeriods.forEach(period => {
            const option = document.createElement('option');
            option.value = period;
            option.textContent = period;
            elements.periodFilter.appendChild(option);
        });
    }
    
    // Статусы (динамически из allStatuses)
    if (elements.statusFilter) {
        elements.statusFilter.innerHTML = '<option value="">Все статусы</option>';
        allStatuses.forEach(status => {
            const option = document.createElement('option');
            option.value = status;
            option.textContent = status;
            elements.statusFilter.appendChild(option);
        });
    }
    
    console.log('Фильтры заполнены');
}

// Применение фильтров
function applyFilters() {
    console.log('Применение фильтров...');
    
    // Сбрасываем специальные режимы
    exitMode();
    
    // Применяем фильтры
    let filtered = [...allPayments];
    
    // Фильтр по году
    const selectedYear = elements.yearFilter ? elements.yearFilter.value : '';
    if (selectedYear) {
        filtered = filtered.filter(p => p.year == selectedYear);
    }
    
    // Фильтр по периоду
    const selectedPeriod = elements.periodFilter ? elements.periodFilter.value : '';
    if (selectedPeriod) {
        filtered = filtered.filter(p => p.period === selectedPeriod);
        if (elements.periodInfo) {
            elements.periodInfo.textContent = `Период: ${selectedPeriod}`;
        }
    } else {
        if (elements.periodInfo) {
            elements.periodInfo.textContent = '';
        }
    }
    
    // Фильтр по статусу
    const selectedStatus = elements.statusFilter ? elements.statusFilter.value : '';
    if (selectedStatus) {
        filtered = filtered.filter(p => p.status === selectedStatus);
    }
    
    // Фильтр по поиску
    const searchTerm = elements.searchInput ? elements.searchInput.value.toLowerCase() : '';
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
    
    console.log('Фильтры применены, записей:', filteredPayments.length);
}

// Режим: Последний период (все выплаты)
function showLastPeriod() {
    console.log('Показать последний период');
    
    if (!lastPeriod) {
        console.log('Нет данных о последнем периоде');
        return;
    }
    
    currentMode = 'last-period';
    
    // Сбрасываем фильтры
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    // Показываем все записи последнего периода
    filteredPayments = allPayments.filter(p => p.period === lastPeriod);
    
    // Показываем индикатор режима
    showModeIndicator(`Показаны <strong>все выплаты</strong> за последний период: <strong>${lastPeriod}</strong>`);
    
    // Обновляем интерфейс
    currentPage = 1;
    sortPayments();
    renderTable();
    updatePagination();
    
    console.log('Показано записей последнего периода:', filteredPayments.length);
}

// Режим: Неоплаченные в последнем периоде
function showLastUnpaid() {
    console.log('Показать неоплаченные последнего периода');
    
    if (!lastPeriod) {
        console.log('Нет данных о последнем периоде');
        return;
    }
    
    currentMode = 'last-unpaid';
    
    // Сбрасываем фильтры
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    // Показываем только НЕОПЛАЧЕННЫЕ записи последнего периода
    const unpaidStatuses = allStatuses.filter(status => 
        !status.toLowerCase().includes('оплатили') && 
        !status.toLowerCase().includes('оплачено')
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
    
    console.log('Показано неоплаченных записей:', filteredPayments.length);
}

// Выход из специального режима
function exitMode() {
    if (!currentMode) return;
    
    currentMode = null;
    if (elements.modeIndicator) {
        elements.modeIndicator.classList.add('hidden');
    }
    if (elements.lastPeriodBtn) {
        elements.lastPeriodBtn.classList.remove('active');
    }
    if (elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.classList.remove('active');
    }
}

// Показать индикатор режима
function showModeIndicator(message) {
    if (!elements.modeIndicator || !elements.modeMessage) return;
    
    elements.modeMessage.innerHTML = message;
    elements.modeIndicator.classList.remove('hidden');
    
    // Активируем соответствующую кнопку
    if (currentMode === 'last-period' && elements.lastPeriodBtn) {
        elements.lastPeriodBtn.classList.add('active');
        if (elements.lastUnpaidBtn) elements.lastUnpaidBtn.classList.remove('active');
    } else if (currentMode === 'last-unpaid' && elements.lastUnpaidBtn) {
        elements.lastUnpaidBtn.classList.add('active');
        if (elements.lastPeriodBtn) elements.lastPeriodBtn.classList.remove('active');
    }
}

// Сброс фильтров
function resetFilters() {
    console.log('Сброс фильтров');
    
    if (elements.yearFilter) elements.yearFilter.value = '';
    if (elements.periodFilter) elements.periodFilter.value = '';
    if (elements.statusFilter) elements.statusFilter.value = '';
    if (elements.searchInput) elements.searchInput.value = '';
    
    exitMode();
    applyFilters();
}

// Определение последнего периода
function getLastPeriod(payments) {
    if (!payments || payments.length === 0) return '';
    
    // Используем предварительно вычисленные все периоды
    return allPeriods.length > 0 ? allPeriods[0] : '';
}

// Навигация между экранами
function showScreen(screenName, action = null) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Обновляем навигацию
    elements.navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === screenName) {
            link.classList.add('active');
        }
    });
    
    // Показываем нужный экран
    currentScreen = screenName;
    
    switch(screenName) {
        case 'home':
            if (elements.homeScreen) elements.homeScreen.classList.remove('hidden');
            break;
        case 'payments':
            if (elements.paymentsScreen) elements.paymentsScreen.classList.remove('hidden');
            if (action === 'last-payments') {
                setTimeout(() => showLastPeriod(), 100);
            }
            break;
        case 'documents':
            if (elements.documentsScreen) elements.documentsScreen.classList.remove('hidden');
            if (action === 'unprocessed') {
                setTimeout(() => {
                    if (elements.docStatusFilter) {
                        elements.docStatusFilter.value = 'not-processed';
                        applyDocFilters();
                    }
                }, 100);
            }
            break;
        case 'dashboard':
            if (elements.dashboardScreen) elements.dashboardScreen.classList.remove('hidden');
            break;
        case 'sos':
            if (elements.sosScreen) elements.sosScreen.classList.remove('hidden');
            break;
        case 'employee':
            if (elements.employeeScreen) {
                elements.employeeScreen.classList.remove('hidden');
                console.log('Экран сотрудника отображен');
            } else {
                console.error('Элемент employeeScreen не найден!');
            }
            break;
    }
    
    console.log('Переключение на экран:', screenName);
}

// Отображение таблицы
function renderTable() {
    console.log('Отрисовка таблицы...');
    
    if (!elements.tableBody) {
        console.error('Элемент tableBody не найден');
        return;
    }
    
    if (filteredPayments.length === 0) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                    <p>Нет данных, соответствующих фильтрам</p>
                </td>
            </tr>
        `;
        if (elements.rowCount) {
            elements.rowCount.textContent = '0';
        }
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
        
        // Получаем данные о документах (используем нормализованный телефон)
        const normalizedPhone = normalizePhone(payment.phone);
        const docData = mergedData[normalizedPhone];
        const docStatus = docData?.documents?.documentStatus || 'unknown';
        const docStatusIndicator = getDocumentStatusIndicator(docStatus);
        
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
                <td>${docStatusIndicator}</td>
                <td>${payment.comment || '-'}</td>
            </tr>
        `;
    });
    
    elements.tableBody.innerHTML = tableHTML;
    if (elements.rowCount) {
        elements.rowCount.textContent = filteredPayments.length;
    }
    
    // Назначаем обработчики для ссылок на сотрудников
    document.querySelectorAll('.employee-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const paymentId = parseInt(link.getAttribute('data-id'));
            showEmployeeDetails(paymentId);
        });
    });
    
    console.log('Таблица отрисована, записей:', filteredPayments.length);
}

// Индикатор статуса документов
function getDocumentStatusIndicator(status) {
    switch(status) {
        case 'processed':
            return '<span class="doc-status-indicator status-ok"><i class="fas fa-check-circle"></i> Оформлен</span>';
        case 'partial':
            return '<span class="doc-status-indicator status-partial"><i class="fas fa-exclamation-circle"></i> Частично</span>';
        case 'not-processed':
            return '<span class="doc-status-indicator status-error"><i class="fas fa-times-circle"></i> Не оформлен</span>';
        default:
            return '<span class="doc-status-indicator status-partial"><i class="fas fa-question-circle"></i> Нет данных</span>';
    }
}

// Обновление фильтров документов
function updateDocumentFilters() {
    // Должности
    const positions = [...new Set(allDocuments.map(d => d.position).filter(Boolean))].sort();
    if (elements.docPositionFilter) {
        elements.docPositionFilter.innerHTML = '<option value="">Все должности</option>';
        positions.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos;
            option.textContent = pos;
            elements.docPositionFilter.appendChild(option);
        });
    }
    
    // Рестораны
    const restaurants = [...new Set(allDocuments.map(d => d.restaurant).filter(Boolean))].sort();
    if (elements.docRestaurantFilter) {
        elements.docRestaurantFilter.innerHTML = '<option value="">Все рестораны</option>';
        restaurants.forEach(rest => {
            const option = document.createElement('option');
            option.value = rest;
            option.textContent = rest;
            elements.docRestaurantFilter.appendChild(option);
        });
    }
    
    allPositions = positions;
    allRestaurants = restaurants;
}

// Применение фильтров документов
function applyDocFilters() {
    console.log('Применение фильтров документов...');
    
    let filtered = [...allDocuments];
    
    // Фильтр по статусу
    const selectedStatus = elements.docStatusFilter ? elements.docStatusFilter.value : '';
    if (selectedStatus) {
        filtered = filtered.filter(d => d.documentStatus === selectedStatus);
    }
    
    // Фильтр по должности
    const selectedPosition = elements.docPositionFilter ? elements.docPositionFilter.value : '';
    if (selectedPosition) {
        filtered = filtered.filter(d => d.position === selectedPosition);
    }
    
    // Фильтр по ресторану
    const selectedRestaurant = elements.docRestaurantFilter ? elements.docRestaurantFilter.value : '';
    if (selectedRestaurant) {
        filtered = filtered.filter(d => d.restaurant === selectedRestaurant);
    }
    
    // Фильтр по проблемам
    const selectedProblems = elements.docProblemsFilter ? elements.docProblemsFilter.value : '';
    if (selectedProblems === 'has-problems') {
        filtered = filtered.filter(d => d.problems && d.problems.trim() !== '');
    } else if (selectedProblems === 'no-problems') {
        filtered = filtered.filter(d => !d.problems || d.problems.trim() === '');
    }
    
    // Фильтр по поиску
    const searchTerm = elements.docSearchInput ? elements.docSearchInput.value.toLowerCase() : '';
    if (searchTerm) {
        filtered = filtered.filter(d => 
            d.employee.toLowerCase().includes(searchTerm) || 
            d.phone.includes(searchTerm)
        );
    }
    
    filteredDocuments = filtered;
    currentDocPage = 1;
    
    // Сортировка
    sortDocuments();
    
    // Отображение
    renderDocumentsTable();
    
    console.log('Фильтры документов применены, записей:', filteredDocuments.length);
}

// Сброс фильтров документов
function resetDocFilters() {
    if (elements.docStatusFilter) elements.docStatusFilter.value = '';
    if (elements.docPositionFilter) elements.docPositionFilter.value = '';
    if (elements.docRestaurantFilter) elements.docRestaurantFilter.value = '';
    if (elements.docProblemsFilter) elements.docProblemsFilter.value = '';
    if (elements.docSearchInput) elements.docSearchInput.value = '';
    
    applyDocFilters();
}

// Сортировка документов
function sortDocuments() {
    filteredDocuments.sort((a, b) => {
        let valueA = a[currentDocSort.field];
        let valueB = b[currentDocSort.field];
        
        if (typeof valueA === 'string' && typeof valueB === 'string') {
            return currentDocSort.direction === 'asc'
                ? valueA.localeCompare(valueB)
                : valueB.localeCompare(valueA);
        }
        
        return currentDocSort.direction === 'asc' ? valueA - valueB : valueB - valueA;
    });
}

// Отображение таблицы документов
function renderDocumentsTable() {
    if (!elements.docTableBody) return;
    
    if (filteredDocuments.length === 0) {
        elements.docTableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 2rem; color: #bdc3c7; margin-bottom: 15px; display: block;"></i>
                    <p>Нет данных, соответствующих фильтрам</p>
                </td>
            </tr>
        `;
        if (elements.docRowCount) {
            elements.docRowCount.textContent = '0';
        }
        return;
    }
    
    let tableHTML = '';
    
    filteredDocuments.forEach(doc => {
        const statusIndicator = getDocumentStatusIndicator(doc.documentStatus);
        const problemsBadge = doc.problems ? `<span class="problems-badge" title="${doc.problems}">${doc.problems.substring(0, 30)}${doc.problems.length > 30 ? '...' : ''}</span>` : '-';
        
        tableHTML += `
            <tr class="doc-table-row" data-phone="${doc.phone}" style="cursor: pointer;">
                <td>
                    <a href="#" class="employee-link" data-phone="${doc.phone}">
                        ${doc.employee}
                    </a>
                </td>
                <td>${formatPhone(doc.phone)}</td>
                <td>${doc.position || '-'}</td>
                <td>${doc.restaurant || '-'}</td>
                <td>${statusIndicator}</td>
                <td>${problemsBadge}</td>
            </tr>
        `;
    });
    
    elements.docTableBody.innerHTML = tableHTML;
    if (elements.docRowCount) {
        elements.docRowCount.textContent = filteredDocuments.length;
    }
    
    // Назначаем обработчики для ссылок и строк на сотрудников
    document.querySelectorAll('.employee-link[data-phone]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const phone = link.getAttribute('data-phone');
            showEmployeeDetailsByPhone(phone);
        });
    });
    
    // Клик на строку также открывает карточку
    document.querySelectorAll('.doc-table-row').forEach(row => {
        row.addEventListener('click', (e) => {
            // Не открываем если кликнули на ссылку
            if (e.target.closest('.employee-link')) return;
            
            const phone = row.getAttribute('data-phone');
            showEmployeeDetailsByPhone(phone);
        });
    });
}

// Отображение деталей сотрудника
function showEmployeeDetails(paymentId) {
    console.log('Показать детали сотрудника, ID:', paymentId);
    
    // Находим платеж по ID
    const payment = allPayments.find(p => p.id === paymentId);
    if (!payment) {
        console.error('Платеж не найден:', paymentId);
        return;
    }
    
    showEmployeeDetailsByPhone(payment.phone, payment);
}

// Отображение деталей сотрудника по телефону
function showEmployeeDetailsByPhone(phone, payment = null) {
    // Нормализуем телефон для поиска
    const normalizedPhone = normalizePhone(phone);
    console.log('Поиск сотрудника по телефону:', phone, 'нормализованный:', normalizedPhone);
    
    // Находим платеж если не передан
    if (!payment) {
        payment = allPayments.find(p => normalizePhone(p.phone) === normalizedPhone);
    }
    
    // Находим документы по нормализованному телефону
    const doc = allDocuments.find(d => normalizePhone(d.phone) === normalizedPhone);
    
    if (!payment && !doc) {
        console.error('Сотрудник не найден ни в выплатах, ни в документах:', normalizedPhone);
        alert('Сотрудник не найден в документах. Возможные причины:\n• Номер телефона отличается в таблицах\n• Документы ещё не поданы\n• Сотрудник оформлен через другого оператора');
        return;
    }
    
    // Формируем объект текущего сотрудника
    currentEmployee = {
        employee: payment?.employee || doc?.employee || '',
        phone: payment?.phone || doc?.phone || phone,
        citizenship: doc?.citizenship || '',
        payment: payment || null,
        document: doc || null
    };
    
    console.log('Найден сотрудник:', currentEmployee);
    
    // Находим все платежи этого сотрудника по нормализованному телефону
    currentEmployeePayments = allPayments.filter(p => normalizePhone(p.phone) === normalizedPhone);
    
    // Заполняем информацию о сотруднике
    if (elements.employeeName) {
        elements.employeeName.textContent = currentEmployee.employee;
    }
    if (elements.employeePhone) {
        elements.employeePhone.textContent = `📱 ${formatPhone(currentEmployee.phone)}`;
    }
    if (elements.employeeCitizenship && currentEmployee.citizenship) {
        elements.employeeCitizenship.textContent = `🌍 ${currentEmployee.citizenship}`;
    }
    
    // Настраиваем Telegram ссылку
    if (elements.telegramLink) {
        const phoneNumber = formatPhoneForTelegram(currentEmployee.phone);
        const telegramUrl = `${CONFIG.telegramUrl}+${phoneNumber}`;
        elements.telegramLink.href = telegramUrl;
        elements.telegramLink.title = `Написать ${currentEmployee.employee} в Telegram`;
    }
    
    // Переключаем экраны ПЕРЕД отображением данных
    showScreen('employee');
    
    // Отображаем документы
    renderEmployeeDocuments();
    
    // Отображаем историю выплат
    renderEmployeeTable();
    
    console.log('Загружено выплат сотрудника:', currentEmployeePayments.length);
    console.log('Карточка сотрудника открыта:', currentEmployee.employee);
}

// Отображение таблицы выплат сотрудника
function renderEmployeeTable() {
    if (!elements.employeeTableBody) return;
    
    if (currentEmployeePayments.length === 0) {
        elements.employeeTableBody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; padding: 40px;">
                    Нет данных о выплатах
                </td>
            </tr>
        `;
        if (elements.totalPayments) elements.totalPayments.textContent = '0';
        if (elements.totalAmount) elements.totalAmount.textContent = '0';
        if (elements.lastPaymentDate) elements.lastPaymentDate.textContent = '-';
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
    if (elements.totalPayments) elements.totalPayments.textContent = currentEmployeePayments.length;
    if (elements.totalAmount) elements.totalAmount.textContent = formatCurrency(totalAmount);
    if (elements.lastPaymentDate) elements.lastPaymentDate.textContent = lastPayment;
    
    // Показываем таблицу
    if (elements.employeeLoading) elements.employeeLoading.classList.add('hidden');
    if (elements.employeeTableContainer) elements.employeeTableContainer.classList.remove('hidden');
    if (elements.employeeError) elements.employeeError.classList.add('hidden');
}

// Вспомогательные функции
function getStatusClass(status) {
    if (!status) return 'status-other';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('оплатили') || statusLower.includes('оплачено')) {
        return 'status-paid';
    } else if (statusLower.includes('не') || statusLower.includes('отказ')) {
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
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
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
    
    if (elements.pageInfo) {
        elements.pageInfo.textContent = `Страница ${currentPage} из ${totalPages}`;
    }
    if (elements.prevPageBtn) {
        elements.prevPageBtn.disabled = currentPage <= 1;
    }
    if (elements.nextPageBtn) {
        elements.nextPageBtn.disabled = currentPage >= totalPages;
    }
    if (elements.prevPageBtn && elements.prevPageBtn.parentElement) {
        elements.prevPageBtn.parentElement.classList.toggle('hidden', totalPages <= 1);
    }
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

// Отображение документов сотрудника
function renderEmployeeDocuments() {
    if (!currentEmployee) return;
    
    // Показываем загрузку
    if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.remove('hidden');
    if (elements.employeeDocuments) elements.employeeDocuments.classList.add('hidden');
    
    setTimeout(() => {
        const doc = currentEmployee.document;
        
        if (!doc) {
            // Нет данных о документах
            if (elements.employeeWarning) {
                const warningReason = document.getElementById('warning-reason');
                if (warningReason) {
                    warningReason.innerHTML = `
                        <strong>Возможные причины:</strong><br>
                        1. Документы не поданы<br>
                        2. Неверный номер телефона в таблице<br>
                        3. Оформление через другого оператора<br><br>
                        <strong>Действия:</strong><br>
                        1. Проверьте номер телефона в таблице документов<br>
                        2. Если не подавали — подайте документы срочно<br>
                        3. Свяжитесь с оператором
                    `;
                }
                elements.employeeWarning.classList.remove('hidden');
            }
            
            if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.add('hidden');
            return;
        }
        
        // Скрываем предупреждение если документы есть
        if (elements.employeeWarning) elements.employeeWarning.classList.add('hidden');
        
        // Проверяем статус "Оформлен" в первой колонке (collected или inProcess)
        const isProcessed = (doc.collected && doc.collected.toLowerCase().includes('оформлен')) || 
                           (doc.inProcess && doc.inProcess.toLowerCase().includes('оформлен'));
        
        // Формируем список документов
        let documentsHTML = '';
        
        // Паспорт
        documentsHTML += `
            <div class="document-item ${doc.passportData ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.passportData ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Паспорт</div>
                    <div class="document-value">${doc.passportData || 'Отсутствует'}</div>
                    ${doc.passportIssueDate ? `<small style="color: var(--gray-600);">Выдан: ${doc.passportIssueDate}</small>` : ''}
                </div>
            </div>
        `;
        
        // Дата рождения
        if (doc.birthDate) {
            documentsHTML += `
                <div class="document-item status-ok">
                    <div class="document-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-label">Дата рождения</div>
                        <div class="document-value">${doc.birthDate}</div>
                    </div>
                </div>
            `;
        }
        
        // Регистрация
        documentsHTML += `
            <div class="document-item ${doc.registrationEndDate ? 'status-warning' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.registrationEndDate ? 'exclamation-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Регистрация</div>
                    <div class="document-value">${doc.registrationEndDate ? `Истекает: ${doc.registrationEndDate}` : 'Отсутствует'}</div>
                </div>
            </div>
        `;
        
        // Патент
        documentsHTML += `
            <div class="document-item ${doc.patentIssueDate ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.patentIssueDate ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Патент</div>
                    <div class="document-value">${doc.patentIssueDate ? `Выдан: ${doc.patentIssueDate}` : 'Отсутствует'}</div>
                </div>
            </div>
        `;
        
        // Договор
        documentsHTML += `
            <div class="document-item ${doc.contractDate ? 'status-ok' : 'status-error'}">
                <div class="document-icon">
                    <i class="fas fa-${doc.contractDate ? 'check-circle' : 'times-circle'}"></i>
                </div>
                <div class="document-info">
                    <div class="document-label">Договор</div>
                    <div class="document-value">${doc.contractDate ? `Заключён: ${doc.contractDate}` : 'Отсутствует'}</div>
                    ${doc.contractLink ? `<small><a href="${doc.contractLink}" target="_blank">Ссылка на договор</a></small>` : ''}
                </div>
            </div>
        `;
        
        // Ссылка на полный пакет
        if (doc.documentsLink) {
            documentsHTML += `
                <div class="document-item status-ok" style="grid-column: 1 / -1;">
                    <div class="document-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <div class="document-info">
                        <div class="document-label">Полный пакет документов</div>
                        <div class="document-value">
                            <a href="${doc.documentsLink}" target="_blank">${doc.documentsLink}</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const documentsGrid = elements.employeeDocuments?.querySelector('.documents-grid');
        if (documentsGrid) {
            documentsGrid.innerHTML = documentsHTML;
        }
        
        // Проблемы - показываем только если статус НЕ "Оформлен"
        if (!isProcessed && doc.problems && doc.problems.trim()) {
            const problems = doc.problems.split(',').map(p => p.trim()).filter(Boolean);
            if (elements.problemsList) {
                elements.problemsList.innerHTML = problems.map(p => `<li>${p}</li>`).join('');
            }
            if (elements.employeeProblems) {
                elements.employeeProblems.classList.remove('hidden');
            }
        } else {
            if (elements.employeeProblems) {
                elements.employeeProblems.classList.add('hidden');
            }
        }
        
        // Рекомендации
        const recommendations = generateRecommendations(doc);
        if (recommendations.length > 0) {
            if (elements.recommendationsList) {
                elements.recommendationsList.innerHTML = recommendations.map(r => `<li>${r}</li>`).join('');
            }
            if (elements.employeeRecommendations) {
                elements.employeeRecommendations.classList.remove('hidden');
            }
        } else {
            if (elements.employeeRecommendations) {
                elements.employeeRecommendations.classList.add('hidden');
            }
        }
        
        // Показываем документы
        if (elements.employeeDocsLoading) elements.employeeDocsLoading.classList.add('hidden');
        if (elements.employeeDocuments) elements.employeeDocuments.classList.remove('hidden');
    }, 300);
}

// Генерация рекомендаций
function generateRecommendations(doc) {
    // Проверяем статус "Оформлен" - если оформлен, не показываем рекомендации
    const isProcessed = (doc.collected && doc.collected.toLowerCase().includes('оформлен')) || 
                       (doc.inProcess && doc.inProcess.toLowerCase().includes('оформлен'));
    
    if (isProcessed) {
        return []; // Если оформлен - нет рекомендаций
    }
    
    const recommendations = [];
    
    if (!doc.passportData) {
        recommendations.push('Запросить паспорт у сотрудника');
    }
    
    if (!doc.registrationEndDate) {
        recommendations.push('Проверить наличие регистрации');
    }
    
    if (!doc.patentIssueDate) {
        recommendations.push('Запросить патент у сотрудника');
    }
    
    if (!doc.contractDate) {
        recommendations.push('Заключить договор');
    }
    
    if (doc.registrationEndDate) {
        const endDate = new Date(doc.registrationEndDate.split('.').reverse().join('-'));
        const now = new Date();
        const daysUntilExpiry = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        if (daysUntilExpiry < 30 && daysUntilExpiry > 0) {
            recommendations.push(`Регистрация истекает через ${daysUntilExpiry} дней. Необходимо продление`);
        }
    }
    
    if (doc.problems && doc.problems.toLowerCase().includes('качество')) {
        recommendations.push('Перезагрузить скан паспорта с лучшим качеством');
    }
    
    return recommendations;
}

function showMainScreen() {
    showScreen('home');
}

function showLoading() {
    if (elements.loading) elements.loading.classList.remove('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.add('hidden');
    if (elements.errorMessage) elements.errorMessage.classList.add('hidden');
}

function hideLoading() {
    if (elements.loading) elements.loading.classList.add('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.remove('hidden');
}

function showError() {
    if (elements.loading) elements.loading.classList.add('hidden');
    if (elements.tableContainer) elements.tableContainer.classList.add('hidden');
    if (elements.errorMessage) elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    if (elements.errorMessage) elements.errorMessage.classList.add('hidden');
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
    
    const container = document.querySelector('.container');
    if (container) {
        container.prepend(warningDiv);
    }
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
    if (elements.lastUpdate) {
        elements.lastUpdate.textContent = `Последнее обновление: ${formattedTime}`;
    }
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

// Генерация тестовых данных документов (для демонстрации)
function generateTestDocuments() {
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427", citizenship: "Кыргызстан", position: "Кассир", restaurant: "Часовая 11 стр 2" },
        { name: "Курбанова Саломат Амиркуловна", phone: "79252580102", citizenship: "Узбекистан", position: "Официант", restaurant: "Ресторан 1" },
        { name: "Дусматов Равшан Алишерович", phone: "79254088185", citizenship: "Таджикистан", position: "Повар", restaurant: "Ресторан 2" },
    ];
    
    const testDocs = [];
    
    employees.forEach((emp, index) => {
        const hasAllDocs = index === 0;
        const hasPartial = index === 1;
        
        testDocs.push({
            id: index + 1,
            collected: hasAllDocs ? 'Да' : 'Нет',
            inProcess: hasPartial ? 'Да' : 'Нет',
            project: 'Проект Чайхана',
            city: 'Москва',
            position: emp.position,
            restaurant: emp.restaurant,
            comment: hasPartial ? 'В РКЛ' : '',
            vacation: '',
            passportIssueDate: hasAllDocs ? '01.04.2024' : '',
            birthDate: '16.07.2006',
            passportData: hasAllDocs ? 'PE1336294' : '',
            employee: emp.name,
            phone: normalizePhone(emp.phone),
            citizenship: emp.citizenship,
            documentsLink: hasAllDocs ? 'https://drive.google.com/...' : '',
            problems: index === 2 ? 'Отсутствует патент, Качество скана паспорта низкое' : '',
            registrationEndDate: hasAllDocs ? '15.01.2025' : '',
            patentIssueDate: hasAllDocs ? '10.10.2024' : '',
            contractDate: hasAllDocs ? '10.11.2024' : '',
            contractLink: hasAllDocs ? 'https://drive.google.com/contract...' : '',
            dismissedDate: '',
            documentStatus: hasAllDocs ? 'processed' : (hasPartial ? 'partial' : 'not-processed')
        });
    });
    
    return testDocs;
}

// Генерация тестовых данных (для демонстрации)
function generateTestData() {
    const periods = ['01.12-15.12', '16.11-30.11', '06.11-15.11', '16.10-5.11'];
    const statuses = ['Оплатили', 'оплатили в QUGO', 'Не платим', 'В обработке', 'Ожидает подтверждения'];
    
    const testData = [];
    
    const employees = [
        { name: "Нурланбеков Омурлан Нурланбекович", phone: "79299185427" },
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
