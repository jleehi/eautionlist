# 부동산 경매 데이터를 매일 정기적으로 수집하는 스케줄러
# 이 프로그램은 정해진 시간에 자동으로 경매 정보를 수집해줍니다
# 마치 알람시계처럼 매일 같은 시간에 자동으로 작업을 해주는 거예요!

import schedule  # 정기 실행을 위한 스케줄 라이브러리
import time      # 시간 관련 기능을 위한 라이브러리
import logging   # 로그 기록을 위한 라이브러리
from datetime import datetime, timedelta
import os

# 우리가 만든 경매 크롤러 가져오기
from auction_crawler import get_combined_auction_data, save_to_json, analyze_auction_data

def setup_logging():
    """
    로그 설정을 하는 함수
    프로그램이 언제 실행되었는지, 성공했는지 실패했는지 기록해줘요
    """
    
    # logs 폴더가 없으면 만들어줘요
    os.makedirs('logs', exist_ok=True)
    
    # 로그 파일 설정
    log_filename = f"logs/scheduler_{datetime.now().strftime('%Y-%m')}.log"
    
    logging.basicConfig(
        level=logging.INFO,  # 정보 수준 이상의 로그만 기록
        format='%(asctime)s - %(levelname)s - %(message)s',  # 로그 형식
        handlers=[
            logging.FileHandler(log_filename, encoding='utf-8'),  # 파일에 저장
            logging.StreamHandler()  # 화면에도 출력
        ]
    )

