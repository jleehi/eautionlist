// 메인 대시보드 스크립트 - 모듈들을 통합하고 초기화하는 역할을 합니다

// 전역 변수
let auctionData = []; // 경매 데이터
let filteredData = []; // 필터링된 데이터
let isDataLoaded = false; // 데이터 로드 완료 여부
let isAppInitialized = false; // 앱 초기화 여부

// 문서 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 대시보드 초기화 시작...');
    
    // 디버깅 정보 표시
    console.log('📊 브라우저 정보:', navigator.userAgent);
    console.log('📊 현재 URL:', window.location.href);
    
    // 모듈 로드 확인
    checkModulesLoaded();
    
    // 강제 새로고침 버튼에 이벤트 리스너 추가
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleForceRefreshClick);
    }
    
    // 샘플 데이터 경고 메시지 내의 강제 새로고침 버튼에 이벤트 리스너 추가
    const forceRefreshButton = document.getElementById('forceRefreshButton');
    if (forceRefreshButton) {
        forceRefreshButton.addEventListener('click', handleForceRefreshClick);
    }
});

// 모듈 로드 확인
function checkModulesLoaded() {
    console.log('🔍 모듈 로드 상태 확인...');
    
    // 필요한 모듈 확인
    const requiredModules = [
        { name: 'dataLoader', obj: window.dataLoader },
        { name: 'chartRenderer', obj: window.chartRenderer },
        { name: 'mapHandler', obj: window.mapHandler },
        { name: 'uiController', obj: window.uiController },
        { name: 'firebaseDB', obj: window.firebaseDB }
    ];
    
    // 모듈 로드 상태 확인
    const missingModules = requiredModules.filter(module => !module.obj);
    
    if (missingModules.length > 0) {
        console.warn(`⚠️ 다음 모듈이 로드되지 않았습니다: ${missingModules.map(m => m.name).join(', ')}`);
        console.warn('⚠️ 5초 후 다시 시도합니다...');
        
        // 5초 후 다시 확인
        setTimeout(checkModulesLoaded, 5000);
    } else {
        console.log('✅ 모든 모듈이 로드되었습니다!');
        initializeApplication();
    }
}

// 애플리케이션 초기화
function initializeApplication() {
    // 중복 초기화 방지
    if (isAppInitialized) {
        console.log('✅ 애플리케이션이 이미 초기화되었습니다.');
        return;
    }
    
    console.log('🚀 애플리케이션 초기화 시작...');
    
    try {
        // UI 컨트롤러 초기화
        if (window.uiController && typeof window.uiController.initializeUI === 'function') {
            window.uiController.initializeUI();
        } else {
            console.error('❌ UI 컨트롤러를 초기화할 수 없습니다.');
        }
        
        // 지도 초기화
        if (window.mapHandler && typeof window.mapHandler.initializeMap === 'function') {
            window.mapHandler.initializeMap();
        } else {
            console.error('❌ 지도 핸들러를 초기화할 수 없습니다.');
        }
        
        // 이벤트 리스너 등록
        registerEventListeners();
        
        // 데이터 로드 시작
        if (window.dataLoader && typeof window.dataLoader.loadDashboardData === 'function') {
            window.dataLoader.loadDashboardData(handleInitialDataLoaded);
        } else {
            console.error('❌ 데이터 로더를 초기화할 수 없습니다.');
            // 대체 데이터 로드 시도
            fallbackDataLoad();
        }
        
        // 초기화 완료 표시
        isAppInitialized = true;
        console.log('✅ 애플리케이션 초기화 완료!');
    } catch (error) {
        console.error('❌ 애플리케이션 초기화 중 오류 발생:', error);
    }
}

// 이벤트 리스너 등록
function registerEventListeners() {
    console.log('🔄 이벤트 리스너 등록...');
    
    // 데이터 로드 이벤트 리스너 등록
    document.addEventListener('dataLoaded', handleDataLoaded);
    document.addEventListener('auctionDataLoaded', handleDataLoaded);
    
    // 지도 초기화 이벤트 리스너 등록
    document.addEventListener('mapInitialized', handleMapInitialized);
    
    // 지도 로드 실패 이벤트 리스너 등록
    document.addEventListener('mapLoadFailed', handleMapLoadFailed);
    
    // 필터 변경 이벤트 리스너 등록
    document.addEventListener('filterChanged', handleFilterChange);
    
    // 정렬 변경 이벤트 리스너 등록
    document.addEventListener('tableSortChanged', handleTableSortChange);
    
    // 페이지 변경 이벤트 리스너 등록
    document.addEventListener('pageChanged', handlePageChange);
    
    console.log('✅ 이벤트 리스너 등록 완료!');
}

