// 전역 변수
let tables = [];
let currentTableId = null;
let timerInterval = null;
let favoriteTables = new Set(); // 즐겨찾기 테이블 ID 저장
let businessStats = {
    totalTables: 0,
    totalRevenue: 0,
    menuStats: {}
};

// 메뉴 데이터
const MENU_ITEMS = [
    { id: 'kimchi-pancake', name: '김치전', price: 8000 },
    { id: 'pork-stirfry', name: '제육볶음', price: 12000 },
    { id: 'pork-belly', name: '대패숙주', price: 15000 },
    { id: 'yellow-peach', name: '황도', price: 5000 },
    { id: 'soju', name: '소주', price: 3000 },
    { id: 'beer', name: '맥주', price: 4000 }
];

// 테이블 상태 상수
const TABLE_STATES = {
    AVAILABLE: 'available',
    IN_USE: 'in-use',
    EXPIRED: 'expired'
};

// 주문 상태 상수
const ORDER_STATES = {
    PENDING: 'pending',
    SERVED: 'served',
    CANCELLED: 'cancelled'
};

// 초기화
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    startTimer();
});

// 앱 초기화
function initializeApp() {
    for (let i = 1; i <=70; i++) {
        tables.push({
            id: i,
            state: TABLE_STATES.AVAILABLE,
            remainingTime: 0,
            orders: [],
            startTime: null,
            totalRevenue: 0
        });
    }
    renderTables();
    updateOrderSummary();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    setupModalEvents();
    setupInsightsEvents();
}

// 모달 이벤트 설정
function setupModalEvents() {
    // 합석 모달
    document.getElementById('combineCancel').addEventListener('click', () => closeModal('combineModal'));
    document.getElementById('combineConfirm').addEventListener('click', () => confirmCombine());

    // 자리이동 모달
    document.getElementById('moveCancel').addEventListener('click', () => closeModal('moveModal'));
    document.getElementById('moveConfirm').addEventListener('click', () => confirmMove());

    // 주문 현황 모달
    document.getElementById('orderStatusClose').addEventListener('click', () => closeModal('orderStatusModal'));

    // 메뉴 추가 모달
    document.getElementById('addMenuCancel').addEventListener('click', () => closeModal('addMenuModal'));
    document.getElementById('addMenuConfirm').addEventListener('click', () => confirmAddMenu());

    // 수량 조절
    document.getElementById('quantityDecrease').addEventListener('click', () => adjustQuantity(-1));
    document.getElementById('quantityIncrease').addEventListener('click', () => adjustQuantity(1));

    // 인사이트 모달
    document.getElementById('insightsClose').addEventListener('click', () => closeModal('insightsModal'));
    document.getElementById('endBusiness').addEventListener('click', () => endBusiness());
}

// 인사이트 이벤트 설정
function setupInsightsEvents() {
    document.getElementById('insightsBtn').addEventListener('click', () => {
        openModal('insightsModal');
        document.getElementById('passwordSection').style.display = 'block';
        document.getElementById('insightsContent').style.display = 'none';
    });

    document.getElementById('passwordSubmit').addEventListener('click', () => {
        const password = document.getElementById('passwordInput').value;
        if (password === 'admin') {
            document.getElementById('passwordSection').style.display = 'none';
            document.getElementById('insightsContent').style.display = 'block';
            updateInsights();
        } else {
            alert('잘못된 패스워드입니다.');
        }
    });
}

// 테이블 렌더링
// 테이블 카드 생성 시 총액 재계산
function renderTables() {
    const tablesGrid = document.getElementById('tablesGrid');
    tablesGrid.innerHTML = '';

    tables.forEach(table => {
        // ✅ 총액 다시 계산 (취소된 주문은 0원 처리)
        table.totalRevenue = table.orders.reduce((sum, order) => {
            const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
            if (order.state === ORDER_STATES.CANCELLED) return sum; // 0원 처리
            return sum + (menuItem.price * order.quantity);
        }, 0);

        const tableCard = createTableCard(table);
        tablesGrid.appendChild(tableCard);
    });

    setupTableEventListeners();
}


