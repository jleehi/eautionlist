// Firebase Realtime Database 연결 모듈
// 이 파일은 Firebase RTDB에 연결하고 데이터를 읽고 쓰는 함수들을 제공해요
// 새로고침할 때마다 최신 데이터를 가져올 수 있어요

// Firebase 설정 객체
// 실제 배포 시에는 이 값들을 환경변수나 별도 설정 파일로 관리하는 것이 좋아요
const firebaseConfig = {
  apiKey: "AIzaSyDJhhXbO8WhP9lFSobupck6Dx3G6R2Mq1w",
  authDomain: "my-eaution.firebaseapp.com",
  databaseURL: "https://my-eaution-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-eaution",
  storageBucket: "my-eaution.appspot.com",
  messagingSenderId: "66310718215",
  appId: "1:66310718215:web:1af5a6b3e56d74d666fba2",
  measurementId: "G-JKGK1CJYJL"
};

// Firebase 초기화
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔥 Firebase 초기화 시작...');
  
  try {
    // Firebase 초기화
    firebase.initializeApp(firebaseConfig);
    console.log('✅ Firebase 초기화 완료!');
    
    // 초기 데이터 로드 시도
    loadAuctionDataFromFirebase()
      .then(data => {
        if (data) {
          console.log('✅ Firebase에서 초기 데이터 로드 성공!');
          // 전역 변수에 데이터 저장
          window.auctionData = data;
          // 데이터 로드 완료 이벤트 발생
          document.dispatchEvent(new CustomEvent('auctionDataLoaded', { detail: data }));
        }
      })
      .catch(error => {
        console.error('❌ Firebase 초기 데이터 로드 실패:', error);
        // 로컬 JSON 파일에서 데이터 로드 시도
        console.log('💾 로컬 JSON 파일에서 데이터 로드 시도...');
        loadAuctionDataFromLocalFile();
      });
      
  } catch (error) {
    console.error('❌ Firebase 초기화 실패:', error);
    // 로컬 JSON 파일에서 데이터 로드 시도
    console.log('💾 로컬 JSON 파일에서 데이터 로드 시도...');
    loadAuctionDataFromLocalFile();
  }
});

// RTDB에서 경매 데이터 읽기
async function loadAuctionDataFromFirebase() {
  console.log("🔥 Firebase RTDB에서 경매 데이터를 불러오는 중...");
  
  try {
    // 디버깅을 위한 로그 추가
    console.log("🔍 Firebase 설정:", firebaseConfig);
    
    // Firebase 초기화 확인
    if (!firebase.apps.length) {
      console.log("⚠️ Firebase가 초기화되지 않았습니다. 초기화를 시도합니다.");
      firebase.initializeApp(firebaseConfig);
    }
    
    // 먼저 메타데이터만 가져와서 마지막 업데이트 날짜 확인
    try {
      const metaRef = firebase.database().ref('auction_data/last_updated');
      const metaSnapshot = await metaRef.once('value', null, { context: 'server' });
      const lastUpdatedFromServer = metaSnapshot.val();
      
      // 로컬 스토리지에서 마지막 업데이트 날짜 확인
      const lastUpdatedFromLocal = localStorage.getItem('auction_data_last_updated');
      
      console.log(`🔍 서버 마지막 업데이트: ${lastUpdatedFromServer || '없음'}`);
      console.log(`🔍 로컬 마지막 업데이트: ${lastUpdatedFromLocal || '없음'}`);
      
      // 로컬에 저장된 데이터가 있고, 서버와 날짜가 같으면 로컬 데이터 사용
      const localData = localStorage.getItem('auction_data');
      
      if (localData && lastUpdatedFromLocal === lastUpdatedFromServer) {
        console.log("✅ 로컬에 저장된 최신 데이터가 있습니다. 로컬 데이터를 사용합니다.");
        
        try {
          const parsedData = JSON.parse(localData);
          
          // 데이터 로드 시간 기록 (캐시 여부 확인용)
          parsedData.loadedAt = new Date().toISOString();
          parsedData.source = 'local-storage';
          
          return parsedData;
        } catch (error) {
          console.error("❌ 로컬 데이터 파싱 중 오류 발생:", error);
          // 오류 발생 시 서버에서 다시 가져오기
        }
      }
    } catch (metaError) {
      console.error("❌ 메타데이터 로드 중 오류 발생:", metaError);
      // 메타데이터 로드 실패 시 전체 데이터 로드 시도
    }
    
    // auction_data 경로에서 데이터 가져오기 (캐시 무시)
    const dbRef = firebase.database().ref('auction_data');
    console.log("🔍 Firebase 데이터베이스 참조 생성:", dbRef.toString());
    
    try {
      // 캐시를 무시하고 서버에서 직접 데이터를 가져오기 위한 옵션 설정
      console.log("🔄 Firebase에서 데이터 가져오기 시도...");
      const snapshot = await dbRef.once('value', null, { context: 'server' });
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        console.log(`✅ Firebase에서 ${data.data?.length || 0}개의 경매 데이터를 불러왔습니다.`);
        
        // 데이터 로드 시간 기록 (캐시 여부 확인용)
        data.loadedAt = new Date().toISOString();
        data.source = 'firebase-rtdb';
        
        // 로컬 스토리지에 데이터 저장
        try {
          localStorage.setItem('auction_data', JSON.stringify(data));
          localStorage.setItem('auction_data_last_updated', data.last_updated || data.loadedAt);
          console.log("💾 데이터를 로컬 스토리지에 저장했습니다.");
        } catch (error) {
          console.warn("⚠️ 로컬 스토리지에 데이터를 저장하지 못했습니다:", error);
        }
        
        return data;
      } else {
        console.log("⚠️ Firebase에 저장된 경매 데이터가 없습니다.");
        throw new Error("Firebase에 데이터가 없습니다.");
      }
    } catch (snapshotError) {
      console.error("❌ Firebase 데이터 스냅샷 로드 중 오류 발생:", snapshotError);
      throw snapshotError;
    }
  } catch (error) {
    console.error("❌ Firebase 데이터 로드 중 오류 발생:", error);
    throw error;
  }
}

