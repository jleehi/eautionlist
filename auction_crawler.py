# 부동산 경매 정보를 가져와서 파일로 저장하는 프로그램
# 이 프로그램은 경매 사이트에서 부동산 정보를 가져와서 JSON 파일로 저장해줍니다
# 마치 인터넷에서 상품 정보를 복사해서 메모장에 저장하는 것과 같아요!

import requests  # 인터넷에서 정보를 가져오기 위한 도구상자
import json      # JSON 형태의 데이터를 다루기 위한 도구상자
import os        # 파일과 폴더를 다루기 위한 도구상자
from datetime import datetime  # 날짜와 시간을 다루기 위한 도구상자

def get_auction_data_by_region(region_code, region_name, page=1, limit=100):
    """
    특정 지역의 부동산 경매 정보를 가져오는 함수
    
    매개변수 설명:
    - region_code: 지역 코드 (서울:11, 경기도:41)
    - region_name: 지역 이름 (화면에 표시용)
    - page: 몇 번째 페이지를 가져올지 정하는 숫자 (기본값: 1페이지)
    - limit: 한 번에 몇 개의 정보를 가져올지 정하는 숫자 (기본값: 100개)
    
    반환값: 해당 지역의 경매 정보가 담긴 데이터를 돌려줍니다
    """
    
    # API 주소를 만들어요 (마치 편지를 보낼 주소를 적는 것처럼)
    base_url = "https://map.auctionmsg.com/server/api/"
    
    # 요청할 때 함께 보낼 정보들을 정리해요
    # 사용자가 원하는 조건에 맞게 설정했어요
    params = {
        'c': 'Auction',                    # 경매 관련 정보를 요청
        'm': 'getAuctionList',            # 경매 목록을 가져오라는 명령
        'page': page,                     # 몇 번째 페이지를 볼지
        'limit': limit,                   # 몇 개씩 가져올지
        'keyword': '',                    # 검색어 (빈 문자열 = 모든 것)
        'minprice': '0,6',               # 최소 가격 범위 (0억~6억) - 사용자 요청
        'auctioncount': '0,10',          # 경매 횟수 (0회~10회)
        'maemuls': '',                   # 매물 종류 (빈 문자열 = 모든 종류)
        'order': 'score',                # 정렬 방식 (점수순)
        'status': '매각기일',             # 경매 상태 (매각기일인 것만)
        's3_region1_code': region_code,  # 지역1 코드 (사용자가 원하는 지역)
        's3_region2_code': '',           # 지역2 코드 (빈 문자열 = 모든 지역)
        'onlynew': 'false'               # 신규만 보기 (false = 모든 것)
    }
    
    try:
        # 인터넷에 정보를 요청해요 (마치 전화로 정보를 물어보는 것처럼)
        print(f"🔍 {region_name} 지역의 경매 정보를 가져오고 있습니다...")
        response = requests.get(base_url, params=params, timeout=30)
        
        # 요청이 성공했는지 확인해요
        # 상태 코드 200은 "성공"이라는 뜻이에요
        if response.status_code == 200:
            print(f"✅ {region_name} 지역 정보를 성공적으로 가져왔습니다!")
            
            # JSON 형태로 데이터를 변환해요
            # 이것은 받은 정보를 우리가 쉽게 읽을 수 있는 형태로 바꾸는 거예요
            data = response.json()
            return data
        else:
            print(f"❌ {region_name} 지역 데이터 가져오기 실패: 상태 코드 {response.status_code}")
            return None
            
    except requests.exceptions.Timeout:
        # 너무 오래 기다려서 시간이 초과된 경우
        print(f"⏰ {region_name} 지역 데이터 요청이 시간 초과되었습니다. 다시 시도해보세요.")
        return None
    except requests.exceptions.RequestException as e:
        # 인터넷 연결이나 기타 문제가 생긴 경우
        print(f"🌐 {region_name} 지역 데이터 요청 중 인터넷 연결에 문제가 있습니다: {e}")
        return None

def filter_auction_data(data, target_regions, target_property_types, max_price):
    """
    가져온 데이터를 사용자가 원하는 조건으로 필터링하는 함수
    
    매개변수 설명:
    - data: 필터링할 원본 데이터
    - target_regions: 원하는 지역 목록 (예: ['서울시', '경기도'])
    - target_property_types: 원하는 매물 종류 목록
    - max_price: 최대 가격 (원 단위)
    
    반환값: 조건에 맞는 데이터만 골라낸 결과
    """
    
    if not data or 'data' not in data:
        return {'data': []}
    
    filtered_items = []
    original_items = data['data']
    
    print(f"🔧 데이터 필터링 시작 (원본: {len(original_items)}개)")
    
    for item in original_items:
        # 1. 지역 필터링
        region = item.get('region', '')
        if region not in target_regions:
            continue
        
        # 2. 가격 필터링 (6억 미만)
        minprice = item.get('minprice', 0)
        if minprice >= max_price:
            continue
        
        # 3. 매물 종류 필터링
        maemulinfo = item.get('maemulinfo', '')
        
        # 매물 종류가 우리가 원하는 것 중 하나인지 확인
        is_target_type = False
        for prop_type in target_property_types:
            if prop_type in maemulinfo:
                is_target_type = True
                break
        
        if not is_target_type:
            continue
        
        # 모든 조건을 만족하면 결과에 추가
        filtered_items.append(item)
    
    print(f"✅ 필터링 완료: {len(filtered_items)}개가 조건에 맞습니다")
    
    return {'data': filtered_items}