// 테이블 이벤트 리스너 설정
function setupTableEventListeners() {
    document.querySelectorAll('.enter-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); enterTable(+btn.dataset.tableId); })
    );
    document.querySelectorAll('.exit-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); exitTable(+btn.dataset.tableId); })
    );
    document.querySelectorAll('.combine-btn').forEach(btn => {
        //console.log("합석 버튼 발견", btn);   // ✅ 버튼이 탐색되는지 확인
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            //console.log("합석 버튼 클릭됨");   // ✅ 클릭시 로그 확인
            const tableId = parseInt(this.dataset.tableId);
            showCombineModal(tableId);
        });
    });

    document.querySelectorAll('.move-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); showMoveModal(+btn.dataset.tableId); })
    );
    document.querySelectorAll('.time-decrease-btn, .time-increase-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); adjustTime(+btn.dataset.tableId, +btn.dataset.minutes); })
    );
    document.querySelectorAll('.order-status-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); showOrderStatus(+btn.dataset.tableId); })
    );
    document.querySelectorAll('.add-menu-btn').forEach(btn =>
        btn.addEventListener('click', e => { e.stopPropagation(); showAddMenu(+btn.dataset.tableId); })
    );
    document.querySelectorAll('.star-icon').forEach(star =>
        star.addEventListener('click', e => { e.stopPropagation(); toggleFavorite(+star.dataset.tableId); })
    );
}

// 테이블 카드 생성
function createTableCard(table) {
    const card = document.createElement('div');
    const isFavorite = favoriteTables.has(table.id);
    card.className = `table-card ${table.state} ${isFavorite ? 'favorite' : ''}`;
    card.id = `table-${table.id}`;

    let content = `
        <div class="table-header">
            <div class="table-title">
                <span class="star-icon ${isFavorite ? 'favorite' : ''}" data-table-id="${table.id}">★</span>
                테이블 ${table.id}
            </div>
            <div class="action-buttons">
                ${getActionButtons(table)}
            </div>
        </div>
    `;

    if (table.state === TABLE_STATES.AVAILABLE) {
        content += `
            <div class="status-indicator">
                <div class="status-dot ${table.state}"></div>
                <span class="status-text">${getStatusText(table)}</span>
            </div>
        `;
    }

    if (table.state === TABLE_STATES.IN_USE || table.state === TABLE_STATES.EXPIRED) {
        const disabled = table.state === TABLE_STATES.EXPIRED ? 'disabled' : '';
        content += `
            <div class="remaining-time-display">
                <div class="status-dot ${table.state}"></div>
                <span class="remaining-time-text">${table.remainingTime}분</span>
            </div>
            <div class="time-controls">
                <button class="btn btn-sm time-decrease-btn" data-table-id="${table.id}" data-minutes="-60" ${disabled}>-60분</button>
                <button class="btn btn-sm time-increase-btn" data-table-id="${table.id}" data-minutes="60" ${disabled}>+60분</button>
            </div>
            <div class="pending-orders">
                <div class="pending-orders-scroll" id="pending-orders-${table.id}">
                    ${getPendingOrders(table)}
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-sm btn-primary order-status-btn" data-table-id="${table.id}" ${disabled}>주문 현황</button>
                <button class="btn btn-sm btn-success add-menu-btn" data-table-id="${table.id}" ${disabled}>주문 추가</button>
            </div>
        `;
    }

    card.innerHTML = content;
    return card;
}

// 액션 버튼 생성
function getActionButtons(table) {
    switch (table.state) {
        case TABLE_STATES.AVAILABLE:
            return `<button class="btn btn-success enter-btn" data-table-id="${table.id}">입장</button>`;
        case TABLE_STATES.IN_USE:
            return `
                <button class="btn btn-danger exit-btn" data-table-id="${table.id}">퇴장</button>
                <button class="btn btn-primary combine-btn" data-table-id="${table.id}">합석</button>
                <button class="btn btn-secondary move-btn" data-table-id="${table.id}">자리이동</button>
            `;
        case TABLE_STATES.EXPIRED:
            return `
                <button class="btn btn-danger exit-btn" data-table-id="${table.id}">퇴장</button>
                <button class="btn btn-primary" disabled>합석</button>
                <button class="btn btn-secondary" disabled>자리이동</button>
            `;
        default:
            return '';
    }
}