// 초기 데이터 로드 완료 핸들러
function handleInitialDataLoaded(data) {
    console.log('📊 초기 데이터 로드 완료:', data);
    
    // 데이터가 없는 경우 대체 데이터 로드
    if (!data || !data.data || !Array.isArray(data.data) || data.data.length === 0) {
        console.warn('⚠️ 유효한 데이터가 로드되지 않았습니다. 대체 데이터를 로드합니다.');
        fallbackDataLoad();
        return;
    }
    
    // 데이터 설정
    auctionData = data.data;
    filteredData = [...auctionData];
    isDataLoaded = true;
    
    // 대시보드 업데이트
    updateDashboard();
}

// 대체 데이터 로드
function fallbackDataLoad() {
    console.log('🔄 대체 데이터 로드 시도...');
    
    // 로컬 JSON 파일에서 직접 로드 시도
    fetch('dashboard_data.json')
        .then(response => response.json())
        .then(data => {
            console.log('✅ 대체 데이터 로드 성공!');
            
            // 데이터 설정
            auctionData = data.data;
            filteredData = [...auctionData];
            isDataLoaded = true;
            
            // 대시보드 업데이트
            updateDashboard();
        })
        .catch(error => {
            console.error('❌ 대체 데이터 로드 실패:', error);
            
            // 샘플 데이터 생성
            console.log('🔄 샘플 데이터 생성...');
            const sampleData = window.dataLoader ? window.dataLoader.generateSampleData() : { data: [] };
            
            // 데이터 설정
            auctionData = sampleData.data;
            filteredData = [...auctionData];
            isDataLoaded = true;
            
            // 대시보드 업데이트
            updateDashboard();
        });
}

// 데이터 로드 완료 핸들러
function handleDataLoaded(event) {
    console.log('📊 대시보드 초기화 시작...');
    
    // 데이터 가져오기
    auctionData = event.detail.data || [];
    
    console.log(`📊 대시보드 초기화 - 총 ${auctionData.length}개의 매물 데이터`);
    
    // 중복 초기화 방지
    if (isDataLoaded) {
        console.log('✅ 데이터가 이미 로드되었습니다. 대시보드를 업데이트합니다.');
        updateDashboard();
        return;
    }
    
    // 데이터 로드 완료 표시
    isDataLoaded = true;
    
    // 필터링된 데이터 초기화
    filteredData = [...auctionData];
    
    // 대시보드 업데이트
    updateDashboard();
}

// 지도 초기화 완료 핸들러
function handleMapInitialized() {
    console.log('🗺️ 지도 초기화 완료! 매물을 지도에 표시합니다.');
    
    // 데이터가 로드되었는지 확인
    if (isDataLoaded) {
        // 지도에 매물 표시
        displayPropertiesOnMap();
    }
}

// 지도 로드 실패 핸들러
function handleMapLoadFailed() {
    console.log('🗺️ 지도 로드 실패! 대체 UI를 표시합니다.');
    
    // 대체 UI가 이미 표시되었으므로 추가 작업 필요 없음
    // 사용자에게 알림
    const mapErrorAlert = document.getElementById('mapErrorAlert');
    if (mapErrorAlert) {
        mapErrorAlert.style.display = 'block';
        mapErrorAlert.textContent = '지도를 로드할 수 없습니다. 매물 정보는 아래 테이블에서 확인하실 수 있습니다.';
        
        // 5초 후 알림 숨김
        setTimeout(() => {
            mapErrorAlert.style.display = 'none';
        }, 5000);
    }
}

// 매물 종류 버튼(.filter-btn)의 라벨 → 수집 데이터의 maemulinfo 에 들어가는 낱말
const PROPERTY_TYPE_KEYWORDS = {
    '아파트': ['아파트'],
    '오피스텔': ['오피스텔'],
    '주택/빌라': ['단독주택', '다가구주택', '다세대', '연립', '빌라'],
    '상가/사무실': ['근린생활', '상가', '사무실', '업무시설'],
    '토지': ['대지', '임야', '토지', '전', '답']
};

