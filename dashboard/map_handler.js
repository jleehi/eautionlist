// 지도 핸들러 모듈 - 지도 관련 기능을 담당합니다
// 카카오맵 API를 사용하여 지도를 초기화하고 매물을 표시합니다

// 전역 변수
let map = null; // 카카오맵 객체
let markers = []; // 지도에 표시된 마커들
let infowindow = null; // 정보창 객체
let clusterer = null; // 마커 클러스터러 객체
let isMapInitialized = false; // 지도 초기화 여부
let kakaoMapApiKey = "f6c0b2ac0e6b2a2fb9e32183cc3e8939"; // 카카오맵 API 키 (업데이트된 키)
let kakaoMapLoadRetries = 0; // API 로드 재시도 횟수
const MAX_RETRIES = 3; // 최대 재시도 횟수
let isFallbackShown = false; // 대체 UI가 표시되었는지 여부

// 카카오 지도 API 로드
function loadKakaoMapAPI() {
    console.log('🗺️ 카카오맵 API 로드 시작...');
    console.log('🔍 현재 kakao 객체 상태:', window.kakao ? '존재함' : '존재하지 않음');
    
    // 이미 로드된 경우 스킵
    if (window.kakao && window.kakao.maps) {
        console.log('✅ 카카오맵 API가 이미 로드되어 있습니다.');
        initializeMap(); // 바로 지도 초기화 시작
        return;
    }
    
    // 모바일 기기 감지
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isGalaxyFold = /SM-F9/i.test(navigator.userAgent) || window.screen.width === 280 || (window.screen.width <= 500 && window.screen.height >= 800);
    
    console.log(`📱 지도 로드 - 디바이스 정보: ${isMobile ? '모바일' : '데스크톱'}, ${isGalaxyFold ? '폴더블 기기' : '일반 기기'}, 화면 크기: ${window.innerWidth}x${window.innerHeight}`);
    console.log('🔑 카카오맵 API 키:', kakaoMapApiKey);
    
    try {
        // 로딩 메시지 표시
        showMapLoadingMessage(true, '카카오맵 API를 로드하는 중입니다...');
        
        // 오류 알림 숨기기
        hideMapErrorAlert();
        
        // 5초 후에도 카카오맵이 초기화되지 않았다면 오류 메시지 표시
        setTimeout(function() {
            if (!isMapInitialized) {
                console.error('❌ 카카오맵 API가 5초 내에 로드되지 않았습니다.');
                console.log('🔍 현재 kakao 객체 상태:', window.kakao ? '존재함' : '존재하지 않음');
                if (window.kakao) {
                    console.log('🔍 kakao.maps 객체 상태:', window.kakao.maps ? '존재함' : '존재하지 않음');
                }
                showMapLoadingMessage(false);
                showMapErrorAlert('카카오맵 API 로드 실패: 카카오 개발자 센터에 현재 도메인이 등록되어 있는지 확인해주세요.');
                showFallbackMap();
            }
        }, 5000);
        
        // 카카오맵 초기화 시도
        initializeMap();
        
    } catch (error) {
        console.error('❌ 카카오맵 API 로드 중 오류 발생:', error);
        showMapLoadingMessage(false);
        showMapErrorAlert('카카오맵 API 로드 중 오류가 발생했습니다: ' + error.message);
        
        // 대체 지도 표시
        showFallbackMap();
    }
}