// 상태 텍스트 생성
function getStatusText(table) {
    switch (table.state) {
        case TABLE_STATES.AVAILABLE:
            return '이용 가능';
        case TABLE_STATES.IN_USE:
            return `${table.remainingTime}분`;
        case TABLE_STATES.EXPIRED:
            return '시간 만료';
        default:
            return '';
    }
}

// 대기 중인 주문 표시
function getPendingOrders(table) {
    const pendingOrders = table.orders.filter(order => order.state === ORDER_STATES.PENDING);
    
    if (pendingOrders.length === 0) {
        return '<div class="pending-item"><span>대기 중인 주문이 없습니다.</span></div>';
    }
    
    return pendingOrders.map(order => {
        const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
        const timeElapsed = Math.floor((Date.now() - order.orderTime) / 60000);
        return `
            <div class="pending-item">
                <div class="item-info">
                    <span>${menuItem.name} ${order.quantity}</span>
                    <span class="order-time">${timeElapsed}분 전</span>
                </div>
                <div class="item-actions">
                    <button class="complete" onclick="markOrderServed(${table.id}, '${order.id}')">✅</button>
                    <button class="cancel" onclick="cancelOrder(${table.id}, '${order.id}')">🚫</button>
                </div>
            </div>
        `;
    }).join('');
}


// 테이블 입장
function enterTable(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (table && table.state === TABLE_STATES.AVAILABLE) {
        table.state = TABLE_STATES.IN_USE;
        table.remainingTime = 180; // 180분 기본 시간
        table.startTime = Date.now();

        // ✅ 입장 즉시 총 테이블 수 1 증가
        businessStats.totalTables++;

        renderTables();
        updateOrderSummary();
        updateAdminPanel(); // 관리자 모드 즉시 반영
    }
}

// 관리자 탭 전환 이벤트
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // 모든 탭 버튼에서 active 제거
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    // 현재 버튼 활성화
    btn.classList.add('active');

    // 모든 탭 콘텐츠 숨김
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    // 선택된 탭 표시
    const target = btn.dataset.tab;
    document.getElementById(target).classList.add('active');
  });
});


function exitTable(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (table) {
        // 퇴장 시에는 총 테이블 수, 매출 합산만 반영
        //businessStats.totalRevenue += table.totalRevenue;

        // ✅ 즐겨찾기 해제
        if (favoriteTables.has(tableId)) {
            favoriteTables.delete(tableId);
        }

        // 테이블 초기화
        table.state = TABLE_STATES.AVAILABLE;
        table.remainingTime = 0;
        table.orders = [];
        table.startTime = null;
        table.totalRevenue = 0;

        renderTables();
        updateOrderSummary();

        // ✅ 관리자 패널 즉시 갱신
        updateInsights();
        updateAdminPanel();
    }
}




// 시간 조정
function adjustTime(tableId, minutes) {
    const table = tables.find(t => t.id === tableId);
    if (table && (table.state === TABLE_STATES.IN_USE || table.state === TABLE_STATES.EXPIRED)) {
        table.remainingTime = Math.max(0, table.remainingTime + minutes);
        
        // 시간이 0이 되면 만료 상태로 변경
        if (table.remainingTime === 0) {
            table.state = TABLE_STATES.EXPIRED;
        } else if (table.state === TABLE_STATES.EXPIRED) {
            table.state = TABLE_STATES.IN_USE;
        }
        
        renderTables();
    }
}

