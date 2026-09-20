// UI 컨트롤러 모듈 - 대시보드 UI 관련 기능을 담당합니다
// 버튼 클릭, 필터링, 정렬 등의 UI 이벤트를 처리합니다

// 전역 변수
let currentPage = 1; // 현재 페이지
const itemsPerPage = 10; // 페이지당 항목 수
let sortField = 'auctiondate'; // 정렬 필드
let sortDirection = 'asc'; // 정렬 방향
let activeFilter = 'all'; // 활성화된 필터

// UI 초기화
function initializeUI() {
    console.log('🎨 UI 컨트롤러: UI 초기화 시작...');
    
    // 이벤트 리스너 등록
    uiRegisterEventListeners();
    
    // 테이블 정렬 이벤트 등록
    initializeTableSorting();
    
    // 필터 버튼 이벤트 등록
    initializeFilterButtons();
    
    // 모달 이벤트 등록
    initializeModal();
    
    // 데이터 로드 이벤트 리스너 등록
    document.addEventListener('auctionDataLoaded', uiHandleDataLoaded);
    
    console.log('✅ UI 컨트롤러: UI 초기화 완료!');
}

// 이벤트 리스너 등록
function uiRegisterEventListeners() {
    console.log('🔄 UI 컨트롤러: 이벤트 리스너 등록...');
    
    // 새로고침 버튼 이벤트 리스너
    const refreshButton = document.getElementById('refreshButton');
    if (refreshButton) {
        refreshButton.addEventListener('click', handleRefreshClick);
    }
    
    // 강제 새로고침 버튼 이벤트 리스너
    const forceRefreshButton = document.getElementById('forceRefreshButton');
    if (forceRefreshButton) {
        forceRefreshButton.addEventListener('click', uiHandleForceRefreshClick);
    }
    
    // 페이지네이션 이벤트 위임
    const pagination = document.getElementById('pagination');
    if (pagination) {
        pagination.addEventListener('click', handlePaginationClick);
    }
}

// 새로고침 버튼 클릭 핸들러
function handleRefreshClick() {
    console.log('🔄 UI 컨트롤러: 새로고침 버튼 클릭!');
    
    // 로딩 표시기 표시
    uiShowLoadingIndicator(true);
    
    // 데이터 로더 모듈을 통해 데이터 새로고침
    if (window.dataLoader) {
        window.dataLoader.loadDashboardData();
    }
}

// 강제 새로고침 버튼 클릭 핸들러
function uiHandleForceRefreshClick() {
    console.log('🔄 UI 컨트롤러: 강제 새로고침 버튼 클릭!');
    
    // 로딩 표시기 표시
    uiShowLoadingIndicator(true);
    
    // URL에 refresh 파라미터 추가
    const url = new URL(window.location.href);
    url.searchParams.set('refresh', Date.now());
    window.history.replaceState({}, document.title, url);
    
    // 로컬 스토리지의 캐시된 데이터 삭제
    localStorage.removeItem('auction_data');
    localStorage.removeItem('auction_data_last_updated');
    console.log('🗑️ 로컬 스토리지의 캐시된 데이터를 삭제했습니다.');
    
    // 데이터 로더 모듈을 통해 데이터 강제 새로고침
    if (window.dataLoader) {
        window.dataLoader.loadDashboardData();
    }
}

// 데이터 로드 완료 핸들러
function uiHandleDataLoaded(event) {
    console.log('📊 UI 컨트롤러: 데이터 로드 완료!');
    
    // 로딩 표시기 숨기기
    uiShowLoadingIndicator(false);
    
    // 데이터 소스 표시
    updateDataSourceInfo(event.detail);
}

