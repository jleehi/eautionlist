# 대시보드용 데이터 처리 및 분석 함수들
# 이 파일은 수집된 경매 데이터를 대시보드에서 보여주기 좋게 가공해줍니다
# 마치 재료를 요리하기 좋게 다듬는 것과 같아요!

import json
import os
import glob
from datetime import datetime, timedelta
from collections import defaultdict

def load_latest_data():
    """
    가장 최신의 경매 데이터를 불러오는 함수
    1. 먼저 Firebase RTDB에서 데이터를 가져오려고 시도합니다
    2. 실패하면 data 폴더에서 가장 최근 파일을 찾아서 읽어옵니다
    """
    try:
        # 1. Firebase RTDB에서 데이터 가져오기 시도
        try:
            import firebase_admin
            from firebase_admin import credentials, db
            
            print("🔥 Firebase RTDB에서 데이터 가져오기 시도...")
            
            # Firebase가 이미 초기화되었는지 확인
            if not firebase_admin._apps:
                # Firebase 초기화
                if os.path.exists("serviceAccountKey.json"):
                    cred = credentials.Certificate("serviceAccountKey.json")
                    firebase_admin.initialize_app(cred, {
                        'databaseURL': "https://my-eaution-default-rtdb.asia-southeast1.firebasedatabase.app"
                    })
                    print("🔑 Firebase 초기화 완료")
                else:
                    print("⚠️ serviceAccountKey.json 파일이 없습니다. 로컬 파일에서 데이터를 가져옵니다.")
                    raise Exception("Firebase 인증 파일 없음")
            
            # Firebase RTDB에서 데이터 가져오기
            ref = db.reference('auction_data')
            firebase_data = ref.get()
            
            if firebase_data and 'data' in firebase_data and firebase_data['data']:
                print(f"✅ Firebase에서 {len(firebase_data['data'])}개의 데이터를 가져왔습니다.")
                return firebase_data
            else:
                print("⚠️ Firebase에서 데이터를 가져올 수 없습니다. 로컬 파일에서 시도합니다.")
                raise Exception("Firebase 데이터 없음")
                
        except Exception as e:
            print(f"⚠️ Firebase 접근 중 오류 발생: {e}")
            print("💾 로컬 파일에서 데이터를 가져옵니다...")
        
        # 2. 로컬 파일에서 데이터 가져오기
        # data 폴더의 모든 JSON 파일 찾기
        json_files = glob.glob("data/*.json")
        
        if not json_files:
            return None
        
        # 파일명에서 날짜가 포함된 파일들 중 최신 것 찾기
        daily_files = [f for f in json_files if 'daily_auction_data_' in f or 'custom_auction_data_' in f or 'fresh_auction_data_' in f]
        
        if not daily_files:
            # 일반 파일 중 최신 것
            latest_file = max(json_files, key=os.path.getctime)
        else:
            # 날짜별 파일 중 최신 것
            latest_file = max(daily_files, key=os.path.getctime)
        
        # 파일 읽기
        with open(latest_file, 'r', encoding='utf-8') as file:
            data = json.load(file)
            
        print(f"✅ 로컬 파일에서 {len(data['data'])}개의 데이터를 가져왔습니다: {latest_file}")
        return data
        
    except Exception as e:
        print(f"❌ 데이터 로드 중 오류: {e}")
        return None

def load_historical_data(days=30):
    """
    과거 N일간의 데이터를 모두 불러오는 함수
    시간별 트렌드 분석을 위해 사용합니다
    """
    try:
        historical_data = []
        
        # data 폴더의 모든 daily 파일 찾기
        daily_files = glob.glob("data/daily_auction_data_*.json")
        
        for file_path in daily_files:
            try:
                # 파일명에서 날짜 추출
                filename = os.path.basename(file_path)
                date_str = filename.replace('daily_auction_data_', '').replace('.json', '')
                file_date = datetime.strptime(date_str, '%Y-%m-%d')
                
                # 지정된 기간 내의 파일만 처리
                if file_date >= datetime.now() - timedelta(days=days):
                    with open(file_path, 'r', encoding='utf-8') as file:
                        data = json.load(file)
                        
                    # 날짜 정보 추가
                    data['file_date'] = date_str
                    historical_data.append(data)
                    
            except Exception as e:
                print(f"⚠️ 파일 {file_path} 처리 중 오류: {e}")
                continue
        
        # 날짜순으로 정렬
        historical_data.sort(key=lambda x: x.get('file_date', ''))
        
        return historical_data
        
    except Exception as e:
        print(f"❌ 과거 데이터 로드 중 오류: {e}")
        return []