// 대체 지도 표시 (API 로드 실패 시)
function showFallbackMap() {
    // 이미 대체 UI가 표시된 경우 중복 실행 방지
    if (isFallbackShown) return;
    
    const mapContainer = document.getElementById('map');
    if (!mapContainer) return;
    
    // 기존 내용 비우기
    mapContainer.innerHTML = '';
    
    // 현재 URL 가져오기
    const currentUrl = window.location.href;
    const hostname = window.location.hostname;
    const port = window.location.port;
    const fullDomain = `http://${hostname}${port ? ':'+port : ''}`;
    
    // 대체 UI 생성
    const fallbackDiv = document.createElement('div');
    fallbackDiv.className = 'fallback-map';
    fallbackDiv.style.width = '100%';
    fallbackDiv.style.height = '100%';
    fallbackDiv.style.display = 'flex';
    fallbackDiv.style.flexDirection = 'column';
    fallbackDiv.style.justifyContent = 'center';
    fallbackDiv.style.alignItems = 'center';
    fallbackDiv.style.backgroundColor = '#fff3cd';
    fallbackDiv.style.border = '1px solid #ffeeba';
    fallbackDiv.style.borderRadius = '0.5rem';
    fallbackDiv.style.padding = '2rem';
    
    // HTML 직접 삽입
    fallbackDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 1rem;">🗺️</div>
        <h3 style="font-size: 1.5rem; font-weight: bold; color: #856404; margin-bottom: 1rem;">지도를 불러올 수 없습니다</h3>
        <div style="font-size: 1rem; color: #856404; margin-bottom: 1.5rem; text-align: center; max-width: 90%;">
            <p style="margin-bottom: 1rem;">
                <strong>원인:</strong> 카카오맵 API는 등록된 도메인에서만 사용할 수 있습니다.<br>
                현재 도메인 <code style="background: #fff; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-weight: bold;">${fullDomain}</code>이(가) 등록되어 있지 않습니다.
            </p>
            <div style="background-color: #fff; border-left: 5px solid #ffc107; padding: 1rem; margin: 1rem 0; text-align: left;">
                <strong>해결 방법:</strong><br>
                1. <a href="https://developers.kakao.com/console/app" target="_blank" style="color: #0d6efd; text-decoration: underline; font-weight: bold;">카카오 개발자 센터</a>에 로그인하세요.<br>
                2. 애플리케이션 설정에서 Web 플랫폼에 <code style="background: #f8f9fa; padding: 0.2rem 0.4rem; border-radius: 0.25rem; font-family: monospace; font-weight: bold;">${fullDomain}</code>을 추가하세요.<br>
                3. 아래 버튼을 클릭하여 지도를 다시 불러오세요.
            </div>
        </div>
        <div style="display: flex; gap: 1rem;">
            <button id="retryMapButton" style="padding: 0.75rem 1.5rem; background-color: #3b82f6; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-weight: 500; font-size: 1rem;">
                지도 다시 불러오기
            </button>
            <a href="https://developers.kakao.com/console/app" target="_blank" style="padding: 0.75rem 1.5rem; background-color: #10b981; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-weight: 500; text-decoration: none; font-size: 1rem;">
                카카오 개발자 센터 방문
            </a>
        </div>
    `;
    
    // 맵 컨테이너에 추가
    mapContainer.appendChild(fallbackDiv);
    
    // 재시도 버튼 이벤트 리스너 추가
    const retryButton = document.getElementById('retryMapButton');
    if (retryButton) {
        retryButton.addEventListener('click', function() {
            // 대체 UI 제거
            mapContainer.innerHTML = '';
            isFallbackShown = false;
            
            // 재시도
            kakaoMapLoadRetries = 0;
            loadKakaoMapAPI();
        });
    }
    
    // 대체 UI 표시됨 상태 설정
    isFallbackShown = true;
}

// 지도 로딩 메시지 표시/숨기기
function showMapLoadingMessage(show, message = '지도를 불러오는 중...', isError = false) {
    const loadingElement = document.getElementById('mapLoadingMessage');
    const loadingTextElement = document.getElementById('mapLoadingText');
    
    if (!loadingElement || !loadingTextElement) return;
    
    if (show) {
        loadingElement.style.display = 'flex';
        loadingTextElement.textContent = message;
        
        if (isError) {
            loadingElement.classList.add('error');
        } else {
            loadingElement.classList.remove('error');
        }
    } else {
        loadingElement.style.display = 'none';
    }
}

// 지도 오류 알림 표시
function showMapErrorAlert(message = '') {
    const mapContainer = document.getElementById('map');
    const errorMessage = document.getElementById('mapErrorMessage');
    
    if (!errorMessage) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'mapErrorMessage';
        errorDiv.className = 'absolute inset-0 flex flex-col items-center justify-center bg-red-50 bg-opacity-95 p-6 text-center z-10';
        
        // 현재 URL 가져오기
        const hostname = window.location.hostname;
        const port = window.location.port;
        const fullDomain = `http://${hostname}${port ? ':'+port : ''}`;
        
        const defaultMessage = `카카오맵 API 로드 실패: 카카오 개발자 센터에서 현재 도메인(${fullDomain})이 등록되어 있는지 확인해주세요.`;
        
        errorDiv.innerHTML = `
            <svg class="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <h3 class="text-xl font-bold text-red-700 mb-3">지도 로드 실패</h3>
            <p class="text-red-600 mb-4 text-lg">${message || defaultMessage}</p>
            <div class="bg-white p-4 rounded-lg shadow-sm border-l-4 border-red-500 text-left mb-6 max-w-lg">
                <strong class="block text-lg text-red-700 mb-2">해결 방법:</strong>
                <ol class="list-decimal pl-5 space-y-2 text-red-600">
                    <li><a href="https://developers.kakao.com/console/app" target="_blank" class="text-blue-600 hover:text-blue-800 underline font-medium">카카오 개발자 센터</a>에 로그인하세요.</li>
                    <li>애플리케이션 설정에서 Web 플랫폼에 <code class="bg-red-100 px-2 py-1 rounded font-bold">${fullDomain}</code>을 추가하세요.</li>
                    <li>페이지를 새로고침하거나 아래 버튼을 클릭하세요.</li>
                </ol>
            </div>
            <button id="retryMapLoad" class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-lg">다시 시도</button>
        `;
        
        mapContainer.appendChild(errorDiv);
        
        // 다시 시도 버튼에 이벤트 리스너 추가
        document.getElementById('retryMapLoad').addEventListener('click', function() {
            hideMapErrorAlert();
            loadKakaoMapAPI();
        });
    }
}

