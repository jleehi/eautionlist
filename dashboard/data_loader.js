// 데이터 로더 모듈 - 대시보드 데이터 로드 관련 기능을 담당합니다
// Firebase, 로컬 JSON, 전역 변수 등 다양한 소스에서 데이터를 로드합니다

// 전역 변수
let dashboardData = null; // 로드된 대시보드 데이터
let dataLoaded = false; // 데이터 로드 완료 여부
let loadAttempts = 0; // 로드 시도 횟수
const MAX_LOAD_ATTEMPTS = 3; // 최대 로드 시도 횟수

// 대시보드 데이터 로드 함수
function loadDashboardData(callback) {
    console.log('📊 데이터 로더: 대시보드 데이터 로드 시작...');
    
    // 로딩 표시기 표시
    showLoadingIndicator(true);
    
    // 강제 새로고침 모드인 경우 캐시된 데이터 무시
    const forceRefresh = new URLSearchParams(window.location.search).has('refresh');
    
    // 이미 로드된 경우 처리
    if (dataLoaded && dashboardData && !forceRefresh) {
        console.log('✅ 데이터가 이미 로드되어 있습니다.');
        
        // 마지막 로드 시간 확인
        const now = new Date();
        const lastLoadTime = dashboardData.loadedAt ? new Date(dashboardData.loadedAt) : null;
        
        // 같은 날짜의 데이터인지 확인
        const isSameDay = lastLoadTime && 
            lastLoadTime.getDate() === now.getDate() &&
            lastLoadTime.getMonth() === now.getMonth() &&
            lastLoadTime.getFullYear() === now.getFullYear();
            
        if (isSameDay) {
            console.log(`⏱️ 오늘(${now.toLocaleDateString()}) 로드된 데이터입니다. 캐시된 데이터를 사용합니다.`);
            showLoadingIndicator(false);
            if (typeof callback === 'function') callback();
            
            // 데이터 로드 완료 이벤트 발생
            document.dispatchEvent(new CustomEvent('dataLoaded', { detail: { data: dashboardData.data } }));
            return;
        } else {
            console.log('⏱️ 다른 날짜의 데이터입니다. 새로운 데이터를 로드합니다.');
            // 데이터를 다시 로드하기 위해 계속 진행
        }
    }
    
    // 로드 시도 횟수 증가
    loadAttempts++;
    console.log(`🔄 데이터 로드 시도 ${loadAttempts}/${MAX_LOAD_ATTEMPTS}`);
    
    // 다중 소스 전략으로 데이터 로드 시도
    loadFromMultipleSources(callback);
}

// 다중 소스에서 데이터 로드 시도 (Firebase -> 로컬 JSON -> 백업 데이터 -> 전역 변수 -> 샘플 데이터)
function loadFromMultipleSources(callback) {
    console.log('🔄 다중 소스 전략으로 데이터 로드 시도...');
    
    // 0. 백업 데이터 확인
    const backupDate = checkBackupData();
    if (backupDate) {
        console.log(`🔍 ${backupDate} 날짜의 백업 데이터가 있습니다.`);
    }
    
    // 1. Firebase에서 로드 시도
    if (window.firebaseDB) {
        console.log('🔥 Firebase에서 데이터 로드 시도...');
        
        try {
            // 로딩 상태 표시
            const loadingStatus = document.getElementById('loadingStatus');
            if (loadingStatus) {
                loadingStatus.textContent = 'Firebase 데이터베이스에서 데이터를 불러오는 중...';
            }
            
            window.firebaseDB.loadAuctionDataFromFirebase()
                .then(data => {
                    if (data && data.data && Array.isArray(data.data)) {
                        console.log(`✅ Firebase에서 데이터 로드 성공! (${data.data.length}개 항목)`);
                        
                        // 데이터 소스와 로드 시간 기록
                        if (!data.source) {
                            data.source = 'firebase-rtdb';
                            data.loadedAt = new Date().toISOString();
                        }
                        
                        // 데이터 검증 (최소 필수 필드 확인)
                        const isValidData = data.data.every(item => 
                            item.uid && 
                            (item.address || item.naddress) && 
                            (item.maemulinfo || item.type)
                        );
                        
                        if (isValidData) {
                            processLoadedData(data, callback);
                        } else {
                            console.warn('⚠️ Firebase에서 불러온 데이터가 유효하지 않습니다.');
                            loadFromLocalFile(callback);
                        }
                    } else {
                        console.warn('⚠️ Firebase에서 유효한 데이터를 찾을 수 없습니다.');
                        loadFromLocalFile(callback);
                    }
                })
                .catch(error => {
                    console.error('❌ Firebase 데이터 로드 실패:', error);
                    loadFromLocalFile(callback);
                });
        } catch (error) {
            console.error('❌ Firebase 데이터 로드 중 오류 발생:', error);
            loadFromLocalFile(callback);
        }
    } else {
        console.warn('⚠️ Firebase 모듈을 찾을 수 없습니다.');
        loadFromLocalFile(callback);
    }
}