def calculate_d_day(auction_date_str):
    """
    경매일까지 남은 일수(D-day)를 계산하는 함수
    """
    try:
        if not auction_date_str or auction_date_str == '경매일 미정':
            return '미정'
        
        # 다양한 날짜 형식 처리
        date_formats = [
            '%Y-%m-%d',
            '%Y.%m.%d',
            '%Y/%m/%d',
            '%m/%d',
            '%m.%d'
        ]
        
        auction_date = None
        for fmt in date_formats:
            try:
                if fmt in ['%m/%d', '%m.%d']:
                    # 월/일만 있는 경우 현재 연도 추가
                    current_year = datetime.now().year
                    full_date_str = f"{current_year}.{auction_date_str}" if '.' in auction_date_str else f"{current_year}/{auction_date_str}"
                    auction_date = datetime.strptime(full_date_str, f"%Y{fmt}")
                else:
                    auction_date = datetime.strptime(auction_date_str, fmt)
                break
            except ValueError:
                continue
        
        if auction_date is None:
            return '형식 오류'
        
        today = datetime.now().date()
        auction_date = auction_date.date()
        
        # D-day 계산
        diff = (auction_date - today).days
        
        if diff > 0:
            return f"D-{diff}"
        elif diff == 0:
            return "D-Day"
        else:
            return f"D+{abs(diff)}"
            
    except Exception as e:
        return '계산 오류'

def process_detailed_auction_data(data):
    """
    모든 경매건에 대한 상세 정보를 처리하는 함수
    사용자가 요청한 모든 정보를 포함합니다
    """
    if not data or 'data' not in data:
        return []
    
    detailed_data = []
    
    for item in data['data']:
        try:
            # 기본 정보 추출
            uid = item.get('uid', '정보없음')
            region = item.get('region', '알 수 없음')
            subregion = item.get('subregion', '상세지역 없음')
            full_region = f"{region} {subregion}".strip()
            
            # 주소 정보
            address = item.get('frontaddress', '') or item.get('address', '') or '주소 정보 없음'
            
            # 가격 정보
            minprice = item.get('minprice', 0)  # 경매가 (최저가)
            appraisal_price = item.get('appraisalprice', 0)  # 감정가
            
            # 감정가 대비 경매가 비율 계산
            if appraisal_price > 0:
                price_ratio = round((minprice / appraisal_price) * 100, 1)
                price_ratio_text = f"{price_ratio}%"
            else:
                price_ratio_text = "정보없음"
            
            # 유찰 횟수
            auction_count = item.get('auctioncount', 0)
            
            # 키워드 정보 (모든 키워드 정보 취합)
            keywords = []
            if item.get('maemulinfo'):
                keywords.append(item.get('maemulinfo'))
            if item.get('keywords'):
                if isinstance(item.get('keywords'), list):
                    keywords.extend(item.get('keywords'))
                else:
                    keywords.append(str(item.get('keywords')))
            if item.get('buildingtype'):
                keywords.append(item.get('buildingtype'))
            
            keywords_text = ', '.join(filter(None, keywords)) or '키워드 없음'
            
            # 관할법원명
            court_name = item.get('courtname', '') or item.get('court', '') or '법원 정보 없음'
            
            # 경매일
            auction_date = item.get('auctiondate', '') or '경매일 미정'
            
            # D-day 계산
            d_day = calculate_d_day(auction_date)
            
            # 상세 정보 객체 생성
            detailed_item = {
                'uid': uid,
                'region': region,
                'subregion': subregion,
                'full_region': full_region,
                'address': address,
                'minprice': minprice,
                'minprice_formatted': format_price_korean(minprice),
                'appraisal_price': appraisal_price,
                'appraisal_price_formatted': format_price_korean(appraisal_price),
                'price_ratio': price_ratio_text,
                'auction_count': auction_count,
                'keywords': keywords_text,
                'court_name': court_name,
                'auction_date': auction_date,
                'd_day': d_day,
                
                # 추가 유용한 정보들
                'property_type': item.get('maemulinfo', '정보없음'),
                'building_type': item.get('buildingtype', ''),
                'area': item.get('area', ''),
                'floor': item.get('floor', ''),
                'total_floor': item.get('totalfloor', ''),
                
                # 정렬 및 필터링을 위한 숫자 값들
                'minprice_num': minprice,
                'appraisal_price_num': appraisal_price,
                'auction_count_num': auction_count,
                'price_ratio_num': price_ratio if price_ratio_text != "정보없음" else 0
            }
            
            detailed_data.append(detailed_item)
            
        except Exception as e:
            print(f"⚠️ 개별 데이터 처리 중 오류: {e}")
            continue
    
    return detailed_data