// 합석 모달 표시
function showCombineModal(tableId) {
    currentTableId = tableId;
    const modal = document.getElementById('combineModal');
    const selection = document.getElementById('combineTableSelection');
    
    // 이용 중인 다른 테이블들 표시
    const availableTables = tables.filter(t => 
        t.id !== tableId && 
        (t.state === TABLE_STATES.IN_USE || t.state === TABLE_STATES.EXPIRED)
    );
    
    selection.innerHTML = availableTables.map(table => `
        <div class="table-option" data-table-id="${table.id}">
            테이블 ${table.id}<br>
            <small>${table.remainingTime}분 남음</small>
        </div>
    `).join('');
    
    // 테이블 선택 이벤트
    selection.querySelectorAll('.table-option').forEach(option => {
        option.addEventListener('click', function() {
            selection.querySelectorAll('.table-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    openModal('combineModal');
}

// 합석 확인
function confirmCombine() {
    const selected = document.querySelector('#combineTableSelection .table-option.selected');
    if (!selected) {
        alert('합석할 테이블을 선택해주세요.');
        return;
    }
    
    const targetTableId = parseInt(selected.dataset.tableId);
    const currentTable = tables.find(t => t.id === currentTableId);
    const targetTable = tables.find(t => t.id === targetTableId);
    
    if (currentTable && targetTable) {
        // 더 많은 시간이 남은 테이블의 시간 + 60분
        const maxTime = Math.max(currentTable.remainingTime, targetTable.remainingTime);
        currentTable.remainingTime = maxTime + 60;
        currentTable.state = TABLE_STATES.IN_USE;
        
        // 대상 테이블의 주문들을 현재 테이블로 이동
        currentTable.orders = [...currentTable.orders, ...targetTable.orders];
        currentTable.totalRevenue += targetTable.totalRevenue;
        
        // 대상 테이블 초기화
        targetTable.state = TABLE_STATES.AVAILABLE;
        targetTable.remainingTime = 0;
        targetTable.orders = [];
        targetTable.startTime = null;
        targetTable.totalRevenue = 0;
        
        renderTables();
        updateOrderSummary();
        closeModal('combineModal');
    }
}

// 자리이동 모달 표시
function showMoveModal(tableId) {
    currentTableId = tableId;
    const modal = document.getElementById('moveModal');
    const selection = document.getElementById('moveTableSelection');
    
    // 이용 가능한 테이블들 표시
    const availableTables = tables.filter(t => t.state === TABLE_STATES.AVAILABLE);
    
    selection.innerHTML = availableTables.map(table => `
        <div class="table-option" data-table-id="${table.id}">
            테이블 ${table.id}
        </div>
    `).join('');
    
    // 테이블 선택 이벤트
    selection.querySelectorAll('.table-option').forEach(option => {
        option.addEventListener('click', function() {
            selection.querySelectorAll('.table-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
        });
    });
    
    openModal('moveModal');
}

// 자리이동 확인
// 자리이동 확인
function confirmMove() {
    const selected = document.querySelector('#moveTableSelection .table-option.selected');
    if (!selected) {
        alert('이동할 테이블을 선택해주세요.');
        return;
    }

    const targetTableId = parseInt(selected.dataset.tableId);
    const currentTable = tables.find(t => t.id === currentTableId);
    const targetTable = tables.find(t => t.id === targetTableId);

    if (currentTable && targetTable) {
        // 모든 정보를 대상 테이블로 이동
        targetTable.state = currentTable.state;
        targetTable.remainingTime = currentTable.remainingTime;
        targetTable.orders = [...currentTable.orders];
        targetTable.startTime = currentTable.startTime;
        targetTable.totalRevenue = currentTable.totalRevenue;

        // ✅ 즐겨찾기 정보도 같이 이동
        if (favoriteTables.has(currentTableId)) {
            favoriteTables.delete(currentTableId);
            favoriteTables.add(targetTableId);
        }

        // 현재 테이블 초기화
        currentTable.state = TABLE_STATES.AVAILABLE;
        currentTable.remainingTime = 0;
        currentTable.orders = [];
        currentTable.startTime = null;
        currentTable.totalRevenue = 0;

        renderTables();
        updateOrderSummary();
        closeModal('moveModal');
    }
}


// 주문 현황 표시
// 주문 현황 표시
function showOrderStatus(tableId) {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const modal = document.getElementById('orderStatusModal');
    const title = document.getElementById('orderStatusTitle');
    const orderList = document.getElementById('orderList');

    title.textContent = `테이블 ${tableId} 주문 현황`;

    if (table.orders.length === 0) {
        orderList.innerHTML = '<div class="order-item">주문이 없습니다.</div>';
    } else {
        let total = 0;
        orderList.innerHTML = table.orders.map(order => {
            const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
            const price = (order.state === ORDER_STATES.CANCELLED) ? 0 : menuItem.price * order.quantity;
            total += price;

            return `
                <div class="order-item ${order.state}">
                    <div>
                        <div>${menuItem.name}</div>
                        <div>수량: ${order.quantity}</div>
                        <div>${price.toLocaleString()}원</div>
                    </div>
                    <div class="order-status ${order.state}">
                        ${getOrderStatusText(order.state)}
                    </div>
                </div>
            `;
        }).join('');

        // ✅ 총합 표시 (취소 주문은 0원 반영)
        orderList.innerHTML += `<div class="order-total">총 ${total.toLocaleString()} 원</div>`;
    }

    openModal('orderStatusModal');
}




// 주문 상태 텍스트
function getOrderStatusText(state) {
    switch (state) {
        case ORDER_STATES.PENDING:
            return '대기 중';
        case ORDER_STATES.SERVED:
            return '서빙 완료';
        case ORDER_STATES.CANCELLED:
            return '주문 취소';
        default:
            return '';
    }
}

// 주문 취소
function cancelOrder(tableId, orderId) {
    const table = tables.find(t => t.id === tableId);
    if (table) {
        const order = table.orders.find(o => o.id === orderId);
        if (order && order.state === ORDER_STATES.PENDING) {
            order.state = ORDER_STATES.CANCELLED;

            const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
            const deduction = menuItem.price * order.quantity;

            table.totalRevenue -= deduction;
            businessStats.totalRevenue -= deduction;

            renderTables();
            updateOrderSummary();

            // ✅ 관리자 패널 즉시 갱신
            updateInsights();
            updateAdminPanel();
        }
    }
}


// 그룹화된 주문 취소
function cancelOrderGroup(tableId, orderIds) {
    const table = tables.find(t => t.id === tableId);
    if (table) {
        const ids = orderIds.split(',');
        ids.forEach(orderId => {
            const order = table.orders.find(o => o.id === orderId);
            if (order && order.state === ORDER_STATES.PENDING) {
                order.state = ORDER_STATES.CANCELLED;
                const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
                table.totalRevenue -= menuItem.price * order.quantity;
            }
        });
        renderTables();
        updateOrderSummary();
        showOrderStatus(tableId); // 모달 새로고침
    }
}

// 메뉴 추가 모달 표시
// 메뉴 추가 모달 표시
function showAddMenu(tableId) {
  currentTableId = tableId;
  const selection = document.getElementById('menuSelection');

  selection.innerHTML = MENU_ITEMS.map(item => `
    <div class="menu-option" data-menu-id="${item.id}">
      <div class="menu-info">
        <div>${item.name}</div>
        <div class="menu-price">${item.price.toLocaleString()}원</div>
      </div>
      <div class="quantity-controls">
        <button class="btn btn-sm quantity-decrease" data-menu-id="${item.id}">-</button>
        <span id="quantity-${item.id}" class="quantity-display">0</span>
        <button class="btn btn-sm quantity-increase" data-menu-id="${item.id}">+</button>
      </div>
    </div>
  `).join('');

  // 수량 조절 이벤트
  selection.querySelectorAll('.quantity-decrease').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.menuId;
      const display = document.getElementById(`quantity-${id}`);
      let qty = Math.max(0, parseInt(display.textContent) - 1);
      display.textContent = qty;
    });
  });

  selection.querySelectorAll('.quantity-increase').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.menuId;
      const display = document.getElementById(`quantity-${id}`);
      let qty = parseInt(display.textContent) + 1;
      display.textContent = qty;
    });
  });

  openModal('addMenuModal');
}