// 필터 변경 핸들러 (ui_controller 의 filterChanged 이벤트를 받는다)
function handleFilterChange(event) {
    const filter = (event && event.detail && event.detail.filter) || 'all';
    console.log(`🔍 필터 변경 감지: ${filter}`);
    
    if (filter === 'all') {
        filteredData = [...auctionData];
    } else if (filter === '기타') {
        const known = Object.values(PROPERTY_TYPE_KEYWORDS).flat();
        filteredData = auctionData.filter(item =>
            !known.some(keyword => (item.type || '').includes(keyword)));
    } else {
        const keywords = PROPERTY_TYPE_KEYWORDS[filter] || [filter];
        filteredData = auctionData.filter(item =>
            keywords.some(keyword => (item.type || '').includes(keyword)));
    }
    
    console.log(`🔍 필터링 완료! ${filteredData.length}개의 매물이 선택되었습니다.`);
    
    // 대시보드 업데이트
    updateDashboard();
}

// 새로고침 핸들러
function handleRefresh() {
    console.log('🔄 데이터 새로고침 요청!');
    
    // 데이터 다시 로드
    window.dataLoader.loadDashboardData();
}

// 대시보드 업데이트
function updateDashboard() {
    console.log('📊 대시보드 업데이트 시작...');
    
    // 기본 통계 업데이트
    updateBasicStats();
    
    // 차트 업데이트
    updateCharts();
    
    // 경매 테이블 업데이트
    updateAuctionTable();
    
    // 지도에 매물 표시
    displayPropertiesOnMap();
    
    console.log('✅ 대시보드 업데이트 완료!');
}

// 기본 통계 업데이트
function updateBasicStats() {
    console.log('📊 기본 통계 업데이트 시작...');
    
    const prices = filteredData
        .map(item => parseFloat(item.minBidPrice))
        .filter(price => !isNaN(price) && price > 0);
    
    // 총 매물 수
    document.getElementById('totalProperties').textContent = filteredData.length;
    
    // 평균 / 최저 / 최고 최저입찰가
    const average = prices.length
        ? prices.reduce((acc, price) => acc + price, 0) / prices.length
        : 0;
    document.getElementById('averagePrice').textContent = formatCurrency(average);
    document.getElementById('lowestPrice').textContent =
        prices.length ? formatCurrency(Math.min(...prices)) : '-';
    document.getElementById('highestPrice').textContent =
        prices.length ? formatCurrency(Math.max(...prices)) : '-';
    
    // 마지막 업데이트 시간 — 화면을 연 시각이 아니라 데이터가 만들어진 시각
    document.getElementById('lastUpdated').textContent = getDataTimestamp();
    document.getElementById('footerLastUpdated').textContent = getDataTimestamp();
    
    console.log('✅ 기본 통계 업데이트 완료!');
}

// 데이터가 만들어진 시각 (없으면 알 수 없음으로 표기)
function getDataTimestamp() {
    const loader = window.dataLoader;
    const data = loader && loader.getDashboardData ? loader.getDashboardData() : null;
    
    return (data && data.last_updated) ? data.last_updated : '시각 정보 없음';
}

// 통화 포맷팅 함수 (입력 단위: 원)
function formatCurrency(value) {
    const won = parseFloat(value);
    if (isNaN(won) || won <= 0) return '정보없음';
    
    const billion = Math.floor(won / 100000000);
    const million = Math.round((won % 100000000) / 10000);
    
    if (billion > 0) {
        return million > 0 ? `${billion}억 ${million.toLocaleString()}만원` : `${billion}억원`;
    }
    return `${million.toLocaleString()}만원`;
}

// 차트 업데이트
function updateCharts() {
    // 차트 렌더러는 { data: [...] } 형태를 읽는다
    window.chartRenderer.initializeCharts({ data: filteredData });
}