// 데이터 소스 정보 업데이트
function updateDataSourceInfo(data) {
    const dataSourceElement = document.getElementById('dataSource');
    if (dataSourceElement && data) {
        let sourceText = '';
        let sourceClass = '';
        let isSample = data.is_sample === true;
        
        // 데이터 소스에 따라 다른 텍스트와 색상 표시
        if (data.source === 'firebase-rtdb') {
            sourceText = '🔥 Firebase 실시간 DB에서 로드됨';
            sourceClass = 'text-blue-600';
        } else if (data.source === 'firebase-rtdb-subscription') {
            sourceText = '🔥 Firebase 실시간 구독에서 로드됨';
            sourceClass = 'text-blue-600';
        } else if (data.source === 'local-storage') {
            sourceText = '💾 로컬 스토리지 캐시에서 로드됨';
            sourceClass = 'text-green-600';
        } else if (data.source === 'local-json') {
            sourceText = '📄 로컬 JSON 파일에서 로드됨';
            sourceClass = 'text-yellow-600';
        } else if (data.source === 'global-variable') {
            sourceText = '🌐 전역 변수에서 로드됨';
            sourceClass = 'text-purple-600';
        } else if (data.source === 'sample-data') {
            sourceText = '📋 샘플 데이터 (실제 데이터 아님)';
            sourceClass = 'text-red-600';
            isSample = true;
        } else {
            sourceText = '❓ 알 수 없는 소스';
            sourceClass = 'text-gray-600';
        }
        
        // 로드 시간 추가
        if (data.loadedAt) {
            const loadTime = new Date(data.loadedAt);
            const formattedTime = `${loadTime.getHours().toString().padStart(2, '0')}:${loadTime.getMinutes().toString().padStart(2, '0')}:${loadTime.getSeconds().toString().padStart(2, '0')}`;
            sourceText += ` (${formattedTime})`;
        }
        
        // 마지막 업데이트 날짜 표시
        if (data.last_updated) {
            const lastUpdated = document.getElementById('lastUpdated');
            if (lastUpdated) {
                lastUpdated.textContent = data.last_updated;
            }
            
            const footerLastUpdated = document.getElementById('footerLastUpdated');
            if (footerLastUpdated) {
                footerLastUpdated.textContent = data.last_updated;
            }
        }
        
        // 데이터 소스 정보 업데이트
        dataSourceElement.textContent = sourceText;
        dataSourceElement.className = `ml-2 text-sm ${sourceClass}`;
        
        // 샘플 데이터인 경우 경고 표시
        showSampleDataWarning(isSample, data.last_updated);
    }
}

// 샘플 데이터 경고 표시
function showSampleDataWarning(isSample, lastUpdated) {
    // 경고 메시지 요소가 없으면 생성
    let warningElement = document.getElementById('sampleDataWarning');
    if (!warningElement) {
        warningElement = document.createElement('div');
        warningElement.id = 'sampleDataWarning';
        warningElement.className = 'bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4';
        
        // 경고 메시지를 헤더 다음에 삽입
        const header = document.querySelector('header');
        if (header && header.nextSibling) {
            header.parentNode.insertBefore(warningElement, header.nextSibling);
        }
    }
    
    // 샘플 데이터인 경우 경고 메시지 표시, 아니면 숨김
    if (isSample) {
        let dateInfo = lastUpdated ? `(${lastUpdated} 기준)` : '';
        warningElement.innerHTML = `
            <div class="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
                </svg>
                <p><strong>주의:</strong> 현재 표시되는 데이터는 샘플 데이터입니다 ${dateInfo}. 실제 경매 정보가 아닙니다.</p>
            </div>
            <p class="mt-2">Firebase RTDB 연결을 확인하거나 <button id="forceRefreshButton" class="text-blue-600 underline">강제 새로고침</button>을 시도해보세요.</p>
        `;
        warningElement.style.display = 'block';
        
        // 경고 메시지 내의 강제 새로고침 버튼에 이벤트 리스너 추가
        const refreshButton = warningElement.querySelector('#forceRefreshButton');
        if (refreshButton) {
            refreshButton.addEventListener('click', uiHandleForceRefreshClick);
        }
    } else {
        warningElement.style.display = 'none';
    }
}

// 로딩 표시기 표시/숨기기
function uiShowLoadingIndicator(show) {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        if (show) {
            loadingContainer.classList.remove('hidden');
        } else {
            loadingContainer.classList.add('hidden');
        }
    }
}

// 테이블 정렬 초기화
function initializeTableSorting() {
    console.log('🔄 UI 컨트롤러: 테이블 정렬 초기화...');
    
    const tableHeaders = document.querySelectorAll('#auctionTable th[data-sort]');
    
    tableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.getAttribute('data-sort');
            
            // 같은 필드를 클릭한 경우 정렬 방향 전환
            if (field === sortField) {
                sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                sortField = field;
                sortDirection = 'asc';
            }
            
            // 정렬 화살표 업데이트
            updateSortArrows(field);
            
            // 테이블 정렬 및 업데이트 이벤트 발생
            document.dispatchEvent(new CustomEvent('tableSortChanged', {
                detail: { field: sortField, direction: sortDirection }
            }));
        });
    });
}

// 정렬 화살표 업데이트
function updateSortArrows(field) {
    const tableHeaders = document.querySelectorAll('#auctionTable th[data-sort]');
    
    tableHeaders.forEach(header => {
        const arrow = header.querySelector('.sort-arrow');
        const headerField = header.getAttribute('data-sort');
        
        if (arrow) {
            // 정렬 필드가 현재 필드인 경우
            if (headerField === field) {
                arrow.classList.remove('asc', 'desc');
                arrow.classList.add(sortDirection);
            } else {
                arrow.classList.remove('asc', 'desc');
            }
        }
    });
}

