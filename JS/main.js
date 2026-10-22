/*
 * 구독 관리 앱의 시작 파일
 * ------------------------
 * 이 페이지는 빌드 도구 없이 실행하는 일반 스크립트 방식입니다.
 * 먼저 기존 logic.js를 그대로 불러오기 때문에, logic.js 마지막의 예제
 * 로그에서 참조하는 함수 이름과 테스트 데이터만 여기서 미리 준비합니다.
 * 기존 계산 함수 자체는 복사하거나 수정하지 않고 화면 계산에 직접 사용합니다.
 */

"use strict";

// logic.js의 예제 로그가 기대하는 샘플 데이터와 옛 이름의 별칭입니다.
// 별칭은 logic.js가 로드되기 전 준비되어야 하며 실제 화면 데이터에는 사용되지 않습니다.
window.testData = [
    { id: "example_1", name: "음악", amount: 10900, cycle: "monthly", nextPaymentDate: "2026-11-01", category: "음악" }
];
window.calculateTotalMonthlyAmount = function (subscriptions) {
    return window.getTotalMonthlyAmount(subscriptions);
};
window.calculateTotalYearlyAmount = function (subscriptions) {
    return window.getTotalYearlyAmount(subscriptions);
};
window.groupSubscriptionsByCategory = function (subscriptions) {
    return window.getAmountByCategory(subscriptions);
};