// 메뉴 추가 확인 (수정 후)
function confirmAddMenu() {
    const table = tables.find(t => t.id === currentTableId);
    if (!table) return;

    let hasSelection = false;

    document.querySelectorAll('#menuSelection .menu-option').forEach(option => {
        const menuId = option.dataset.menuId;
        const quantityDisplay = option.querySelector('.quantity-display');
        const quantity = parseInt(quantityDisplay.textContent);

        if (quantity > 0) {
            hasSelection = true;

            // 기존 대기 중 주문이 있으면 합치기
            const existingOrder = table.orders.find(order =>
                order.menuId === menuId && order.state === ORDER_STATES.PENDING
            );

            if (existingOrder) {
                existingOrder.quantity += quantity;
            } else {
                const order = {
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                    menuId: menuId,
                    quantity: quantity,
                    state: ORDER_STATES.PENDING,
                    orderTime: Date.now()
                };
                table.orders.push(order);
            }
        }
    });

    if (!hasSelection) {
        alert('메뉴를 하나 이상 선택하세요.');
        return;
    }

    renderTables();
updateOrderSummary();
updateInsights();   // ✅ 통계 즉시 갱신
updateAdminPanel(); // ✅ 관리자 탭 즉시 갱신
closeModal('addMenuModal');
    
}