def format_price_korean(price):
    """
    가격을 한국어 형태로 포맷팅하는 함수
    """
    if not price or price <= 0:
        return "정보없음"
    
    if price >= 100000000:  # 1억 이상
        eok = price // 100000000
        remainder = price % 100000000
        if remainder >= 10000000:  # 천만원 이상
            thousand = remainder // 10000000
            return f"{eok}억 {thousand}천만원"
        elif remainder >= 10000:  # 만원 이상
            man = remainder // 10000
            return f"{eok}억 {man}만원"
        else:
            return f"{eok}억원"
    elif price >= 10000000:  # 천만원 이상
        thousand = price // 10000000
        remainder = price % 10000000
        if remainder >= 10000:
            man = remainder // 10000
            return f"{thousand}천만 {man}만원"
        else:
            return f"{thousand}천만원"
    elif price >= 10000:  # 만원 이상
        man = price // 10000
        return f"{man}만원"
    else:
        return f"{price:,}원"

def analyze_by_region(data):
    """
    지역별 분석 데이터를 생성하는 함수 (subregion까지 상세 분석)
    각 지역의 매물 수, 평균 가격, 가격 범위 등을 계산합니다
    """
    if not data or 'data' not in data:
        return {}
    
    # 메인 지역별 통계
    region_stats = defaultdict(lambda: {
        'count': 0,
        'prices': [],
        'property_types': defaultdict(int),
        'avg_price': 0,
        'min_price': 0,
        'max_price': 0,
        'subregions': defaultdict(lambda: {
            'count': 0,
            'avg_price': 0,
            'min_price': 0,
            'max_price': 0,
            'prices': []
        })
    })
    
    # 각 매물별로 지역 통계 계산
    for item in data['data']:
        region = item.get('region', '알 수 없음')
        subregion = item.get('subregion', '상세지역없음')
        minprice = item.get('minprice', 0)
        maemulinfo = item.get('maemulinfo', '알 수 없음')
        
        # 메인 지역 통계
        region_stats[region]['count'] += 1
        region_stats[region]['property_types'][maemulinfo] += 1
        if minprice > 0:
            region_stats[region]['prices'].append(minprice)
        
        # 서브 지역 통계
        if subregion and subregion != '상세지역없음':
            region_stats[region]['subregions'][subregion]['count'] += 1
            if minprice > 0:
                region_stats[region]['subregions'][subregion]['prices'].append(minprice)
    
    # 평균, 최소, 최대 가격 계산
    for region in region_stats:
        # 메인 지역 계산
        prices = region_stats[region]['prices']
        if prices:
            region_stats[region]['avg_price'] = sum(prices) // len(prices)
            region_stats[region]['min_price'] = min(prices)
            region_stats[region]['max_price'] = max(prices)
        
        # 서브 지역 계산
        for subregion in region_stats[region]['subregions']:
            sub_prices = region_stats[region]['subregions'][subregion]['prices']
            if sub_prices:
                region_stats[region]['subregions'][subregion]['avg_price'] = sum(sub_prices) // len(sub_prices)
                region_stats[region]['subregions'][subregion]['min_price'] = min(sub_prices)
                region_stats[region]['subregions'][subregion]['max_price'] = max(sub_prices)
            
            # 서브 지역에서 prices 리스트 제거 (JSON 직렬화를 위해)
            del region_stats[region]['subregions'][subregion]['prices']
        
        # 딕셔너리 변환
        region_stats[region]['property_types'] = dict(region_stats[region]['property_types'])
        region_stats[region]['subregions'] = dict(region_stats[region]['subregions'])
        del region_stats[region]['prices']  # 원본 가격 리스트는 제거
    
    return dict(region_stats)