// 경매 테이블 업데이트
function updateAuctionTable() {
    console.log('📋 경매 테이블 업데이트 시작...');
    
    const tableBody = document.getElementById('auctionTableBody');
    
    // 테이블 초기화
    tableBody.innerHTML = '';
    
    // 데이터가 없는 경우
    if (filteredData.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                표시할 데이터가 없습니다.
            </td>
        `;
        tableBody.appendChild(row);
        
        console.log('✅ 경매 테이블 업데이트 완료! (데이터 없음)');
        return;
    }
    
    // 데이터 행 추가
    filteredData.forEach(item => {
        const row = document.createElement('tr');
        
        // 할인율 계산
        const discountRate = parseFloat(item.discountRate) || 0;
        
        // 할인율에 따른 클래스 설정
        let discountClass = 'text-gray-900';
        if (discountRate >= 30) {
            discountClass = 'text-red-600 font-bold';
        } else if (discountRate >= 20) {
            discountClass = 'text-orange-600 font-semibold';
        }
        
        // 행 내용 설정
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm text-gray-900">${item.address}</div>
                <div class="text-xs text-gray-500">${item.region || ''}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    ${item.type || '기타'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatCurrency(parseFloat(item.appraisedValue))}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatCurrency(parseFloat(item.minBidPrice))}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="${discountClass}">
                    ${discountRate.toFixed(1)}%
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${formatDate(item.bidDate)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                ${item.link ? `<a href="${item.link}" target="_blank" class="text-blue-600 hover:text-blue-900">상세정보</a>` : '-'}
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    console.log('✅ 경매 테이블 업데이트 완료!');
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
    if (!dateString) return '-';
    
    const date = new Date(dateString);
    
    // 유효한 날짜인지 확인
    if (isNaN(date.getTime())) {
        return dateString;
    }
    
    return date.toLocaleDateString();
}

// 지도에 매물 표시
function displayPropertiesOnMap() {
    console.log('🗺️ 지도에 모든 매물 표시 시작...');
    
    // 지도 핸들러 모듈 호출
    if (window.mapHandler && typeof window.mapHandler.displayPropertiesOnMap === 'function') {
        window.mapHandler.displayPropertiesOnMap(filteredData);
    } else {
        console.log('🔄 지도가 아직 초기화되지 않았습니다. 이벤트 리스너 등록...');
    }
}

// 정렬 변경 핸들러
function handleTableSortChange(event) {
    console.log('🔄 테이블 정렬 변경:', event.detail);
    
    // 정렬 필드와 방향 가져오기
    const { field, direction } = event.detail;
    
    // 데이터 정렬
    filteredData.sort((a, b) => {
        // 문자열인 경우 대소문자 구분 없이 비교
        if (typeof a[field] === 'string' && typeof b[field] === 'string') {
            const aValue = a[field].toLowerCase();
            const bValue = b[field].toLowerCase();
            
            if (direction === 'asc') {
                return aValue.localeCompare(bValue);
            } else {
                return bValue.localeCompare(aValue);
            }
        }
        // 숫자인 경우 숫자 비교
        else if (!isNaN(parseFloat(a[field])) && !isNaN(parseFloat(b[field]))) {
            const aValue = parseFloat(a[field]);
            const bValue = parseFloat(b[field]);
            
            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        }
        // 날짜인 경우 날짜 비교
        else if (field === 'auctiondate' || field.includes('date')) {
            const aValue = new Date(a[field]);
            const bValue = new Date(b[field]);
            
            if (direction === 'asc') {
                return aValue - bValue;
            } else {
                return bValue - aValue;
            }
        }
        // 기타 경우
        else {
            if (direction === 'asc') {
                return a[field] > b[field] ? 1 : -1;
            } else {
                return a[field] < b[field] ? 1 : -1;
            }
        }
    });
    
    // 테이블 업데이트
    updateAuctionTable();
}

// 페이지 변경 핸들러
function handlePageChange(event) {
    console.log('🔄 페이지 변경:', event.detail);
    
    // 현재 페이지 업데이트
    currentPage = event.detail.page;
    
    // 테이블 업데이트
    updateAuctionTable();
}

// 강제 새로고침 버튼 이벤트 핸들러
function handleForceRefreshClick() {
    console.log('🔄 강제 새로고침 요청됨');
    
    // 로딩 표시기 표시
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = 'flex';
    }
    
    // 로딩 상태 표시
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.textContent = 'Firebase에서 최신 데이터를 강제로 불러오는 중...';
    }
    
    // 캐시 무효화
    if (window.firebaseDB) {
        window.firebaseDB.clearCache();
    }
    
    // 로컬 스토리지 캐시 삭제
    localStorage.removeItem('auction_data_cache');
    localStorage.removeItem('auction_data_cache_date');
    
    // 데이터 다시 로드
    if (window.dataLoader) {
        window.dataLoader.reloadData();
    } else {
        // 페이지 새로고침
        window.location.reload();
    }
}