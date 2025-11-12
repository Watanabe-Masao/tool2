// Calendar View Component
// 配分データのカレンダー表示と既存ファイルへの追加機能

import dataSyncService from './data-sync-service.js';

class CalendarView {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.ordersData = {};
        this.onDateSelected = null;
    }

    /**
     * カレンダーを初期化
     */
    async init(containerId, onDateSelectedCallback) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error('Calendar container not found:', containerId);
            return;
        }

        this.onDateSelected = onDateSelectedCallback;

        // カレンダーUIを構築
        this.render();

        // 当月のデータを読み込み
        await this.loadMonthData();
    }

    /**
     * カレンダーをレンダリング
     */
    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();

        const html = `
            <div class="calendar-header">
                <button class="calendar-nav-btn" id="prevMonth">◀</button>
                <h3 class="calendar-title">${year}年 ${month + 1}月</h3>
                <button class="calendar-nav-btn" id="nextMonth">▶</button>
            </div>
            <div class="calendar-weekdays">
                <div class="calendar-weekday">日</div>
                <div class="calendar-weekday">月</div>
                <div class="calendar-weekday">火</div>
                <div class="calendar-weekday">水</div>
                <div class="calendar-weekday">木</div>
                <div class="calendar-weekday">金</div>
                <div class="calendar-weekday">土</div>
            </div>
            <div class="calendar-days" id="calendarDays">
                ${this.renderDays(year, month)}
            </div>
        `;

        this.container.innerHTML = html;

        // イベントリスナーを設定
        this.attachEventListeners();
    }

    /**
     * 日付セルをレンダリング
     */
    renderDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        let html = '';

        // 前月の空白セル
        for (let i = 0; i < startDayOfWeek; i++) {
            html += '<div class="calendar-day empty"></div>';
        }

        // 当月の日付セル
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = this.formatDate(year, month, day);
            const hasOrders = this.ordersData[dateStr]?.length > 0;
            const isToday = this.isToday(year, month, day);
            const isSelected = this.selectedDate === dateStr;

            const classes = ['calendar-day'];
            if (hasOrders) classes.push('has-orders');
            if (isToday) classes.push('today');
            if (isSelected) classes.push('selected');

            const orderCount = this.ordersData[dateStr]?.length || 0;
            const badge = hasOrders ? `<span class="order-badge">${orderCount}</span>` : '';

            html += `
                <div class="calendar-day ${classes.join(' ')}" data-date="${dateStr}">
                    <span class="day-number">${day}</span>
                    ${badge}
                </div>
            `;
        }

        return html;
    }

    /**
     * イベントリスナーを設定
     */
    attachEventListeners() {
        // 前月ボタン
        document.getElementById('prevMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.render();
            this.loadMonthData();
        });

        // 次月ボタン
        document.getElementById('nextMonth')?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.render();
            this.loadMonthData();
        });

        // 日付セルのクリック
        const dayCells = document.querySelectorAll('.calendar-day:not(.empty)');
        dayCells.forEach(cell => {
            cell.addEventListener('click', (e) => {
                const dateStr = cell.getAttribute('data-date');
                this.selectDate(dateStr);
            });
        });
    }

    /**
     * 月のデータを読み込み
     */
    async loadMonthData() {
        try {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();

            // 月の開始日と終了日
            const startDate = this.formatDate(year, month, 1);
            const lastDay = new Date(year, month + 1, 0).getDate();
            const endDate = this.formatDate(year, month, lastDay);

            // Firestoreから注文データを取得
            const orders = await dataSyncService.getOrdersInRange(startDate, endDate);

            // 日付ごとにグループ化
            this.ordersData = {};
            orders.forEach(order => {
                const date = order.deliveryDate;
                if (!this.ordersData[date]) {
                    this.ordersData[date] = [];
                }
                this.ordersData[date].push(order);
            });

            // カレンダーを再描画
            this.render();

            console.log(`Loaded ${orders.length} orders for ${year}/${month + 1}`);
        } catch (error) {
            console.error('Error loading month data:', error);
        }
    }

    /**
     * 日付を選択
     */
    selectDate(dateStr) {
        this.selectedDate = dateStr;

        // 選択状態を更新
        document.querySelectorAll('.calendar-day').forEach(cell => {
            cell.classList.remove('selected');
        });
        document.querySelector(`[data-date="${dateStr}"]`)?.classList.add('selected');

        // コールバックを実行
        if (this.onDateSelected) {
            const orders = this.ordersData[dateStr] || [];
            this.onDateSelected(dateStr, orders);
        }
    }

    /**
     * 日付をフォーマット (YYYY-MM-DD)
     */
    formatDate(year, month, day) {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    /**
     * 今日の日付か判定
     */
    isToday(year, month, day) {
        const today = new Date();
        return year === today.getFullYear() &&
               month === today.getMonth() &&
               day === today.getDate();
    }

    /**
     * カレンダーをリフレッシュ
     */
    async refresh() {
        await this.loadMonthData();
    }
}

export default CalendarView;
