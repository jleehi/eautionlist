# 🏠 전체 경매 데이터를 JavaScript 파일로 변환하는 스크립트예요
# JSON 파일을 읽어서 auction_data.js 파일로 만들어주고, 경매알리미 링크도 추가해줘요
# 이제 최신 데이터를 자동으로 찾아서 업데이트해줘요!

import json
import os
import glob
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, db
import dotenv

# 환경 변수 로드
try:
    dotenv.load_dotenv()
    print("✅ .env 파일을 성공적으로 로드했습니다.")
except Exception as e:
    print(f"⚠️ .env 파일 로드 중 오류 발생: {str(e)}")
    print("⚠️ 환경 변수 없이 계속 진행합니다.")

# 새로운 데이터를 가져오기 위해 크롤러도 사용해요
from auction_crawler import get_combined_auction_data, save_to_json

# Firebase 초기화
def initialize_firebase():
    """
    Firebase Realtime Database에 연결하는 함수
    .env 파일에서 설정값을 읽어서 연결해요
    """
    try:
        # 이미 초기화되었는지 확인
        if firebase_admin._apps:
            print("✅ Firebase가 이미 초기화되어 있습니다.")
            return True
            
        # Firebase 데이터베이스 URL 설정
        # 환경 변수에서 가져오거나 기본값 사용
        database_url = os.getenv("FIREBASE_DATABASE_URL", 
                               "https://my-eaution-default-rtdb.asia-southeast1.firebasedatabase.app")
            
        print("🔥 Firebase 초기화 중...")
        print(f"📡 데이터베이스 URL: {database_url}")
        
        # 서비스 계정 키 파일이 있는지 확인
        if os.path.exists("serviceAccountKey.json"):
            cred = credentials.Certificate("serviceAccountKey.json")
            firebase_admin.initialize_app(cred, {
                'databaseURL': database_url
            })
            print("🔑 서비스 계정 키로 인증 완료")
        else:
            print("⚠️ serviceAccountKey.json 파일이 없습니다. 기본 설정으로 초기화합니다.")
            firebase_admin.initialize_app(options={
                'databaseURL': database_url
            })
            
        print("✅ Firebase 초기화 완료!")
        return True
    except Exception as e:
        print(f"❌ Firebase 초기화 중 오류 발생: {str(e)}")
        return False

# Firebase RTDB에 데이터 저장
def save_to_firebase(data):
    """
    Firebase Realtime Database에 데이터를 저장하는 함수
    """
    try:
        print("🔥 Firebase RTDB에 데이터 저장 중...")
        
        # Firebase 초기화 확인
        if not initialize_firebase():
            print("❌ Firebase 초기화에 실패했습니다. 데이터를 저장할 수 없습니다.")
            return False
            
        # 데이터 저장
        ref = db.reference('auction_data')
        ref.set(data)
        
        # 마지막 업데이트 시간도 별도로 저장 (조회 최적화)
        update_ref = db.reference('last_updated')
        update_ref.set({
            'timestamp': datetime.now().timestamp(),
            'date_string': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'items_count': len(data.get('data', []))
        })
        
        print(f"✅ Firebase RTDB에 데이터 저장 완료! ({len(data.get('data', []))}건)")
        return True
    except Exception as e:
        print(f"❌ Firebase RTDB 저장 중 오류 발생: {str(e)}")
        return False

def find_latest_json_file():
    """
    data 폴더에서 가장 최신의 JSON 파일을 찾는 함수
    여러 개의 파일 중에서 가장 최근에 만들어진 파일을 골라줘요
    """
    
    # data 폴더의 모든 JSON 파일을 찾아요
    json_files = glob.glob('data/*.json')
    
    if not json_files:
        print("❌ data 폴더에 JSON 파일이 없어요!")
        return None
    
    # 파일들을 수정 시간 순으로 정렬해서 가장 최신 파일을 찾아요
    latest_file = max(json_files, key=os.path.getmtime)
    
    # 파일의 수정 시간을 확인해요
    file_time = os.path.getmtime(latest_file)
    file_date = datetime.fromtimestamp(file_time).strftime('%Y-%m-%d %H:%M:%S')
    
    print(f"📋 가장 최신 파일: {latest_file}")
    print(f"📅 파일 생성 시간: {file_date}")
    
    return latest_file

def get_fresh_data():
    """
    인터넷에서 실시간으로 새로운 경매 데이터를 가져오는 함수
    브라우저에서 새로고침할 때마다 최신 정보를 보여줄 수 있어요!
    """
    
    print("🔄 실시간으로 최신 경매 데이터를 수집하고 있어요...")
    print("⏰ 잠시만 기다려주세요! (30초 정도 소요)")
    
    try:
        # 크롤러를 이용해서 최신 데이터를 가져와요
        fresh_data = get_combined_auction_data()
        
        if fresh_data and fresh_data.get('data'):
            # 오늘 날짜로 파일명을 만들어요
            today = datetime.now().strftime('%Y-%m-%d')
            timestamp = datetime.now().strftime('%H-%M-%S')
            filename = f"fresh_auction_data_{today}_{timestamp}.json"
            
            # 새로운 데이터를 저장해요
            success = save_to_json(fresh_data, filename)
            
            if success:
                print(f"✅ 최신 데이터를 성공적으로 가져왔어요! ({len(fresh_data['data'])}개)")
                return fresh_data
            else:
                print("❌ 데이터 저장에 실패했어요")
                return None
        else:
            print("❌ 새로운 데이터를 가져오지 못했어요")
            return None
            
    except Exception as e:
        print(f"❌ 데이터 수집 중 오류가 발생했어요: {str(e)}")
        return None