// 수량 조절
function adjustQuantity(delta) {
    const display = document.getElementById('quantityDisplay');
    let quantity = parseInt(display.textContent);
    quantity = Math.max(1, quantity + delta);
    display.textContent = quantity;
}



// 주문 처리 요약 업데이트
function updateOrderSummary() {
    const pendingItems = document.getElementById('pendingItems');
    const orderQueue = document.getElementById('orderQueue');
    
    // 대기 중인 주문 통계
    const pendingStats = {};
    const queueItems = [];
    
    tables.forEach(table => {
        if (table.state === TABLE_STATES.IN_USE || table.state === TABLE_STATES.EXPIRED) {
            const pendingOrders = table.orders.filter(order => order.state === ORDER_STATES.PENDING);
            pendingOrders.forEach(order => {
                const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
                if (!pendingStats[menuItem.name]) {
                    pendingStats[menuItem.name] = 0;
                }
                pendingStats[menuItem.name] += order.quantity;
            });
            
            if (pendingOrders.length > 0) {
                const orderSummary = pendingOrders.map(order => {
                    const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
                    return `${menuItem.name} ${order.quantity}개 / `;
                }).join(' ');
                
                queueItems.push({
                    tableId: table.id,
                    summary: orderSummary,
                    orderTime: Math.min(...pendingOrders.map(o => o.orderTime))
                });
            }
        }
    });
    
    // 대기 중인 주문 표시
    const pendingItemsHtml = Object.entries(pendingStats)
        .map(([name, count]) => `<div class="pending-item-summary">${name} ${count}개 / </div>`)
        .join('');
    
    pendingItems.innerHTML = pendingItemsHtml || '<div class="pending-item-summary">대기 중인 주문이 없습니다.</div>';
    
    // 주문 큐 표시
    queueItems.sort((a, b) => a.orderTime - b.orderTime);
    const queueHtml = queueItems.map((item, index) => `
        <div class="queue-item">
            <span class="queue-number">${index + 1}</span>
            <span>테이블${item.tableId} : ${item.summary}</span>
        </div>
    `).join('');
    
    orderQueue.innerHTML = queueHtml || '<div class="queue-item">대기 중인 주문이 없습니다.</div>';
}

// 인사이트 업데이트
// 인사이트(통계) 업데이트
function updateInsights() {
  document.getElementById('adminTotalTables').textContent = businessStats.totalTables;
  document.getElementById('adminTotalRevenue').textContent = businessStats.totalRevenue.toLocaleString() + '원';

  const menuStatsContainer = document.getElementById('menuStats');
  menuStatsContainer.innerHTML = '';

  const statsEntries = Object.entries(businessStats.menuStats);
  if (statsEntries.length === 0) {
    menuStatsContainer.innerHTML = '<div>판매된 메뉴가 없습니다.</div>';
  } else {
    statsEntries.forEach(([menuId, count]) => {
      const menuItem = MENU_ITEMS.find(m => m.id === menuId);
      if (menuItem) {
        const row = document.createElement('div');
        row.classList.add('menu-stat-item');
        row.innerHTML = `<span>${menuItem.name} </span><span> ${count} 개</span>`;
        menuStatsContainer.appendChild(row);
      }
    });
  }
}



// 영업 종료
function endBusiness() {
    if (confirm('정말로 영업을 종료하시겠습니까? 모든 데이터가 초기화됩니다.')) {
        // 통계 저장 (실제로는 파일이나 데이터베이스에 저장)
        console.log('영업 종료 - 통계:', businessStats);
        
        // 모든 테이블 초기화
        tables.forEach(table => {
            table.state = TABLE_STATES.AVAILABLE;
            table.remainingTime = 0;
            table.orders = [];
            table.startTime = null;
            table.totalRevenue = 0;
        });
        
        // 통계 초기화
        businessStats = {
            totalTables: 0,
            totalRevenue: 0,
            menuStats: {}
        };
        
        renderTables();
        updateOrderSummary();
        closeModal('insightsModal');
        alert('영업이 종료되었습니다.');
    }
}

// 모달 열기
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

