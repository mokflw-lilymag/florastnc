왜 이전에 99개였나?
  Cursor가 잡아준 시트 "미리보기" 표는 대략 100행만 있어서, 헤더·열(A,B…) 행을 빼면 데이터가 99행이었습니다.
  전체 시트를 시드에 넣으려면 아래대로 하세요.

전체 반영 방법 (권장)
  1) Google Sheets에서 각 파일을 연 뒤
     파일 > 다운로드 > 쉼표로 분리된 값(.csv)
  2) 이 폴더에 덮어쓰기:
     products.csv  (상품목록 시트)
     materials.csv (자재목록 시트)
     partners.csv  (거래처 시트)
  3) 저장소 루트에서:
     npm run seed:generate-eastpole

  *.csv 가 있으면 *.md 스냅샷보다 CSV가 우선합니다.