def load_data_with_fallback():
    """
    데이터를 로드하는 함수 (여러 방법을 시도해봐요)
    1. 먼저 실시간으로 새 데이터를 가져와봐요
    2. 실패하면 가장 최신의 저장된 파일을 사용해요
    """
    
    print("📊 데이터 로딩 시작...")
    
    # 방법 1: 실시간 데이터 수집 시도
    print("\n🔄 방법 1: 실시간 데이터 수집 시도")
    fresh_data = get_fresh_data()
    
    if fresh_data:
        print("✅ 실시간 데이터 수집 성공!")
        return fresh_data
    
    # 방법 2: 저장된 파일 중 가장 최신 것 사용
    print("\n💾 방법 2: 저장된 최신 파일 사용")
    latest_file = find_latest_json_file()
    
    if latest_file:
        try:
            with open(latest_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            print(f"✅ 파일에서 데이터를 성공적으로 읽었어요!")
            return data
        except Exception as e:
            print(f"❌ 파일 읽기 실패: {str(e)}")
    
    # 모든 방법이 실패한 경우
    print("❌ 모든 데이터 로딩 방법이 실패했어요!")
    return None

# 메인 실행 부분
print("🏠 부동산 경매 데이터 업데이트 시작!")
print("=" * 50)

# 데이터 로드 (실시간 수집 또는 최신 파일)
data = load_data_with_fallback()

if not data:
    print("💥 데이터를 가져올 수 없어요! 프로그램을 종료합니다.")
    exit(1)

print(f"\n📋 총 {len(data.get('data', []))}건의 경매 데이터를 처리할 예정이에요!")

# 각 경매 데이터에 경매알리미 링크 추가 (마치 명함에 웹사이트 주소를 추가하는 것 같아요)
print("🔗 경매알리미 링크를 추가하는 중...")
auction_msg_base_url = "https://map.auctionmsg.com/auction/detail/"

for item in data['data']:
    # uid를 이용해서 경매알리미 링크 생성
    item['auctionmsg_url'] = auction_msg_base_url + str(item['uid'])
    
    # 추가적으로 표시용 짧은 링크도 만들어둬요
    item['auctionmsg_display'] = f"경매알리미 #{item['uid']}"

print("✅ 모든 데이터에 경매알리미 링크가 추가되었어요!")

# 현재 시간 정보 추가
current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
data['last_updated'] = current_time
data['last_updated_timestamp'] = datetime.now().timestamp()

# JavaScript 파일 내용 생성 (마치 레시피를 새로 적는 것 같아요)
js_content = f"""// 🏠 부동산 경매 데이터를 담고 있는 JavaScript 파일이에요
// 브라우저에서 직접 사용할 수 있도록 변수로 만들어뒀어요
// 경매알리미 링크도 포함되어 있어요!
// 마지막 업데이트: {current_time}

// 경매 데이터를 전역 변수로 내보내요 (마치 도서관에서 책을 빌려주는 것처럼요!)
window.auctionData = {json.dumps(data, ensure_ascii=False, indent=4)};

// 데이터 로딩 완료를 알려주는 이벤트를 발생시켜요
// 마치 "데이터 준비 완료!"라고 외치는 것 같아요
document.addEventListener('DOMContentLoaded', function() {{
    console.log('✅ 경매 데이터 로딩 완료!', window.auctionData.data.length, '건의 매물');
    console.log('🔗 경매알리미 링크 포함됨!');
    console.log('⏰ 마지막 업데이트:', '{current_time}');
    
    // 화면에 마지막 업데이트 시간 표시
    const lastUpdateElements = document.querySelectorAll('.last-update-time');
    if (lastUpdateElements.length > 0) {{
        lastUpdateElements.forEach(element => {{
            element.textContent = '{current_time}';
        }});
    }}
}});

// 페이지가 새로고침될 때마다 최신 정보임을 알려줘요
console.log('🔄 데이터 새로고침 완료! 최신 정보:', '{current_time}');"""

# JavaScript 파일 저장 (마치 완성된 요리를 접시에 담는 것 같아요)
print("💾 auction_data.js 파일을 생성하는 중...")
with open('dashboard/auction_data.js', 'w', encoding='utf-8') as f:
    f.write(js_content)

# Firebase RTDB에 데이터 저장
print("\n🔥 Firebase RTDB에 데이터 저장 시도...")
firebase_success = save_to_firebase(data)

print("🎉 완료! 모든 데이터가 경매알리미 링크와 함께 auction_data.js에 포함되었어요!")
print(f"📊 처리된 데이터: {len(data.get('data', []))}건")
print("📋 추가된 필드:")
print("   - auctionmsg_url: 경매알리미 전체 링크")
print("   - auctionmsg_display: 표시용 텍스트")
print(f"   - last_updated: 마지막 업데이트 시간 ({current_time})")
print(f"   - last_updated_timestamp: 타임스탬프 값 추가")
if firebase_success:
    print("   - Firebase RTDB에 데이터 저장 성공!")
    print("   - last_updated 경로에 별도로 업데이트 시간 저장됨")
else:
    print("   - Firebase RTDB에 데이터 저장 실패!")
print("\n🌐 브라우저에서 http://localhost:8000 또는 https://my-eaution.web.app 으로 접속해보세요!")
print("🔄 새로고침할 때마다 최신 데이터로 업데이트됩니다!") 