// 지도 오류 알림 숨기기
function hideMapErrorAlert() {
    const errorMessage = document.getElementById('mapErrorMessage');
    if (errorMessage) {
        errorMessage.remove();
    }
}

// 오류 메시지 표시
function showError(message) {
    console.error(message);
    const errorMessage = document.getElementById('mapErrorMessage');
    if (errorMessage) errorMessage.textContent = message;
}

// 지도 초기화
function initializeMap() {
    console.log('🗺️ 지도 초기화 시작...');
    
    try {
        // 카카오 객체가 없으면 오류 표시
        if (!window.kakao) {
            console.error('❌ 카카오맵 초기화 실패: kakao 객체가 존재하지 않습니다.');
            showMapErrorAlert('카카오맵 API가 로드되지 않았습니다. 카카오 개발자 센터에서 도메인을 확인해주세요.');
            return;
        }
        
        // 카카오맵 객체가 없으면 오류 표시
        if (!window.kakao.maps) {
            console.error('❌ 카카오맵 초기화 실패: kakao.maps 객체가 존재하지 않습니다.');
            showMapErrorAlert('카카오맵 API가 완전히 로드되지 않았습니다. 카카오 개발자 센터에서 도메인을 확인해주세요.');
            return;
        }
        
        // 지도 컨테이너 확인
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('❌ 지도 컨테이너를 찾을 수 없습니다.');
            return;
        }
        
        console.log('✅ 카카오맵 API 로드 완료, 지도 생성 시작');
        
        // 지도 옵션 설정
        const mapOption = {
            center: new kakao.maps.LatLng(37.566826, 126.9786567), // 서울 시청
            level: 8
        };
        
        // 지도 생성
        map = new kakao.maps.Map(mapContainer, mapOption);
        
        // 클러스터러 생성
        clusterer = new kakao.maps.MarkerClusterer({
            map: map,
            averageCenter: true,
            minLevel: 5,
            disableClickZoom: false,
            styles: [{
                width: '50px',
                height: '50px',
                background: 'rgba(59, 130, 246, 0.8)',
                color: '#fff',
                borderRadius: '25px',
                textAlign: 'center',
                fontWeight: 'bold',
                lineHeight: '50px'
            }]
        });
        
        // 지도 컨트롤 추가
        const zoomControl = new kakao.maps.ZoomControl();
        map.addControl(zoomControl, kakao.maps.ControlPosition.RIGHT);
        
        const mapTypeControl = new kakao.maps.MapTypeControl();
        map.addControl(mapTypeControl, kakao.maps.ControlPosition.TOPRIGHT);
        
        // 지도 초기화 완료
        isMapInitialized = true;
        console.log('✅ 지도 초기화 완료');
        
        // 로딩 메시지 숨기기
        showMapLoadingMessage(false);
        
        // 지도 이벤트 리스너 등록
        kakao.maps.event.addListener(map, 'tilesloaded', function() {
            console.log('🗺️ 지도 타일 로드 완료');
        });
        
        // 경매 데이터가 있으면 마커 표시
        if (auctionData && auctionData.length > 0) {
            displayMarkers(auctionData);
        }
        
    } catch (error) {
        console.error('❌ 지도 초기화 중 오류 발생:', error);
        showMapLoadingMessage(false);
        showMapErrorAlert('지도 초기화 중 오류가 발생했습니다: ' + error.message);
    }
}