// 모달 닫기
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// 타이머 시작
function startTimer() {
    timerInterval = setInterval(() => {
        let hasChanges = false;
        
        tables.forEach(table => {
            if (table.state === TABLE_STATES.IN_USE && table.remainingTime > 0) {
                table.remainingTime--;
                hasChanges = true;
                
                if (table.remainingTime === 0) {
                    table.state = TABLE_STATES.EXPIRED;
                }
            }
        });
        
        if (hasChanges) {
            renderTables();
            updateOrderSummary();
        }
    }, 60000); // 1분마다 실행
}

// 즐겨찾기 토글
function toggleFavorite(tableId) {
    if (favoriteTables.has(tableId)) {
        favoriteTables.delete(tableId);
    } else {
        favoriteTables.add(tableId);
    }
    renderTables();
}

// 페이지 언로드 시 타이머 정리
window.addEventListener('beforeunload', () => {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
});


function markOrderServed(tableId, orderId) {
    const table = tables.find(t => t.id === tableId);
    if (table) {
        const order = table.orders.find(o => o.id === orderId);
        if (order && order.state === ORDER_STATES.PENDING) {
            order.state = ORDER_STATES.SERVED;

            const menuItem = MENU_ITEMS.find(item => item.id === order.menuId);
            const revenue = menuItem.price * order.quantity;
            table.totalRevenue += revenue;
            businessStats.totalRevenue += revenue;

            if (!businessStats.menuStats[order.menuId]) {
                businessStats.menuStats[order.menuId] = 0;
            }
            businessStats.menuStats[order.menuId] += order.quantity;

            renderTables();
            updateOrderSummary();

            // ✅ 관리자 화면 즉시 갱신
            updateInsights();
            updateAdminPanel();
        }
    }
}






// 관리자 설정 버튼
// 관리자 설정 버튼
document.getElementById('adminBtn').addEventListener('click', () => {
  openModal('adminModal');
  document.getElementById('passwordSection').style.display = 'block';
  document.getElementById('adminContent').style.display = 'none';

  // 비밀번호 입력창 초기화
  document.getElementById('passwordInput').value = '';
});

// 비밀번호 확인 로직 (중복 방지를 위해 함수화)
function checkAdminPassword() {
  const password = document.getElementById('passwordInput').value;
  if (password === 'admin') {
    document.getElementById('passwordSection').style.display = 'none';
    document.getElementById('adminContent').style.display = 'block';
    updateInsights();
    updateAdminPanel(); // ✅ 반드시 호출
  } else {
    alert('잘못된 패스워드입니다.');
  }
}

// ✅ 버튼 클릭 시
document.getElementById('passwordSubmit').addEventListener('click', checkAdminPassword);

// ✅ Enter 키 입력 시
document.getElementById('passwordInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    checkAdminPassword();
  }
});


// 닫기 버튼
document.getElementById('adminClose').addEventListener('click', () => {
  closeModal('adminModal');
});

// 관리자 패널 업데이트
// ✅ 메뉴 관리 UI 갱신
function updateAdminPanel() {
  document.getElementById('adminTotalTables').textContent = businessStats.totalTables;
  document.getElementById('adminTotalRevenue').textContent = businessStats.totalRevenue.toLocaleString() + '원';

  // 메뉴 관리 UI 생성
  const menuManagement = document.getElementById('menuManagement');
  menuManagement.innerHTML = MENU_ITEMS.map((item, index) => `
    <div class="menu-edit-item">
      <input type="text" value="${item.name}" data-index="${index}" class="menu-name-input">
      <input type="number" value="${item.price}" data-index="${index}" class="menu-price-input">
      <button class="btn btn-sm btn-complete saveMenuBtn menuad" data-index="${index}">저장</button>
      <button class="btn btn-sm btn-danger deleteMenuBtn menuad" data-index="${index}">삭제</button>
    </div>
  `).join('');

  // 저장 버튼 이벤트
  document.querySelectorAll('.saveMenuBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const nameInput = document.querySelector(`.menu-name-input[data-index="${idx}"]`);
      const priceInput = document.querySelector(`.menu-price-input[data-index="${idx}"]`);

      MENU_ITEMS[idx].name = nameInput.value.trim();
      MENU_ITEMS[idx].price = parseInt(priceInput.value);

      alert('메뉴가 수정되었습니다.');
      updateAdminPanel(); // 즉시 갱신
    });
  });

  // 삭제 버튼 이벤트
  document.querySelectorAll('.deleteMenuBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      const itemName = MENU_ITEMS[idx].name;

      if (confirm(`정말 "${itemName}" 메뉴를 삭제하시겠습니까?`)) {
        MENU_ITEMS.splice(idx, 1); // 배열에서 삭제
        alert('메뉴가 삭제되었습니다.');
        updateAdminPanel(); // 갱신
      }
    });
  });
}