def analyze_by_price_range(data):
    """
    가격대별 분석 데이터를 생성하는 함수
    1억 단위로 세분화된 가격 분석을 제공합니다
    """
    if not data or 'data' not in data:
        return {}
    
    # 가격 범위 정의 (억 단위)
    price_ranges = {
        '1억 미만': {'min': 0, 'max': 100000000, 'count': 0, 'items': []},
        '1억~2억': {'min': 100000000, 'max': 200000000, 'count': 0, 'items': []},
        '2억~3억': {'min': 200000000, 'max': 300000000, 'count': 0, 'items': []},
        '3억~4억': {'min': 300000000, 'max': 400000000, 'count': 0, 'items': []},
        '4억~5억': {'min': 400000000, 'max': 500000000, 'count': 0, 'items': []},
        '5억~6억': {'min': 500000000, 'max': 600000000, 'count': 0, 'items': []},
        '6억 이상': {'min': 600000000, 'max': float('inf'), 'count': 0, 'items': []}
    }
    
    # 각 매물을 가격 범위별로 분류
    for item in data['data']:
        minprice = item.get('minprice', 0)
        region = item.get('region', '알 수 없음')
        subregion = item.get('subregion', '')
        maemulinfo = item.get('maemulinfo', '알 수 없음')
        
        # 해당하는 가격 범위 찾기
        for range_name, range_info in price_ranges.items():
            if range_info['min'] <= minprice < range_info['max']:
                range_info['count'] += 1
                range_info['items'].append({
                    'region': f"{region} {subregion}".strip(),
                    'property_type': maemulinfo,
                    'price': minprice,
                    'address': item.get('frontaddress', ''),
                    'uid': item.get('uid', '')
                })
                break
    
    return price_ranges

def analyze_property_types(data):
    """
    매물 종류별 분석 데이터를 생성하는 함수
    아파트, 오피스텔, 단독주택 등의 분포를 분석합니다
    """
    if not data or 'data' not in data:
        return {}
    
    property_stats = defaultdict(lambda: {
        'count': 0,
        'avg_price': 0,
        'min_price': 0,
        'max_price': 0,
        'prices': [],
        'regions': defaultdict(int)
    })
    
    # 매물별 통계 계산
    for item in data['data']:
        maemulinfo = item.get('maemulinfo', '알 수 없음')
        minprice = item.get('minprice', 0)
        region = item.get('region', '알 수 없음')
        
        property_stats[maemulinfo]['count'] += 1
        property_stats[maemulinfo]['regions'][region] += 1
        
        if minprice > 0:
            property_stats[maemulinfo]['prices'].append(minprice)
    
    # 평균, 최소, 최대 가격 계산
    for prop_type in property_stats:
        prices = property_stats[prop_type]['prices']
        if prices:
            property_stats[prop_type]['avg_price'] = sum(prices) // len(prices)
            property_stats[prop_type]['min_price'] = min(prices)
            property_stats[prop_type]['max_price'] = max(prices)
        
        # 딕셔너리 변환
        property_stats[prop_type]['regions'] = dict(property_stats[prop_type]['regions'])
        del property_stats[prop_type]['prices']
    
    return dict(property_stats)