// 매물 지도에 표시
function displayPropertiesOnMap(properties) {
    console.log('🗺️ 지도에 매물 표시 시작...');
    
    // 지도가 초기화되지 않은 경우 초기화
    if (!isMapInitialized) {
        console.log('⚠️ 지도가 초기화되지 않았습니다. 초기화 후 매물을 표시합니다.');
        document.addEventListener('mapInitialized', function() {
            displayPropertiesOnMap(properties);
        });
        initializeMap();
        return;
    }
    
    try {
        // 기존 마커 제거
        markers.forEach(marker => marker.setMap(null));
        markers = [];
        
        // 클러스터러 비우기
        clusterer.clear();
        
        if (!properties || properties.length === 0) {
            console.log('⚠️ 표시할 매물이 없습니다.');
            return;
        }
        
        console.log(`📍 ${properties.length}개의 매물을 지도에 표시합니다.`);
        
        // 유효한 좌표를 가진 매물 필터링
        const validProperties = properties.filter(property => {
            return property.latitude && property.longitude && 
                   !isNaN(property.latitude) && !isNaN(property.longitude) &&
                   property.latitude > 30 && property.latitude < 45 && // 한국 위도 범위 대략
                   property.longitude > 120 && property.longitude < 135; // 한국 경도 범위 대략
        });
        
        console.log(`📍 ${validProperties.length}개의 유효한 좌표를 가진 매물이 있습니다.`);
        
        if (validProperties.length === 0) {
            console.log('⚠️ 유효한 좌표를 가진 매물이 없습니다.');
            return;
        }
        
        // 마커 생성 및 지도에 표시
        const newMarkers = validProperties.map(property => {
            // 마커 위치 설정
            const position = new kakao.maps.LatLng(property.latitude, property.longitude);
            
            // 마커 생성
            const marker = new kakao.maps.Marker({
                position: position,
                title: property.address
            });
            
            // 마커 클릭 이벤트 리스너 추가
            kakao.maps.event.addListener(marker, 'click', function() {
                // 정보창 내용 생성
                const content = `
                    <div class="info-window">
                        <div class="info-title">${property.address}</div>
                        <div class="info-body">
                            <div class="info-row">
                                <span class="info-label">종류:</span> ${property.type || '정보 없음'}
                            </div>
                            <div class="info-row">
                                <span class="info-label">감정가:</span> ${formatPrice(property.price) || '정보 없음'}
                            </div>
                            <div class="info-row">
                                <span class="info-label">최저가:</span> ${formatPrice(property.minPrice) || '정보 없음'}
                            </div>
                            <div class="info-row">
                                <span class="info-label">경매일:</span> ${formatDate(property.auctionDate) || '정보 없음'}
                            </div>
                        </div>
                        <div class="info-footer">
                            <a href="#" class="info-link" onclick="showPropertyDetail('${property.id}'); return false;">상세 정보 보기</a>
                        </div>
                    </div>
                `;
                
                // 정보창 표시
                infowindow.setContent(content);
                infowindow.open(map, marker);
            });
            
            return marker;
        });
        
        // 마커 배열에 추가
        markers = [...newMarkers];
        
        // 클러스터러에 마커 추가
        clusterer.addMarkers(markers);
        
        // 모든 마커가 보이도록 지도 범위 조정
        if (markers.length > 0) {
            const bounds = new kakao.maps.LatLngBounds();
            markers.forEach(marker => bounds.extend(marker.getPosition()));
            map.setBounds(bounds);
        }
        
        console.log('✅ 지도에 매물 표시 완료!');
    } catch (error) {
        console.error('❌ 매물 표시 중 오류 발생:', error);
        showError('매물을 지도에 표시하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 가격 포맷 함수
function formatPrice(price) {
    if (!price) return '정보 없음';
    
    // 숫자가 아닌 경우 그대로 반환
    if (isNaN(price)) return price;
    
    // 숫자로 변환
    const numPrice = Number(price);
    
    // 억 단위 계산
    if (numPrice >= 10000) {
        const uk = Math.floor(numPrice / 10000);
        const man = numPrice % 10000;
        
        if (man === 0) {
            return `${uk}억원`;
        } else {
            return `${uk}억 ${man.toLocaleString()}만원`;
        }
    }
    
    // 만 단위 이하 계산
    return `${numPrice.toLocaleString()}만원`;
}

// 날짜 포맷 함수
function formatDate(dateString) {
    if (!dateString) return '정보 없음';
    
    try {
        // 날짜 객체로 변환
        const date = new Date(dateString);
        
        // 유효한 날짜인지 확인
        if (isNaN(date.getTime())) {
            return dateString; // 유효하지 않은 경우 원본 반환
        }
        
        // YYYY-MM-DD 형식으로 반환
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.error('날짜 포맷 오류:', error);
        return dateString; // 오류 발생 시 원본 반환
    }
}

// 필터링된 매물 표시
function displayFilteredProperties(filteredProperties) {
    displayPropertiesOnMap(filteredProperties);
}

// 모듈 초기화
function initModule() {
    console.log('🗺️ 지도 핸들러 모듈 초기화...');
    
    // 페이지 로드 시 자동으로 지도 초기화
    document.addEventListener('DOMContentLoaded', function() {
        console.log('📄 문서 로드 완료, 지도 초기화 시작...');
        loadKakaoMapAPI();
        
        // 재시도 버튼 이벤트 리스너
        const retryButton = document.getElementById('retryMapLoadButton');
        if (retryButton) {
            retryButton.addEventListener('click', function() {
                hideMapErrorAlert();
                kakaoMapLoadRetries = 0;
                loadKakaoMapAPI();
            });
        }
    });
}

// 모듈 초기화 실행
initModule();

// 모듈 내보내기
window.mapHandler = {
    initializeMap,
    displayPropertiesOnMap,
    displayFilteredProperties,
    loadKakaoMapAPI,
    showFallbackMap,
    get isMapInitialized() { return isMapInitialized; }
}; 