// ✅ 메뉴 추가 기능
document.getElementById('addMenuBtn').addEventListener('click', () => {
  const name = document.getElementById('newMenuName').value.trim();
  const price = parseInt(document.getElementById('newMenuPrice').value);

  if (!name || isNaN(price) || price <= 0) {
    alert('올바른 메뉴 이름과 가격을 입력하세요.');
    return;
  }

  // ID는 영어 소문자 + 하이픈 변환
  const id = name.toLowerCase().replace(/\s+/g, '-');

  // 기존에 같은 이름 메뉴 있으면 추가하지 않음
  if (MENU_ITEMS.some(item => item.id === id)) {
    alert('이미 존재하는 메뉴입니다.');
    return;
  }

  MENU_ITEMS.push({ id, name, price });

  // 입력 초기화
  document.getElementById('newMenuName').value = '';
  document.getElementById('newMenuPrice').value = '';

  alert('새 메뉴가 추가되었습니다.');
  updateAdminPanel(); // 갱신
});


// ✅ ESC 키 누르면 모달 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const openModal = document.querySelector('.modal[style*="display: block"]');
    if (openModal) {
      openModal.style.display = 'none';
    }
  }
});

// ===============================
// 장사 종료: 통계 저장 + 초기화
// ===============================


// ✅ 엑셀 다운로드 함수
// 판매 통계 엑셀 다운로드 함수
// 판매 통계 파일 저장 (XLSX 있으면 xlsx, 없으면 csv)
function exportSalesFile() {
  const rows = [["메뉴", "판매 수량", "매출(원)"]];
  let total = 0;

  Object.entries(businessStats.menuStats).forEach(([menuId, count]) => {
    const menuItem = MENU_ITEMS.find(m => m.id === menuId);
    if (menuItem) {
      const revenue = menuItem.price * count;
      total += revenue;
      rows.push([menuItem.name, count, revenue]);
    }
  });
  rows.push(["합계", "", total]);

  if (window.XLSX && XLSX.utils && XLSX.writeFile) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "판매 통계");
    XLSX.writeFile(wb, "판매통계.xlsx");
    return;
  }

  // CSV 폴백
  const csv = "\uFEFF" + rows.map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "판매통계.csv";
  document.body.appendChild(a);
  a.click();
  URL.revokeObjectURL(a.href);
  a.remove();
}


// 모든 값 초기화
function resetBusiness() {
  tables.forEach(t => {
    t.state = TABLE_STATES.AVAILABLE;
    t.remainingTime = 0;
    t.orders = [];
    t.startTime = null;
    t.totalRevenue = 0;
  });
  businessStats = { totalTables: 0, totalRevenue: 0, menuStats: {} };
  renderTables();
  updateOrderSummary();
  updateInsights();
  updateAdminPanel();
}

// ✅ 장사 종료 버튼: 저장 → 초기화(단일 리스너)
document.getElementById('endBusinessBtn').addEventListener('click', () => {
  if (!confirm("정말로 장사를 종료하시겠습니까? 판매 통계를 저장한 뒤 모두 초기화됩니다.")) return;
  exportSalesFile();
  resetBusiness();
  alert("판매 통계를 저장하고 초기화했습니다.");
  closeModal('adminModal');
});

// ✅ 모든 값 초기화
function resetBusiness() {
  // 테이블 초기화
  tables.forEach(table => {
    table.state = TABLE_STATES.AVAILABLE;
    table.remainingTime = 0;
    table.orders = [];
    table.startTime = null;
    table.totalRevenue = 0;
  });

  // 통계 초기화
  businessStats = {
    totalTables: 0,
    totalRevenue: 0,
    menuStats: {}
  };

  renderTables();
  updateOrderSummary();
  updateInsights();
  updateAdminPanel();
}
