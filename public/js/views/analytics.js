/**
 * View 11: Financial Analytics (Real Chart.js Charts)
 */

let analyticsState = {
    groups: [],
    selectedGroupId: null,
    chartsData: null,
    chartInstances: {}
};

async function renderAnalyticsView() {
    const content = document.getElementById('app-content');
    if (!content) return;

    content.innerHTML = `
      <div style="text-align: center; padding: 48px 0; color: #64748B;">
        Generating Chart.js financial visualizations...
      </div>
    `;

    try {
        const groupsRes = await API.get('/groups');
        analyticsState.groups = groupsRes.groups || [];

        if (analyticsState.groups.length === 0) {
            content.innerHTML = `
              <div class="card" style="max-width: 500px; margin: 40px auto; text-align: center; padding: 40px;">
                <h3>No Expense Groups</h3>
                <p style="color: #64748B; margin-bottom: 16px;">Create a group to see financial analytics charts.</p>
                <a href="#/groups" class="btn btn-primary">+ Create Group</a>
              </div>
            `;
            return;
        }

        if (!analyticsState.selectedGroupId) {
            analyticsState.selectedGroupId = AppState.activeGroupId || analyticsState.groups[0].id;
        }

        await loadChartsData(analyticsState.selectedGroupId);
        renderAnalyticsUI();
    } catch (err) {
        content.innerHTML = `
          <div class="card" style="padding: 32px; text-align: center;">
            <p style="color: #DC2626;">${err.message}</p>
          </div>
        `;
    }
}

async function loadChartsData(groupId) {
    const res = await API.get(`/analytics/charts/${groupId}`);
    analyticsState.chartsData = res;
}

function renderAnalyticsUI() {
    const content = document.getElementById('app-content');
    if (!content) return;

    const currentGroup = analyticsState.groups.find(g => g.id === analyticsState.selectedGroupId) || analyticsState.groups[0];
    const data = analyticsState.chartsData;

    content.innerHTML = `
      <!-- Page Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Financial Analytics &amp; Visualizations</h1>
          <p class="page-subtitle">Real-time category allocation, spending trends, and member balance distributions.</p>
        </div>

        <div style="display: flex; align-items: center; gap: 8px;">
          <label style="font-size: 13px; font-weight: 600; color: #64748B;">Group:</label>
          <select class="form-select" style="width: auto; padding: 6px 12px; font-size: 13px;" onchange="handleAnalyticsGroupChange(this.value)">
            ${analyticsState.groups.map(g => `
              <option value="${g.id}" ${g.id === analyticsState.selectedGroupId ? 'selected' : ''}>
                ${g.name} (${g.currency})
              </option>
            `).join('')}
          </select>
        </div>
      </div>

      <!-- Charts Grid -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px;">
        
        <!-- Chart 1: Category Distribution -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title">Expenditure by Category</span>
            <span class="badge badge-slate">Doughnut</span>
          </div>
          <div class="card-body" style="height: 320px; display: flex; align-items: center; justify-content: center;">
            ${(!data.categories || data.categories.data.length === 0) ? `
              <span style="color: #64748B; font-size: 13px;">No category expenses recorded yet.</span>
            ` : `
              <canvas id="category-chart"></canvas>
            `}
          </div>
        </div>

        <!-- Chart 2: Member Comparison (Paid vs Share) -->
        <div class="card" style="margin-bottom: 0;">
          <div class="card-header">
            <span class="card-title">Member Contributions (Paid vs Share)</span>
            <span class="badge badge-slate">Grouped Bar</span>
          </div>
          <div class="card-body" style="height: 320px; display: flex; align-items: center; justify-content: center;">
            ${(!data.members || data.members.labels.length === 0) ? `
              <span style="color: #64748B; font-size: 13px;">No member split records found.</span>
            ` : `
              <canvas id="members-chart"></canvas>
            `}
          </div>
        </div>

      </div>

      <!-- Chart 3: Spending Trend Over Time -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">Spending Timeline &amp; Velocity</span>
          <span class="badge badge-slate">Line Chart</span>
        </div>
        <div class="card-body" style="height: 320px;">
          ${(!data.trends || data.trends.data.length === 0) ? `
            <div style="text-align: center; padding: 100px 0; color: #64748B; font-size: 13px;">
              Not enough chronological data points to plot a spending trend.
            </div>
          ` : `
            <canvas id="trend-chart"></canvas>
          `}
        </div>
      </div>
    `;

    // Instantiate Chart.js graphs
    setTimeout(initializeChartJs, 50);
}

function initializeChartJs() {
    const data = analyticsState.chartsData;
    if (!data) return;

    // Destroy existing instances to prevent canvas reuse errors
    Object.values(analyticsState.chartInstances).forEach(c => c && c.destroy());
    analyticsState.chartInstances = {};

    const primaryColors = ['#0F172A', '#16A34A', '#0284C7', '#D97706', '#8B5CF6', '#EC4899', '#64748B'];

    // 1. Category Doughnut Chart
    const catCanvas = document.getElementById('category-chart');
    if (catCanvas && data.categories && data.categories.data.length > 0) {
        analyticsState.chartInstances.category = new Chart(catCanvas, {
            type: 'doughnut',
            data: {
                labels: data.categories.labels,
                datasets: [{
                    data: data.categories.data,
                    backgroundColor: primaryColors.slice(0, data.categories.labels.length),
                    borderWidth: 2,
                    borderColor: '#FFFFFF'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } }
                }
            }
        });
    }

    // 2. Member Comparison Bar Chart
    const memberCanvas = document.getElementById('members-chart');
    if (memberCanvas && data.members && data.members.labels.length > 0) {
        analyticsState.chartInstances.members = new Chart(memberCanvas, {
            type: 'bar',
            data: {
                labels: data.members.labels,
                datasets: [
                    {
                        label: 'Total Paid Upfront',
                        data: data.members.paidData,
                        backgroundColor: '#16A34A',
                        borderRadius: 4
                    },
                    {
                        label: 'Allocated Fair Share',
                        data: data.members.shareData,
                        backgroundColor: '#CBD5E1',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                    x: { grid: { display: false } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Inter', size: 12 } } }
                }
            }
        });
    }

    // 3. Trend Line Chart
    const trendCanvas = document.getElementById('trend-chart');
    if (trendCanvas && data.trends && data.trends.data.length > 0) {
        analyticsState.chartInstances.trends = new Chart(trendCanvas, {
            type: 'line',
            data: {
                labels: data.trends.labels,
                datasets: [{
                    label: 'Daily Expenditure',
                    data: data.trends.data,
                    borderColor: '#0F172A',
                    backgroundColor: 'rgba(15, 23, 42, 0.05)',
                    fill: true,
                    tension: 0.2,
                    pointRadius: 4,
                    pointBackgroundColor: '#16A34A'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: '#F1F5F9' } },
                    x: { grid: { color: '#F1F5F9' } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }
}

async function handleAnalyticsGroupChange(groupId) {
    analyticsState.selectedGroupId = parseInt(groupId, 10);
    AppState.setActiveGroup(analyticsState.selectedGroupId);
    await loadChartsData(analyticsState.selectedGroupId);
    renderAnalyticsUI();
}

window.renderAnalyticsView = renderAnalyticsView;
window.handleAnalyticsGroupChange = handleAnalyticsGroupChange;
window.initializeChartJs = initializeChartJs;