def get_combined_auction_data():
    """
    서울과 경기도의 경매 정보를 모두 가져와서 합치는 함수
    사용자가 원하는 조건에 맞는 데이터만 반환합니다
    """
    
    print("🏠 사용자 맞춤 경매 정보 수집을 시작합니다!")
    print("📋 검색 조건:")
    print("   - 지역: 서울, 경기도")
    print("   - 가격대: 0~6억 미만")
    print("   - 매물 종류: 아파트, 오피스텔, 단독주택, 다가구주택")
    print("-" * 50)
    
    # 사용자가 원하는 조건 설정
    target_regions = ['서울시', '경기도']  # 원하는 지역
    target_property_types = ['아파트', '오피스텔', '단독주택', '다가구주택']  # 원하는 매물 종류
    max_price = 600000000  # 6억원
    
    all_data = []  # 모든 지역의 데이터를 담을 리스트
    
    # 1. 서울 데이터 가져오기 (지역코드: 11) - 여러 페이지
    for page in range(1, 3):  # 1페이지부터 2페이지까지
        print(f"🔍 서울 지역 {page}페이지 데이터 수집 중...")
        seoul_data = get_auction_data_by_region('11', f'서울 {page}페이지', page=page, limit=100)
        if seoul_data and 'data' in seoul_data and seoul_data['data']:
            all_data.extend(seoul_data['data'])
            print(f"✅ 서울 {page}페이지 데이터 {len(seoul_data['data'])}건 추가")
        else:
            print(f"⚠️ 서울 {page}페이지 데이터가 없거나 오류 발생")
            break  # 데이터가 없으면 더 이상 페이지를 가져오지 않음
    
    # 2. 경기도 데이터 가져오기 (지역코드: 41) - 여러 페이지
    for page in range(1, 3):  # 1페이지부터 2페이지까지
        print(f"🔍 경기도 지역 {page}페이지 데이터 수집 중...")
        gyeonggi_data = get_auction_data_by_region('41', f'경기도 {page}페이지', page=page, limit=100)
        if gyeonggi_data and 'data' in gyeonggi_data and gyeonggi_data['data']:
            all_data.extend(gyeonggi_data['data'])
            print(f"✅ 경기도 {page}페이지 데이터 {len(gyeonggi_data['data'])}건 추가")
        else:
            print(f"⚠️ 경기도 {page}페이지 데이터가 없거나 오류 발생")
            break  # 데이터가 없으면 더 이상 페이지를 가져오지 않음
    
    # 3. 합친 데이터를 올바른 형태로 만들기
    combined_data = {'data': all_data}
    
    print(f"\n📊 총 {len(all_data)}개의 데이터를 수집했습니다")
    
    # 4. 사용자 조건에 맞게 필터링하기
    filtered_data = filter_auction_data(
        combined_data, 
        target_regions, 
        target_property_types, 
        max_price
    )
    
    return filtered_data

