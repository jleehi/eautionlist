// 차트 렌더러 모듈 - 차트 렌더링 관련 기능을 담당합니다
// Chart.js를 사용하여 다양한 차트를 생성하고 관리합니다

// 전역 변수
let charts = {}; // 차트들을 저장하는 객체

// 차트 초기화 함수
function initializeCharts(dashboardData) {
    console.log('📊 차트 렌더러: 차트 초기화 시작...');
    
    try {
        // 기존 차트 제거 (메모리 누수 방지)
        destroyAllCharts();
        
        // 차트 생성 전 데이터 유효성 검사
        if (!dashboardData || !dashboardData.data || dashboardData.data.length === 0) {
            console.warn('⚠️ 차트 생성을 위한 데이터가 없습니다.');
            showEmptyChartMessages();
            return;
        }
        
        // 지역별 차트 생성
        createRegionChart(dashboardData);
        
        // 가격대별 차트 생성
        createPriceChart(dashboardData);
        
        // 매물 종류별 차트 생성
        createPropertyChart(dashboardData);
        
        console.log('✅ 차트 초기화 완료!');
    } catch (error) {
        console.error('❌ 차트 초기화 중 오류 발생:', error);
        showError('차트를 초기화하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 모든 차트 제거
function destroyAllCharts() {
    // 모든 차트 제거
    Object.keys(charts).forEach(chartKey => {
        if (charts[chartKey]) {
            charts[chartKey].destroy();
            charts[chartKey] = null;
        }
    });
}

// 빈 차트 메시지 표시
function showEmptyChartMessages() {
    const chartContexts = [
        'regionChart',
        'priceRangeChart',
        'propertyTypeChart'
    ];
    
    chartContexts.forEach(chartId => {
        const ctx = document.getElementById(chartId);
        if (ctx) {
            const context = ctx.getContext('2d');
            context.clearRect(0, 0, ctx.width, ctx.height);
            context.font = '14px Arial';
            context.fillStyle = '#666';
            context.textAlign = 'center';
            context.fillText('데이터가 없습니다', ctx.width / 2, ctx.height / 2);
        }
    });
}

// 지역별 차트 생성
function createRegionChart(dashboardData) {
    console.log('📊 지역별 차트 생성 시작...');
    
    try {
        // 데이터 분석 결과 가져오기
        const regionAnalysis = extractRegionAnalysis(dashboardData.data);
        
        // 데이터 유효성 검사
        if (!regionAnalysis || Object.keys(regionAnalysis).length === 0) {
            console.warn('⚠️ 지역별 차트 생성을 위한 데이터가 없습니다.');
            return;
        }
        
        // 차트 데이터 준비
        const regions = Object.keys(regionAnalysis);
        const counts = regions.map(region => regionAnalysis[region].count);
        
        // 색상 설정
        const backgroundColors = [
            'rgba(54, 162, 235, 0.6)',  // 파란색
            'rgba(75, 192, 192, 0.6)',  // 초록색
            'rgba(255, 159, 64, 0.6)',  // 주황색
            'rgba(153, 102, 255, 0.6)', // 보라색
            'rgba(255, 99, 132, 0.6)'   // 빨간색
        ];
        
        // 차트 생성
        const ctx = document.getElementById('regionChart');
        if (!ctx) {
            console.warn('⚠️ 지역별 차트 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 차트 제거
        if (charts.regionChart) {
            charts.regionChart.destroy();
        }
        
        charts.regionChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: regions,
                datasets: [{
                    label: '매물 수',
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, regions.length),
                    borderColor: backgroundColors.slice(0, regions.length).map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `매물 수: ${context.raw}개`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        console.log('✅ 지역별 차트 생성 완료!');
    } catch (error) {
        console.error('❌ 지역별 차트 생성 중 오류 발생:', error);
    }
}

// 가격대별 차트 생성
function createPriceChart(dashboardData) {
    console.log('📊 가격대별 차트 생성 시작...');
    
    try {
        // 데이터 분석 결과 가져오기
        const priceAnalysis = extractPriceAnalysis(dashboardData.data);
        
        // 데이터 유효성 검사
        if (!priceAnalysis || Object.keys(priceAnalysis).length === 0) {
            console.warn('⚠️ 가격대별 차트 생성을 위한 데이터가 없습니다.');
            return;
        }
        
        // 차트 데이터 준비
        const priceRanges = Object.keys(priceAnalysis);
        const counts = priceRanges.map(range => priceAnalysis[range].count);
        
        // 색상 설정
        const backgroundColors = [
            'rgba(255, 99, 132, 0.6)',   // 빨간색
            'rgba(255, 159, 64, 0.6)',   // 주황색
            'rgba(255, 205, 86, 0.6)',   // 노란색
            'rgba(75, 192, 192, 0.6)',   // 초록색
            'rgba(54, 162, 235, 0.6)',   // 파란색
            'rgba(153, 102, 255, 0.6)'   // 보라색
        ];
        
        // 차트 생성
        const ctx = document.getElementById('priceRangeChart');
        if (!ctx) {
            console.warn('⚠️ 가격대별 차트 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 차트 제거
        if (charts.priceRangeChart) {
            charts.priceRangeChart.destroy();
        }
        
        charts.priceRangeChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: priceRanges,
                datasets: [{
                    label: '매물 수',
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, priceRanges.length),
                    borderColor: backgroundColors.slice(0, priceRanges.length).map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${value}건 (${percentage}%)`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0
                        }
                    }
                }
            }
        });
        
        console.log('✅ 가격대별 차트 생성 완료!');
    } catch (error) {
        console.error('❌ 가격대별 차트 생성 중 오류 발생:', error);
    }
}

// 매물 종류별 차트 생성
function createPropertyChart(dashboardData) {
    console.log('📊 매물 종류별 차트 생성 시작...');
    
    try {
        // 데이터 분석 결과 가져오기
        const propertyAnalysis = extractPropertyAnalysis(dashboardData.data);
        
        // 데이터 유효성 검사
        if (!propertyAnalysis || Object.keys(propertyAnalysis).length === 0) {
            console.warn('⚠️ 매물 종류별 차트 생성을 위한 데이터가 없습니다.');
            return;
        }
        
        // 차트 데이터 준비
        const propertyTypes = Object.keys(propertyAnalysis);
        const counts = propertyTypes.map(type => propertyAnalysis[type].count);
        
        // 색상 설정
        const backgroundColors = [
            'rgba(54, 162, 235, 0.6)',   // 파란색 (아파트)
            'rgba(255, 99, 132, 0.6)',   // 빨간색 (오피스텔)
            'rgba(255, 159, 64, 0.6)',   // 주황색 (주택)
            'rgba(75, 192, 192, 0.6)',   // 초록색 (상가)
            'rgba(153, 102, 255, 0.6)',  // 보라색 (토지)
            'rgba(201, 203, 207, 0.6)'   // 회색 (기타)
        ];
        
        // 차트 생성
        const ctx = document.getElementById('propertyTypeChart');
        if (!ctx) {
            console.warn('⚠️ 매물 종류별 차트 요소를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 차트 제거
        if (charts.propertyTypeChart) {
            charts.propertyTypeChart.destroy();
        }
        
        charts.propertyTypeChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: propertyTypes,
                datasets: [{
                    data: counts,
                    backgroundColor: backgroundColors.slice(0, propertyTypes.length),
                    borderColor: backgroundColors.slice(0, propertyTypes.length).map(color => color.replace('0.6', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 12
                            },
                            padding: 15
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: ${value}건 (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        console.log('✅ 매물 종류별 차트 생성 완료!');
    } catch (error) {
        console.error('❌ 매물 종류별 차트 생성 중 오류 발생:', error);
    }
}

// 지역별 데이터 분석
function extractRegionAnalysis(data) {
    const regionCounts = {};
    
    // 각 지역별 매물 수 집계
    data.forEach(item => {
        const region = item.region || '기타';
        
        if (!regionCounts[region]) {
            regionCounts[region] = {
                count: 0,
                property_types: {}
            };
        }
        
        regionCounts[region].count++;
        
        // 매물 유형별 집계
        const propertyType = item.maemulinfo || '기타';
        if (!regionCounts[region].property_types[propertyType]) {
            regionCounts[region].property_types[propertyType] = 0;
        }
        regionCounts[region].property_types[propertyType]++;
    });
    
    return regionCounts;
}

// 가격대별 데이터 분석
function extractPriceAnalysis(data) {
    // 가격대 정의
    const priceRanges = {
        '1억 미만': { min: 0, max: 100000000, count: 0 },
        '1억~2억': { min: 100000000, max: 200000000, count: 0 },
        '2억~3억': { min: 200000000, max: 300000000, count: 0 },
        '3억~5억': { min: 300000000, max: 500000000, count: 0 },
        '5억~10억': { min: 500000000, max: 1000000000, count: 0 },
        '10억 이상': { min: 1000000000, max: Infinity, count: 0 }
    };
    
    // 각 가격대별 매물 수 집계
    data.forEach(item => {
        const price = parseInt(item.minprice) || 0;
        
        for (const [range, { min, max }] of Object.entries(priceRanges)) {
            if (price >= min && price < max) {
                priceRanges[range].count++;
                break;
            }
        }
    });
    
    // 빈 가격대 제거
    const filteredRanges = {};
    for (const [range, info] of Object.entries(priceRanges)) {
        if (info.count > 0) {
            filteredRanges[range] = info;
        }
    }
    
    return filteredRanges;
}

// 매물 종류별 데이터 분석
function extractPropertyAnalysis(data) {
    const propertyCounts = {};
    
    // 각 매물 종류별 집계
    data.forEach(item => {
        let propertyType = item.maemulinfo || '기타';
        
        // 매물 종류 단순화
        if (propertyType.includes('아파트')) {
            propertyType = '아파트';
        } else if (propertyType.includes('오피스텔')) {
            propertyType = '오피스텔';
        } else if (propertyType.includes('주택') || propertyType.includes('다가구')) {
            propertyType = '주택/다세대';
        } else if (propertyType.includes('상가') || propertyType.includes('근린')) {
            propertyType = '상가';
        } else if (propertyType.includes('토지') || propertyType.includes('임야')) {
            propertyType = '토지';
        }
        
        if (!propertyCounts[propertyType]) {
            propertyCounts[propertyType] = {
                count: 0,
                regions: {}
            };
        }
        
        propertyCounts[propertyType].count++;
        
        // 지역별 집계
        const region = item.region || '기타';
        if (!propertyCounts[propertyType].regions[region]) {
            propertyCounts[propertyType].regions[region] = 0;
        }
        propertyCounts[propertyType].regions[region]++;
    });
    
    return propertyCounts;
}

// 차트 렌더러 모듈 내보내기
window.chartRenderer = {
    initializeCharts,
    destroyAllCharts,
    createRegionChart,
    createPriceChart,
    createPropertyChart
}; 