(function () {
    const STORAGE_KEY = "subscription-dashboard-items";
    let subscriptions = [];
    let editingId = null;

    // 같은 날짜 문자열을 브라우저 시간대와 무관하게 비교할 수 있도록 로컬 날짜로 만듭니다.
    function getTodayString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const day = String(today.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    // localStorage에 저장한 JSON을 읽고, 형식이 잘못된 데이터는 명시적으로 알립니다.
    function loadSubscriptions() {
        const savedText = window.localStorage.getItem(STORAGE_KEY);
        if (savedText === null) {
            return [];
        }

        let savedItems;
        try {
            savedItems = JSON.parse(savedText);
        } catch (error) {
            throw new Error("저장된 구독 데이터를 읽을 수 없습니다. 브라우저 저장 데이터를 확인해 주세요.");
        }

        if (!Array.isArray(savedItems) || !savedItems.every(isValidSubscription)) {
            throw new Error("저장된 구독 데이터 형식이 올바르지 않습니다. 잘못된 항목을 확인해 주세요.");
        }
        return savedItems;
    }

    // 데이터를 저장하지 못한 경우 성공한 것처럼 화면만 바뀌지 않도록 결과를 반환합니다.
    function saveSubscriptions(nextSubscriptions) {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSubscriptions));
            return true;
        } catch (error) {
            showMessage("브라우저 저장 공간에 구독 정보를 저장하지 못했습니다. 저장 공간 설정을 확인해 주세요.", false);
            return false;
        }
    }

    function isValidSubscription(item) {
        return item !== null &&
            typeof item === "object" &&
            typeof item.id === "string" &&
            typeof item.name === "string" &&
            Number.isFinite(Number(item.amount)) &&
            Number(item.amount) > 0 &&
            (item.cycle === "monthly" || item.cycle === "yearly") &&
            typeof item.nextPaymentDate === "string" &&
            typeof item.category === "string";
    }

    function formatCurrency(amount) {
        return Math.round(amount).toLocaleString("ko-KR") + "원";
    }

    // 사용자 메시지는 텍스트로만 표시하므로 입력한 구독 이름이 HTML로 해석되지 않습니다.
    function showMessage(message, isSuccess) {
        const messageElement = document.getElementById("app-message");
        messageElement.textContent = message;
        messageElement.classList.toggle("success", Boolean(isSuccess));
        messageElement.hidden = false;
    }

    function clearMessage() {
        const messageElement = document.getElementById("app-message");
        messageElement.textContent = "";
        messageElement.hidden = true;
        messageElement.classList.remove("success");
    }

    // 요약은 요청된 기존 계산 함수를 사용하며, 이번 주는 오늘 포함 7일로 정의합니다.
    function refreshDashboard() {
        const monthlyTotal = window.getTotalMonthlyAmount(subscriptions);
        const yearlyTotal = window.getTotalYearlyAmount(subscriptions);
        const upcomingPayments = window.getUpcomingPayments(subscriptions, getTodayString(), 7);
        const categoryTotals = window.getAmountByCategory(subscriptions);

        window.SubscriptionUI.render({
            subscriptions: subscriptions,
            monthlyTotal: monthlyTotal,
            yearlyTotal: yearlyTotal,
            upcomingPayments: upcomingPayments,
            categoryTotals: categoryTotals,
            today: getTodayString(),
            formatCurrency: formatCurrency,
            getMonthlyAmount: window.getMonthlyAmount,
            getDaysUntilNextPayment: window.getDaysUntilNextPayment
        });
    }

    function resetForm() {
        const form = document.getElementById("subscription-form");
        form.reset();
        editingId = null;
        document.getElementById("form-title").textContent = "새 구독 추가";
        document.getElementById("submit-button").textContent = "구독 추가";
        document.getElementById("cancel-edit-button").hidden = true;
    }

    function startEditing(id) {
        const subscription = subscriptions.find(function (item) {
            return item.id === id;
        });
        if (!subscription) {
            showMessage("수정할 구독을 찾을 수 없습니다. 목록을 새로 확인해 주세요.", false);
            return;
        }

        editingId = id;
        document.getElementById("subscription-name").value = subscription.name;
        document.getElementById("subscription-amount").value = subscription.amount;
        document.querySelector('input[name="cycle"][value="' + subscription.cycle + '"]').checked = true;
        document.getElementById("subscription-date").value = subscription.nextPaymentDate;
        document.getElementById("subscription-category").value = subscription.category;
        document.getElementById("form-title").textContent = "구독 수정";
        document.getElementById("submit-button").textContent = "수정 저장";
        document.getElementById("cancel-edit-button").hidden = false;
        document.getElementById("add-subscription").scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("subscription-name").focus();
    }

    function handleFormSubmit(event) {
        event.preventDefault();
        clearMessage();
        const wasEditing = editingId !== null;

        const name = document.getElementById("subscription-name").value.trim();
        const amount = Number(document.getElementById("subscription-amount").value);
        const cycle = document.querySelector('input[name="cycle"]:checked').value;
        const nextPaymentDate = document.getElementById("subscription-date").value;
        const category = document.getElementById("subscription-category").value.trim();

        if (!name || !category || !Number.isFinite(amount) || amount <= 0 || !nextPaymentDate) {
            showMessage("모든 항목을 올바르게 입력해 주세요.", false);
            return;
        }

        const item = {
            id: editingId || ("sub_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8)),
            name: name,
            amount: amount,
            cycle: cycle,
            nextPaymentDate: nextPaymentDate,
            category: category
        };

        const nextSubscriptions = editingId
            ? subscriptions.map(function (current) { return current.id === editingId ? item : current; })
            : subscriptions.concat(item);

        if (!saveSubscriptions(nextSubscriptions)) {
            return;
        }

        subscriptions = nextSubscriptions;
        resetForm();
        refreshDashboard();
        showMessage(wasEditing ? "구독 정보를 수정했습니다." : "구독을 추가했습니다.", true);
    }

    function handleListClick(event) {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }

        const id = button.dataset.id;
        if (button.dataset.action === "edit") {
            startEditing(id);
            return;
        }

        if (button.dataset.action === "delete") {
            const target = subscriptions.find(function (item) { return item.id === id; });
            if (!target) {
                showMessage("삭제할 구독을 찾을 수 없습니다. 목록을 새로 확인해 주세요.", false);
                return;
            }
            if (!window.confirm("'" + target.name + "' 구독을 삭제할까요?")) {
                return;
            }

            const nextSubscriptions = subscriptions.filter(function (item) {
                return item.id !== id;
            });
            if (!saveSubscriptions(nextSubscriptions)) {
                return;
            }

            subscriptions = nextSubscriptions;
            if (editingId === id) {
                resetForm();
            }
            refreshDashboard();
            showMessage("구독을 삭제했습니다.", true);
        }
    }

    function initialize() {
        document.getElementById("subscription-form").addEventListener("submit", handleFormSubmit);
        document.getElementById("subscription-list").addEventListener("click", handleListClick);
        document.getElementById("cancel-edit-button").addEventListener("click", function () {
            resetForm();
            clearMessage();
        });

        try {
            subscriptions = loadSubscriptions();
        } catch (error) {
            subscriptions = [];
            showMessage(error.message, false);
        }
        refreshDashboard();
    }

    // DOM 끝부분에서 스크립트를 불러오므로, 모든 스크립트가 준비된 뒤 초기화합니다.
    document.addEventListener("DOMContentLoaded", initialize);
}());
