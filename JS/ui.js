/*
 * 화면 그리기 전용 파일
 * ---------------------
 * 이 파일은 전달받은 데이터를 HTML 요소로 표시합니다. 저장/수정/삭제나
 * 금액 계산은 main.js와 logic.js의 책임이고, 여기서는 DOM만 갱신합니다.
 * 사용자가 입력한 값은 innerHTML에 넣지 않고 textContent로 출력해 안전하게
 * 표시합니다.
 */

"use strict";

(function () {
    function createElement(tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) {
            element.className = className;
        }
        if (text !== undefined) {
            element.textContent = text;
        }
        return element;
    }

    function formatDate(dateText) {
        const parts = dateText.split("-");
        if (parts.length !== 3) {
            return dateText;
        }
        return Number(parts[1]) + "월 " + Number(parts[2]) + "일 결제";
    }

    function formatDayLabel(days) {
        if (days === 0) {
            return "오늘 결제";
        }
        if (days > 0) {
            return "D-" + days;
        }
        return "D+" + Math.abs(days) + " 지남";
    }

    function renderSummary(data) {
        document.getElementById("monthly-total").textContent = data.formatCurrency(data.monthlyTotal);
        document.getElementById("yearly-total").textContent = data.formatCurrency(data.yearlyTotal);
        document.getElementById("upcoming-count").textContent = data.upcomingPayments.length + "건";

        const upcomingNames = data.upcomingPayments.map(function (item) {
            return item.name;
        });
        const detail = upcomingNames.length > 0
            ? "7일 이내: " + upcomingNames.join(", ")
            : "앞으로 7일 이내 결제";
        document.getElementById("upcoming-detail").textContent = detail;
    }

    function renderSubscriptions(data) {
        const list = document.getElementById("subscription-list");
        list.replaceChildren();
        document.getElementById("subscription-count").textContent = data.subscriptions.length + "개";

        if (data.subscriptions.length === 0) {
            const emptyState = createElement("div", "empty-state");
            emptyState.appendChild(createElement("span", "empty-icon", "○"));
            emptyState.appendChild(createElement("p", "", "아직 등록된 구독이 없습니다."));
            emptyState.appendChild(createElement("span", "", "아래 폼에서 첫 구독을 추가해 주세요."));
            list.appendChild(emptyState);
            return;
        }

        data.subscriptions.forEach(function (subscription) {
            const card = createElement("article", "subscription-card");
            const main = createElement("div", "subscription-main");
            const avatarText = subscription.name.trim().charAt(0) || "?";
            const avatar = createElement("span", "subscription-avatar", avatarText);
            avatar.setAttribute("aria-hidden", "true");

            const info = createElement("div", "subscription-info");
            info.appendChild(createElement("p", "subscription-name", subscription.name));
            const meta = createElement("div", "subscription-meta");
            meta.appendChild(createElement("span", "", subscription.category));
            meta.appendChild(createElement("span", "", formatDate(subscription.nextPaymentDate)));

            const daysUntil = data.getDaysUntilNextPayment(data.today, subscription.nextPaymentDate);
            const dayBadge = createElement("span", "day-badge", formatDayLabel(daysUntil));
            if (daysUntil === 0) {
                dayBadge.classList.add("due-today");
            }
            meta.appendChild(dayBadge);
            info.appendChild(meta);
            main.append(avatar, info);

            const cost = createElement("div", "subscription-cost");
            cost.appendChild(createElement("span", "subscription-monthly", data.formatCurrency(data.getMonthlyAmount(subscription)) + "/월"));
            cost.appendChild(createElement("span", "subscription-cycle", subscription.cycle === "yearly" ? "연간 " + data.formatCurrency(subscription.amount) : "매월 결제"));

            const actions = createElement("div", "subscription-actions");
            const editButton = createElement("button", "small-button", "수정");
            editButton.type = "button";
            editButton.dataset.action = "edit";
            editButton.dataset.id = subscription.id;
            editButton.setAttribute("aria-label", subscription.name + " 수정");

            const deleteButton = createElement("button", "small-button delete-button", "삭제");
            deleteButton.type = "button";
            deleteButton.dataset.action = "delete";
            deleteButton.dataset.id = subscription.id;
            deleteButton.setAttribute("aria-label", subscription.name + " 삭제");
            actions.append(editButton, deleteButton);

            card.append(main, cost, actions);
            list.appendChild(card);
        });
    }

    function renderCategories(categoryTotals, monthlyTotal, formatCurrency) {
        const container = document.getElementById("category-list");
        container.replaceChildren();
        const categories = Object.entries(categoryTotals).sort(function (left, right) {
            return right[1] - left[1];
        });

        if (categories.length === 0) {
            container.appendChild(createElement("p", "empty-category", "구독을 추가하면 카테고리별 비중이 표시됩니다."));
            return;
        }

        categories.forEach(function (entry) {
            const categoryName = entry[0];
            const amount = entry[1];
            const percentage = monthlyTotal === 0 ? 0 : amount / monthlyTotal * 100;
            const row = createElement("div", "category-row");
            row.appendChild(createElement("span", "category-name", categoryName));
            row.appendChild(createElement("span", "category-amount", formatCurrency(amount) + "/월"));

            const track = createElement("div", "category-track");
            track.setAttribute("aria-label", categoryName + " 비중 " + percentage.toFixed(1) + "%");
            const fill = createElement("div", "category-fill");
            fill.style.width = percentage.toFixed(1) + "%";
            track.appendChild(fill);
            row.appendChild(track);
            row.appendChild(createElement("span", "category-percent", percentage.toFixed(1) + "%"));
            container.appendChild(row);
        });
    }

    window.SubscriptionUI = {
        render: function (data) {
            renderSummary(data);
            renderSubscriptions(data);
            renderCategories(data.categoryTotals, data.monthlyTotal, data.formatCurrency);
        }
    };
}());