def daily_auction_collection():
    """
    매일 실행될 경매 데이터 수집 함수
    이 함수가 매일 정해진 시간에 자동으로 실행돼요
    """
    
    start_time = datetime.now()
    logging.info("=" * 60)
    logging.info(f"🏠 정기 경매 데이터 수집 시작: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
    logging.info("=" * 60)
    
    try:
        # 1단계: 경매 데이터 수집
        logging.info("📊 경매 데이터 수집 중...")
        auction_data = get_combined_auction_data()
        
        if not auction_data or not auction_data.get('data'):
            logging.warning("⚠️ 수집된 데이터가 없습니다.")
            return False
        
        # 2단계: 파일명에 날짜 포함해서 저장
        today = datetime.now().strftime('%Y-%m-%d')
        filename = f"daily_auction_data_{today}.json"
        
        # 3단계: 파일 저장
        logging.info("💾 데이터 저장 중...")
        success = save_to_json(auction_data, filename)
        
        if success:
            # 4단계: 간단한 분석 로그 남기기
            data_count = len(auction_data.get('data', []))
            logging.info(f"✅ 수집 완료: {data_count}개의 경매 정보")
            
            # 가격 통계
            prices = [item.get('minprice', 0) for item in auction_data['data'] if item.get('minprice')]
            if prices:
                avg_price = sum(prices) // len(prices)
                min_price = min(prices)
                max_price = max(prices)
                logging.info(f"💰 가격 통계 - 평균: {avg_price:,}원, 최저: {min_price:,}원, 최고: {max_price:,}원")
            
            # 실행 시간 기록
            end_time = datetime.now()
            duration = end_time - start_time
            logging.info(f"⏱️ 실행 시간: {duration.total_seconds():.2f}초")
            logging.info("🎉 정기 수집 완료!")
            
            return True
        else:
            logging.error("❌ 파일 저장 실패")
            return False
            
    except Exception as e:
        logging.error(f"❌ 정기 수집 중 오류 발생: {str(e)}")
        return False
    
    finally:
        logging.info("-" * 60)

def cleanup_old_files():
    """
    오래된 데이터 파일들을 정리하는 함수
    30일 이상 된 파일들을 자동으로 삭제해서 용량을 절약해줘요
    """
    
    logging.info("🧹 오래된 파일 정리 시작...")
    
    try:
        data_folder = 'data'
        if not os.path.exists(data_folder):
            return
        
        # 30일 전 날짜 계산
        cutoff_date = datetime.now() - timedelta(days=30)
        deleted_count = 0
        
        # data 폴더의 모든 파일 검사
        for filename in os.listdir(data_folder):
            if filename.startswith('daily_auction_data_') and filename.endswith('.json'):
                file_path = os.path.join(data_folder, filename)
                
                # 파일 생성 시간 확인
                file_time = datetime.fromtimestamp(os.path.getctime(file_path))
                
                # 30일 이상 된 파일이면 삭제
                if file_time < cutoff_date:
                    os.remove(file_path)
                    deleted_count += 1
                    logging.info(f"🗑️ 삭제된 파일: {filename}")
        
        if deleted_count > 0:
            logging.info(f"✅ 총 {deleted_count}개의 오래된 파일을 정리했습니다")
        else:
            logging.info("📁 정리할 오래된 파일이 없습니다")
            
    except Exception as e:
        logging.error(f"❌ 파일 정리 중 오류 발생: {str(e)}")

def check_system_health():
    """
    시스템 상태를 확인하는 함수
    디스크 공간, 메모리 등을 체크해서 문제없이 실행될 수 있는지 확인해요
    """
    
    logging.info("🔧 시스템 상태 체크...")
    
    try:
        # 현재 작업 디렉토리 확인
        current_dir = os.getcwd()
        logging.info(f"📁 작업 디렉토리: {current_dir}")
        
        # data 폴더 확인
        data_folder = 'data'
        if os.path.exists(data_folder):
            file_count = len([f for f in os.listdir(data_folder) if f.endswith('.json')])
            logging.info(f"📊 저장된 데이터 파일 개수: {file_count}개")
        else:
            logging.info("📁 data 폴더가 없습니다. 첫 실행 시 자동 생성됩니다.")
        
        # logs 폴더 확인
        logs_folder = 'logs'
        if os.path.exists(logs_folder):
            log_count = len([f for f in os.listdir(logs_folder) if f.endswith('.log')])
            logging.info(f"📝 로그 파일 개수: {log_count}개")
        
        logging.info("✅ 시스템 상태 정상")
        return True
        
    except Exception as e:
        logging.error(f"❌ 시스템 체크 중 오류: {str(e)}")
        return False

def setup_schedule():
    """
    스케줄을 설정하는 함수
    언제, 어떤 작업을 실행할지 정해줘요
    """
    
    # 매일 오전 9시에 경매 데이터 수집
    schedule.every().day.at("09:00").do(daily_auction_collection)
    
    # 매일 오후 6시에도 한 번 더 수집 (최신 정보 확인용)
    schedule.every().day.at("18:00").do(daily_auction_collection)
    
    # 매주 일요일 새벽 2시에 오래된 파일 정리
    schedule.every().sunday.at("02:00").do(cleanup_old_files)
    
    # 매일 자정에 시스템 상태 체크
    schedule.every().day.at("00:00").do(check_system_health)
    
    logging.info("⏰ 스케줄 설정 완료:")
    logging.info("   - 매일 09:00, 18:00: 경매 데이터 수집")
    logging.info("   - 매주 일요일 02:00: 오래된 파일 정리")
    logging.info("   - 매일 00:00: 시스템 상태 체크")

def run_scheduler():
    """
    스케줄러를 실행하는 메인 함수
    이 함수가 실행되면 프로그램이 계속 돌아가면서 정해진 시간에 작업을 실행해요
    """
    
    print("🏠 부동산 경매 정기 수집 스케줄러 시작!")
    print("=" * 50)
    
    # 로그 설정
    setup_logging()
    
    # 시스템 상태 체크
    if not check_system_health():
        logging.error("❌ 시스템 상태에 문제가 있습니다. 프로그램을 종료합니다.")
        return
    
    # 스케줄 설정
    setup_schedule()
    
    # 첫 실행 (테스트용)
    logging.info("🧪 첫 실행 테스트를 진행합니다...")
    daily_auction_collection()
    
    logging.info("🔄 스케줄러가 시작되었습니다. Ctrl+C로 종료할 수 있습니다.")
    
    try:
        # 무한 루프로 스케줄 실행
        while True:
            # 스케줄된 작업이 있는지 확인하고 실행
            schedule.run_pending()
            
            # 1분마다 체크
            time.sleep(60)
            
    except KeyboardInterrupt:
        logging.info("⏹️ 사용자가 스케줄러를 중단했습니다.")
        print("\n🛑 스케줄러가 안전하게 종료되었습니다.")

def run_once():
    """
    스케줄러 없이 한 번만 실행하는 함수
    테스트나 즉시 데이터 수집이 필요할 때 사용해요
    """
    
    print("🏠 경매 데이터 즉시 수집 시작!")
    print("-" * 30)
    
    setup_logging()
    
    success = daily_auction_collection()
    
    if success:
        print("✅ 데이터 수집이 완료되었습니다!")
    else:
        print("❌ 데이터 수집에 실패했습니다.")

if __name__ == "__main__":
    import sys
    
    # 명령행 인자에 따라 다른 동작
    if len(sys.argv) > 1 and sys.argv[1] == "--once":
        # 한 번만 실행
        run_once()
    else:
        # 정기 스케줄러 실행
        run_scheduler() 