def analyze_trends(historical_data):
    """
    시간별 트렌드 분석 데이터를 생성하는 함수
    일별 매물 수, 평균 가격 변화 등을 분석합니다
    """
    if not historical_data:
        return {}
    
    trend_data = {
        'dates': [],
        'daily_counts': [],
        'daily_avg_prices': [],
        'daily_property_types': [],
        'price_trend_by_region': defaultdict(list)
    }
    
    for data in historical_data:
        if 'data' not in data or not data['data']:
            continue
        
        date = data.get('file_date', '')
        items = data['data']
        
        trend_data['dates'].append(date)
        trend_data['daily_counts'].append(len(items))
        
        # 일별 평균 가격
        prices = [item.get('minprice', 0) for item in items if item.get('minprice', 0) > 0]
        avg_price = sum(prices) // len(prices) if prices else 0
        trend_data['daily_avg_prices'].append(avg_price)
        
        # 일별 매물 종류 분포
        property_counts = defaultdict(int)
        for item in items:
            maemulinfo = item.get('maemulinfo', '알 수 없음')
            property_counts[maemulinfo] += 1
        trend_data['daily_property_types'].append(dict(property_counts))
        
        # 지역별 가격 트렌드
        region_prices = defaultdict(list)
        for item in items:
            region = item.get('region', '알 수 없음')
            minprice = item.get('minprice', 0)
            if minprice > 0:
                region_prices[region].append(minprice)
        
        for region, prices in region_prices.items():
            avg_regional_price = sum(prices) // len(prices) if prices else 0
            trend_data['price_trend_by_region'][region].append({
                'date': date,
                'avg_price': avg_regional_price,
                'count': len(prices)
            })
    
    # defaultdict를 일반 dict로 변환
    trend_data['price_trend_by_region'] = dict(trend_data['price_trend_by_region'])
    
    return trend_data

def generate_dashboard_data():
    """
    대시보드에 필요한 모든 분석 데이터를 생성하는 메인 함수
    이 함수를 호출하면 대시보드용 JSON 파일이 생성됩니다
    """
    print("📊 대시보드 데이터 생성 시작...")
    
    try:
        # 1. 최신 데이터 로드
        latest_data = load_latest_data()
        if not latest_data:
            print("❌ 최신 데이터를 찾을 수 없습니다.")
            return False
        
        # 2. 과거 데이터 로드 (트렌드 분석용)
        historical_data = load_historical_data(30)
        
        # 3. 각종 분석 수행
        region_analysis = analyze_by_region(latest_data)
        price_analysis = analyze_by_price_range(latest_data)
        property_analysis = analyze_property_types(latest_data)
        trend_analysis = analyze_trends(historical_data)
        
        # 4. 상세 경매 데이터 처리 (모든 경매건 정보)
        detailed_auction_data = process_detailed_auction_data(latest_data)
        
        # 5. 기본 통계
        total_count = len(latest_data.get('data', []))
        prices = [item.get('minprice', 0) for item in latest_data.get('data', []) if item.get('minprice', 0) > 0]
        
        basic_stats = {
            'total_count': total_count,
            'avg_price': sum(prices) // len(prices) if prices else 0,
            'min_price': min(prices) if prices else 0,
            'max_price': max(prices) if prices else 0,
            'last_updated': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        }
        
        # 6. 모든 분석 결과를 하나로 합치기
        dashboard_data = {
            'basic_stats': basic_stats,
            'region_analysis': region_analysis,
            'price_analysis': price_analysis,
            'property_analysis': property_analysis,
            'trend_analysis': trend_analysis,
            'detailed_auction_data': detailed_auction_data,  # 새로 추가된 상세 데이터
            'raw_data_sample': latest_data.get('data', [])[:10]  # 샘플 데이터 10개 (기존 호환성)
        }
        
        # 7. JSON 파일로 저장
        dashboard_folder = 'dashboard'
        os.makedirs(dashboard_folder, exist_ok=True)
        
        dashboard_file = os.path.join(dashboard_folder, 'dashboard_data.json')
        with open(dashboard_file, 'w', encoding='utf-8') as file:
            json.dump(dashboard_data, file, ensure_ascii=False, indent=2)
        
        print(f"✅ 대시보드 데이터가 생성되었습니다: {dashboard_file}")
        print(f"📊 총 {total_count}개의 매물 데이터를 분석했습니다")
        print(f"📋 상세 정보 {len(detailed_auction_data)}개 항목이 포함되었습니다")
        
        return True
        
    except Exception as e:
        print(f"❌ 대시보드 데이터 생성 중 오류: {e}")
        return False

if __name__ == "__main__":
    # 직접 실행 시 대시보드 데이터 생성
    generate_dashboard_data() 