// 필터 버튼 초기화
function initializeFilterButtons() {
    console.log('🔄 UI 컨트롤러: 필터 버튼 초기화...');
    
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');
            
            // 활성화된 필터 업데이트
            activeFilter = filter;
            
            // 버튼 활성화 상태 업데이트
            updateFilterButtonsState();
            
            // 필터 변경 이벤트 발생
            document.dispatchEvent(new CustomEvent('filterChanged', {
                detail: { filter: activeFilter }
            }));
        });
    });
}

// 필터 버튼 상태 업데이트
function updateFilterButtonsState() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    
    filterButtons.forEach(button => {
        const filter = button.getAttribute('data-filter');
        
        if (filter === activeFilter) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

// 모달 초기화
function initializeModal() {
    console.log('🔄 UI 컨트롤러: 모달 초기화...');
    
    const modal = document.getElementById('propertyModal');
    const closeModalButton = document.getElementById('closeModalButton');
    const closeModal = document.getElementById('closeModal');
    
    if (closeModalButton) {
        closeModalButton.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
    }
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

// 페이지네이션 클릭 핸들러
function handlePaginationClick(event) {
    const target = event.target;
    
    if (target.classList.contains('pagination-btn')) {
        const page = parseInt(target.getAttribute('data-page'));
        
        if (!isNaN(page)) {
            currentPage = page;
            
            // 페이지 변경 이벤트 발생
            document.dispatchEvent(new CustomEvent('pageChanged', {
                detail: { page: currentPage }
            }));
        }
    }
}

// 모달 표시
function showPropertyModal(property) {
    console.log('🔄 UI 컨트롤러: 매물 모달 표시...');
    
    const modal = document.getElementById('propertyModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalContent = document.getElementById('modalContent');
    
    if (modal && modalTitle && modalContent) {
        // 모달 제목 설정
        modalTitle.textContent = `매물 상세 정보 - ${property.address || '주소 없음'}`;
        
        // 모달 내용 설정
        modalContent.innerHTML = generatePropertyModalContent(property);
        
        // 모달 표시
        modal.classList.remove('hidden');
    }
}

// 매물 모달 내용 생성
function generatePropertyModalContent(property) {
    let content = '<div class="space-y-4">';
    
    // 기본 정보
    content += '<div class="border-b pb-4">';
    content += '<h4 class="font-semibold text-lg mb-2">기본 정보</h4>';
    content += '<div class="grid grid-cols-2 gap-2">';
    content += `<div><span class="font-medium">종류:</span> ${property.maemulinfo || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">법원:</span> ${property.court || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">사건번호:</span> ${property.id || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">경매일:</span> ${property.auctiondate || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">경매회차:</span> ${property.auctioncount || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">상태:</span> ${property.status || '정보 없음'}</div>`;
    content += '</div>';
    content += '</div>';
    
    // 가격 정보
    content += '<div class="border-b pb-4">';
    content += '<h4 class="font-semibold text-lg mb-2">가격 정보</h4>';
    content += '<div class="grid grid-cols-2 gap-2">';
    content += `<div><span class="font-medium">감정가:</span> ${property.simpleminestimatedprice || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">최저입찰가:</span> ${property.simpleminprice || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">할인율:</span> ${property.percent || '0'}%</div>`;
    content += '</div>';
    content += '</div>';
    
    // 위치 정보
    content += '<div class="border-b pb-4">';
    content += '<h4 class="font-semibold text-lg mb-2">위치 정보</h4>';
    content += '<div class="grid grid-cols-1 gap-2">';
    content += `<div><span class="font-medium">주소:</span> ${property.address || '정보 없음'}</div>`;
    content += `<div><span class="font-medium">지역:</span> ${property.region || ''} ${property.subregion || ''}</div>`;
    content += '</div>';
    content += '</div>';
    
    // 링크
    content += '<div class="mt-4">';
    content += '<h4 class="font-semibold text-lg mb-2">관련 링크</h4>';
    content += '<div class="flex flex-wrap gap-2">';
    
    if (property.auctionmsg_url) {
        content += `<a href="${property.auctionmsg_url}" target="_blank" class="inline-flex items-center px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600">`;
        content += '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">';
        content += '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />';
        content += '</svg>';
        content += '경매알리미에서 보기';
        content += '</a>';
    }
    
    if (property.specpdfurl) {
        content += `<a href="${property.specpdfurl}" target="_blank" class="inline-flex items-center px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">`;
        content += '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">';
        content += '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />';
        content += '</svg>';
        content += '법원 매각명세서';
        content += '</a>';
    }
    
    content += '</div>';
    content += '</div>';
    
    content += '</div>';
    
    return content;
}

// 전역 객체로 노출
window.uiController = {
    initializeUI,
    showPropertyModal,
    updateFilterButtonsState,
    uiShowLoadingIndicator,
    updateDataSourceInfo
}; 