// 로컬 JSON 파일에서 데이터 로드
function loadAuctionDataFromLocalFile() {
  console.log("📄 로컬 JSON 파일에서 데이터를 불러오는 중...");
  
  // 캐시를 무시하기 위해 타임스탬프 추가
  const timestamp = new Date().getTime();
  const noCacheUrl = `dashboard_data.json?_=${timestamp}`;
  
  console.log(`🔍 로컬 JSON 파일 URL: ${noCacheUrl}`);
  
  return new Promise((resolve, reject) => {
    fetch(noCacheUrl, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
      .then(response => {
        if (!response.ok) {
          console.error(`❌ JSON 파일 로드 실패: ${response.status} ${response.statusText}`);
          throw new Error('JSON 파일을 불러올 수 없습니다.');
        }
        return response.json();
      })
      .then(data => {
        console.log(`✅ 로컬 JSON 파일에서 데이터 로드 성공! 데이터:`, data);
        
        // 데이터 유효성 검사
        if (!data || !data.data || !Array.isArray(data.data)) {
          console.error("❌ 로컬 JSON 파일의 데이터 형식이 잘못되었습니다.");
          throw new Error('데이터 형식이 잘못되었습니다.');
        }
        
        // 데이터 로드 시간 기록 (캐시 여부 확인용)
        data.loadedAt = new Date().toISOString();
        data.source = 'local-json';
        
        window.auctionData = data;
        document.dispatchEvent(new CustomEvent('auctionDataLoaded', { detail: data }));
        resolve(data);
      })
      .catch(error => {
        console.error("❌ 로컬 JSON 파일 로드 중 오류 발생:", error);
        reject(error);
      });
  });
}

// RTDB에 경매 데이터 저장
async function saveAuctionDataToFirebase(data) {
  console.log("🔥 Firebase RTDB에 경매 데이터를 저장하는 중...");
  
  try {
    // auction_data 경로에 데이터 저장
    const dbRef = firebase.database().ref('auction_data');
    await dbRef.set(data);
    
    console.log(`✅ Firebase에 ${data.data?.length || 0}개의 경매 데이터를 저장했습니다.`);
    return true;
  } catch (error) {
    console.error("❌ Firebase 데이터 저장 중 오류 발생:", error);
    return false;
  }
}

// 실시간 데이터 변경 감지
function subscribeToAuctionData(callback) {
  console.log("🔄 Firebase 실시간 데이터 구독 시작...");
  
  const dbRef = firebase.database().ref('auction_data');
  
  // onValue를 사용하여 데이터 변경 감지 (캐시 무시)
  dbRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      
      // 데이터 로드 시간 기록 (캐시 여부 확인용)
      data.loadedAt = new Date().toISOString();
      data.source = 'firebase-rtdb-subscription';
      
      console.log(`🔔 Firebase 데이터 업데이트 감지: ${data.data?.length || 0}개의 경매 데이터`);
      callback(data);
    } else {
      console.log("⚠️ Firebase에 저장된 경매 데이터가 없습니다.");
      callback(null);
    }
  }, (error) => {
    console.error("❌ Firebase 실시간 구독 중 오류 발생:", error);
  }, { context: 'server' });  // 캐시를 무시하고 서버에서 직접 데이터 가져오기
  
  // 구독 취소 함수 반환
  return () => dbRef.off('value');
}

// 캐시 삭제 함수
function clearCache() {
    console.log('🧹 Firebase RTDB 캐시 삭제');
    
    // 로컬 스토리지에서 캐시 삭제
    localStorage.removeItem('firebase_rtdb_cache');
    localStorage.removeItem('firebase_rtdb_cache_timestamp');
    
    // 메모리 캐시 초기화
    cachedData = null;
    lastCacheTime = null;
    
    console.log('✅ 캐시가 성공적으로 삭제되었습니다.');
}

// 전역 객체로 노출
window.firebaseDB = {
  loadAuctionDataFromFirebase,
  saveAuctionDataToFirebase,
  subscribeToAuctionData,
  loadAuctionDataFromLocalFile,
  clearCache
}; 