// 로컬 JSON 파일에서 데이터 로드
function loadFromLocalFile(callback) {
    console.log('📄 로컬 JSON 파일에서 데이터 로드 시도...');
    
    // 로딩 상태 표시
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.textContent = '로컬 JSON 파일에서 데이터를 불러오는 중...';
    }
    
    // 현재 위치에서 dashboard_data.json 파일 찾기 시도
    const possiblePaths = [
        'dashboard_data.json',  // 현재 디렉토리
        '../dashboard_data.json',  // 상위 디렉토리
        './dashboard_data.json',  // 명시적 현재 디렉토리
        '/dashboard_data.json'   // 루트 디렉토리
    ];
    
    console.log('🔍 다음 경로에서 dashboard_data.json 파일 검색:', possiblePaths);
    
    // 모든 가능한 경로에서 순차적으로 로드 시도
    loadFromPaths(possiblePaths, 0, callback);
}

// 여러 경로에서 순차적으로 로드 시도
function loadFromPaths(paths, index, callback) {
    if (index >= paths.length) {
        console.error('❌ 모든 경로에서 JSON 파일 로드 실패');
        loadFromBackup(callback);
        return;
    }
    
    const path = paths[index];
    console.log(`🔍 경로 시도 ${index + 1}/${paths.length}: ${path}`);
    
    // 캐시를 무시하기 위해 타임스탬프 추가
    const timestamp = new Date().getTime();
    const noCacheUrl = `${path}?_=${timestamp}`;
    
    fetch(noCacheUrl, {
        headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
    })
        .then(response => {
            if (!response.ok) {
                console.warn(`⚠️ ${path}에서 JSON 파일을 찾을 수 없습니다. 상태: ${response.status}`);
                throw new Error(`JSON 파일을 불러올 수 없습니다: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.data && Array.isArray(data.data)) {
                console.log(`✅ ${path}에서 데이터 로드 성공! (${data.data.length}개 항목)`);
                
                // 데이터 소스와 로드 시간 기록
                if (!data.source) {
                    data.source = 'local-json';
                    data.loadedAt = new Date().toISOString();
                }
                
                processLoadedData(data, callback);
            } else {
                console.warn(`⚠️ ${path}에서 유효한 데이터를 찾을 수 없습니다.`);
                loadFromPaths(paths, index + 1, callback);
            }
        })
        .catch(error => {
            console.warn(`⚠️ ${path}에서 JSON 파일 로드 실패:`, error);
            loadFromPaths(paths, index + 1, callback);
        });
}

// 백업 데이터에서 로드
function loadFromBackup(callback) {
    console.log('💾 백업 데이터에서 로드 시도...');
    
    // 로딩 상태 표시
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.textContent = '백업 데이터에서 불러오는 중...';
    }
    
    // 백업 데이터 로드
    const backupData = loadBackupData();
    
    if (backupData && backupData.data && Array.isArray(backupData.data)) {
        console.log(`✅ 백업 데이터 로드 성공! (${backupData.data.length}개 항목)`);
        
        // 데이터 소스와 로드 시간 기록
        if (!backupData.source) {
            backupData.source = 'backup';
        }
        backupData.loadedAt = new Date().toISOString();
        
        processLoadedData(backupData, callback);
    } else {
        console.warn('⚠️ 유효한 백업 데이터가 없습니다.');
        loadFromGlobalVariable(callback);
    }
}

// 전역 변수에서 데이터 로드
function loadFromGlobalVariable(callback) {
    console.log('🌐 전역 변수에서 데이터 로드 시도...');
    
    // 로딩 상태 표시
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.textContent = '전역 변수에서 데이터를 불러오는 중...';
    }
    
    if (window.auctionData && window.auctionData.data && Array.isArray(window.auctionData.data)) {
        console.log(`✅ 전역 변수에서 데이터 로드 성공! (${window.auctionData.data.length}개 항목)`);
        
        // 데이터 소스와 로드 시간 기록
        if (!window.auctionData.source) {
            window.auctionData.source = 'global-variable';
            window.auctionData.loadedAt = new Date().toISOString();
        }
        
        processLoadedData(window.auctionData, callback);
        return true;
    } else {
        console.warn('⚠️ 전역 변수에서 유효한 데이터를 찾을 수 없습니다.');
        loadFromSampleData(callback);
        return false;
    }
}

// 샘플 데이터 로드
function loadFromSampleData(callback) {
    console.log('📋 샘플 데이터 로드 시도...');
    
    // 로딩 상태 표시
    const loadingStatus = document.getElementById('loadingStatus');
    if (loadingStatus) {
        loadingStatus.textContent = '샘플 데이터를 불러오는 중...';
    }
    
    // 샘플 데이터 정의
    const sampleData = {
        "search_conditions": {
            "regions": ["서울시", "경기도"],
            "price_range": "0~6억 미만",
            "property_types": ["아파트", "오피스텔", "단독주택", "다가구주택"],
            "collected_at": "2025-06-25 10:44:53"
        },
        "data": [
            {
                "uid": 402604,
                "region": "서울시",
                "subregion": "용산구",
                "address": "서울특별시 용산구 회나무로13가길 16, 6층702호 (이태원동,어반메시 남산)",
                "lat": 37.5407347,
                "lng": 126.9903895,
                "maemulinfo": "아파트",
                "estimatedprice": 1911000000,
                "minprice": 34426000,
                "percent": 2,
                "court": "서울서부지방법원",
                "auctiondate": "2025-07-15",
                "auctioncount": 18,
                "simpleminestimatedprice": "19억 1100만원",
                "simpleminprice": "3442만원",
                "mapprice": "3.8억",
                "auctionmsg_url": "https://map.auctionmsg.com/auction/detail/402604",
                "auctionmsg_display": "경매알리미 #402604"
            },
            {
                "uid": 515468,
                "region": "서울시",
                "subregion": "강서구",
                "address": "서울특별시 강서구 등촌로13자길 74, 제102동 제2층 제204호 (화곡동, 태영방송인아파트)",
                "lat": 37.53758280426816,
                "lng": 126.8532811133008,
                "maemulinfo": "아파트",
                "estimatedprice": 455000000,
                "minprice": 186368000,
                "percent": 41,
                "court": "서울남부지방법원",
                "auctiondate": "2025-07-10",
                "auctioncount": 4,
                "simpleminestimatedprice": "4억 5500만원",
                "simpleminprice": "1억 8636만원",
                "mapprice": "1.9억",
                "auctionmsg_url": "https://map.auctionmsg.com/auction/detail/515468",
                "auctionmsg_display": "경매알리미 #515468"
            }
        ],
        "last_updated": "2025-06-25 10:44:53",
        "is_sample": true,
        "source": "sample-data"
    };
    
    // 로드 시간 추가
    sampleData.loadedAt = new Date().toISOString();
    
    console.log('✅ 샘플 데이터 로드 성공!');
    processLoadedData(sampleData, callback);
}

// 가격 포맷 함수 (예: 1억 2345만원)
function formatPrice(price) {
    if (isNaN(price) || price === 0) return '0원';
    
    const billion = Math.floor(price / 100000000);
    const million = Math.floor((price % 100000000) / 10000);
    
    let result = '';
    if (billion > 0) result += `${billion}억 `;
    if (million > 0) result += `${million}만`;
    if (result === '') result = '0';
    
    return result + '원';
}

// 간단한 가격 포맷 함수 (예: 1.2억)
function formatPriceShort(price) {
    if (isNaN(price) || price === 0) return '0억';
    
    const billion = price / 100000000;
    
    if (billion >= 1) {
        return `${billion.toFixed(1)}억`;
    } else {
        return `${Math.round(billion * 10) / 10}억`;
    }
}

// 로드된 데이터 처리
function processLoadedData(data, callback) {
    // 데이터 전처리
    if (!data.last_updated) {
        const now = new Date();
        data.last_updated = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    }
    
    // 데이터 저장
    dashboardData = data;
    dataLoaded = true;
    
    // Firebase에서 가져온 데이터인 경우 로컬 JSON 파일에도 저장
    if (data.source === 'firebase-rtdb' || data.source === 'firebase-rtdb-subscription') {
        saveDataToLocalJson(data);
    }
    
    // 로딩 표시기 숨기기
    showLoadingIndicator(false);
    
    // 데이터 로드 완료 이벤트 발생
    console.log('📊 데이터 로드 완료! 이벤트 발생:', data);
    document.dispatchEvent(new CustomEvent('dataLoaded', { detail: data }));
    document.dispatchEvent(new CustomEvent('auctionDataLoaded', { detail: data }));
    
    // 콜백 함수 호출
    if (typeof callback === 'function') {
        callback(data);
    }
}

// 데이터를 로컬 JSON 파일로 저장 (서버 측에서 처리해야 함)
function saveDataToLocalJson(data) {
    // 클라이언트에서는 파일 시스템에 직접 접근할 수 없으므로 서버로 요청을 보내야 함
    console.log('💾 Firebase에서 가져온 데이터를 로컬 JSON 파일로 저장하려면 서버 측 기능이 필요합니다.');
    
    // 로컬 스토리지에 저장 (임시 대안)
    try {
        // 데이터 복사본 생성
        const dataCopy = JSON.parse(JSON.stringify(data));
        
        // 저장 시간 추가
        dataCopy.saved_at = new Date().toISOString();
        
        // 로컬 스토리지에 저장
        localStorage.setItem('auction_data_backup', JSON.stringify(dataCopy));
        
        // 백업 날짜 기록
        const backupDate = new Date();
        const formattedDate = `${backupDate.getFullYear()}-${(backupDate.getMonth() + 1).toString().padStart(2, '0')}-${backupDate.getDate().toString().padStart(2, '0')}`;
        localStorage.setItem('auction_data_backup_date', formattedDate);
        
        console.log(`✅ 데이터를 로컬 스토리지에 백업했습니다. (${formattedDate})`);
    } catch (error) {
        console.error('❌ 데이터 백업 중 오류 발생:', error);
    }
    
    // 서버 측에서 처리할 수 있는 API가 있다면 여기서 호출
    // 예: saveDataToServer(data);
}

// 백업된 데이터 확인
function checkBackupData() {
    const backupDate = localStorage.getItem('auction_data_backup_date');
    if (backupDate) {
        console.log(`🔍 백업 데이터 발견: ${backupDate} 날짜의 데이터가 있습니다.`);
        return backupDate;
    }
    return null;
}

// 백업 데이터 로드
function loadBackupData() {
    try {
        const backupData = localStorage.getItem('auction_data_backup');
        if (backupData) {
            const parsedData = JSON.parse(backupData);
            console.log('✅ 백업 데이터를 로드했습니다.');
            return parsedData;
        }
    } catch (error) {
        console.error('❌ 백업 데이터 로드 중 오류 발생:', error);
    }
    return null;
}

// 데이터 로드 실패 처리
function handleLoadFailure(callback) {
    console.error(`❌ 모든 데이터 소스에서 로드 실패 (시도: ${loadAttempts}/${MAX_LOAD_ATTEMPTS})`);
    
    // 최대 시도 횟수에 도달하지 않았으면 재시도
    if (loadAttempts < MAX_LOAD_ATTEMPTS) {
        console.log(`🔄 ${1000 * loadAttempts}ms 후 데이터 로드 재시도...`);
        
        // 점진적으로 대기 시간 증가
        setTimeout(() => {
            loadDashboardData(callback);
        }, 1000 * loadAttempts);
    } else {
        // 최대 시도 횟수 초과 시 오류 표시
        console.error('❌ 최대 시도 횟수 초과. 데이터 로드 실패.');
        showError('데이터를 로드하는데 실패했습니다. 페이지를 새로고침하거나 나중에 다시 시도해 주세요.');
        showLoadingIndicator(false);
        
        // 콜백 호출 (데이터 없이)
        if (typeof callback === 'function') {
            callback();
        }
    }
}

// 로딩 표시기 표시/숨기기
function showLoadingIndicator(show) {
    const loadingIndicator = document.getElementById('loadingIndicator');
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'flex' : 'none';
    }
}

// 오류 메시지 표시
function showError(message) {
    const errorMessage = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    
    if (errorMessage && errorText) {
        errorText.textContent = message;
        errorMessage.style.display = 'block';
        
        // 5초 후 자동으로 숨기기
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }
}

// 데이터 로더 모듈 내보내기
window.dataLoader = {
    loadDashboardData,
    getDashboardData: () => dashboardData,
    isDataLoaded: () => dataLoaded,
    reloadData: () => {
        dataLoaded = false;
        loadAttempts = 0;
        loadDashboardData();
    }
};