def save_to_json(data, filename=None):
    """
    받은 데이터를 JSON 파일로 저장하는 함수
    
    매개변수 설명:
    - data: 저장할 데이터 (경매 정보들)
    - filename: 저장할 파일 이름 (없으면 자동으로 만들어줘요)
    
    반환값: 저장 성공 여부를 True/False로 알려줍니다
    """
    
    # 파일 이름이 없으면 현재 날짜와 시간으로 만들어요
    if filename is None:
        # 현재 시간을 "2025-06-04_14-30-25" 형태로 만들어요
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"custom_auction_data_{timestamp}.json"
    
    try:
        # 'data' 폴더가 없으면 만들어요 (정리를 위해서)
        os.makedirs('data', exist_ok=True)
        
        # 파일 경로를 완성해요
        filepath = os.path.join('data', filename)
        
        # 검색 조건 정보도 함께 저장해요
        save_data = {
            'search_conditions': {
                'regions': ['서울시', '경기도'],
                'price_range': '0~6억 미만',
                'property_types': ['아파트', '오피스텔', '단독주택', '다가구주택'],
                'collected_at': datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            'data': data.get('data', [])
        }
        
        # 파일을 열고 데이터를 저장해요
        # ensure_ascii=False는 한글이 깨지지 않게 하는 설정이에요
        # indent=2는 보기 좋게 들여쓰기를 해주는 설정이에요
        with open(filepath, 'w', encoding='utf-8') as file:
            json.dump(save_data, file, ensure_ascii=False, indent=2)
        
        print(f"💾 파일이 성공적으로 저장되었습니다: {filepath}")
        return True
        
    except Exception as e:
        print(f"❌ 파일 저장 중 오류가 발생했습니다: {e}")
        return False

def analyze_auction_data(data):
    """
    가져온 경매 데이터를 분석해서 요약 정보를 보여주는 함수
    
    매개변수 설명:
    - data: 분석할 경매 데이터
    
    이 함수는 데이터의 내용을 쉽게 이해할 수 있도록 요약해서 보여줘요
    """
    
    if not data or 'data' not in data:
        print("❌ 분석할 데이터가 없습니다.")
        return
    
    auction_list = data['data']
    
    print("\n" + "="*50)
    print("📊 맞춤형 경매 데이터 분석 결과")
    print("="*50)
    
    # 전체 개수
    print(f"🏠 조건에 맞는 경매 물건 개수: {len(auction_list)}개")
    
    if len(auction_list) > 0:
        # 가격 정보 분석
        min_prices = [item.get('minprice', 0) for item in auction_list if item.get('minprice')]
        if min_prices:
            print(f"💰 최저 경매가: {min(min_prices):,}원")
            print(f"💰 최고 경매가: {max(min_prices):,}원")
            print(f"💰 평균 경매가: {sum(min_prices)//len(min_prices):,}원")
        
        # 지역별 분포 (상세)
        regions = {}
        for item in auction_list:
            region = item.get('region', '알 수 없음')
            subregion = item.get('subregion', '')
            full_region = f"{region} {subregion}".strip()
            regions[full_region] = regions.get(full_region, 0) + 1
        
        print(f"\n🗺️  상세 지역별 분포:")
        for region, count in sorted(regions.items()):
            print(f"   - {region}: {count}개")
        
        # 매물 종류별 분포
        maemul_types = {}
        for item in auction_list:
            maemul_info = item.get('maemulinfo', '알 수 없음')
            maemul_types[maemul_info] = maemul_types.get(maemul_info, 0) + 1
        
        print(f"\n🏘️  매물 종류별 분포:")
        for maemul_type, count in sorted(maemul_types.items()):
            print(f"   - {maemul_type}: {count}개")
        
        # 가격대별 분포 (1억 단위로)
        price_ranges = {
            '1억 미만': 0,
            '1억~2억': 0,
            '2억~3억': 0,
            '3억~4억': 0,
            '4억~5억': 0,
            '5억~6억': 0
        }
        
        for item in auction_list:
            minprice = item.get('minprice', 0)
            if minprice < 100000000:
                price_ranges['1억 미만'] += 1
            elif minprice < 200000000:
                price_ranges['1억~2억'] += 1
            elif minprice < 300000000:
                price_ranges['2억~3억'] += 1
            elif minprice < 400000000:
                price_ranges['3억~4억'] += 1
            elif minprice < 500000000:
                price_ranges['4억~5억'] += 1
            else:
                price_ranges['5억~6억'] += 1
        
        print(f"\n💸 가격대별 분포:")
        for price_range, count in price_ranges.items():
            if count > 0:
                print(f"   - {price_range}: {count}개")
    else:
        print("😞 조건에 맞는 경매 물건이 없습니다.")
        print("💡 다른 조건으로 다시 검색해보세요.")

def main():
    """
    프로그램의 메인 실행 함수
    이 함수가 실행되면 모든 작업이 순서대로 진행돼요
    """
    
    print("🏠 맞춤형 부동산 경매 정보 수집 프로그램 시작!")
    print("🎯 서울·경기도 6억 미만 주거용 부동산 전문 검색")
    print("-" * 60)
    
    # 1단계: 사용자 조건에 맞는 경매 데이터 가져오기
    auction_data = get_combined_auction_data()
    
    if not auction_data or not auction_data.get('data'):
        print("😞 조건에 맞는 데이터를 찾을 수 없습니다.")
        print("💡 검색 조건을 조정해보시거나 나중에 다시 시도해보세요.")
        return
    
    # 2단계: 가져온 데이터 분석하기
    analyze_auction_data(auction_data)
    
    # 3단계: JSON 파일로 저장하기
    print("\n" + "-" * 60)
    success = save_to_json(auction_data)
    
    if success:
        print("🎉 모든 작업이 완료되었습니다!")
        print("📁 'data' 폴더에서 저장된 파일을 확인하세요.")
        print("💡 파일에는 검색 조건 정보도 함께 저장되어 있습니다.")
    else:
        print("😞 파일 저장에 실패했습니다.")

# 이 부분은 프로그램이 직접 실행될 때만 작동해요
# 다른 프로그램에서 이 파일을 가져다 쓸 때는 실행되지 않아요
if __name__ == "__main__":
    main() 