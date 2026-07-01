import sys
import argparse
import logging
from PIL import Image, ImageWin
import win32print
import win32gui
import win32ui
import win32con

import os
import tempfile
log_path = os.path.join(tempfile.gettempdir(), 'gdi_print_cli_log.txt')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler(log_path, encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def print_image_via_gdi(printer_name: str, image_paths: list, width_mm: float, segment_length_mm: float, margin_mm: float, offset_x_mm: float = 0.0, cutting_margin_mm: float = 0.0) -> bool:
    """이미지 객체를 프린터로 직접 출력 (GDI 방식 - 전문가용 패치)"""
    hdc_handle = None
    try:
        # Load and rotate all images
        images = []
        for path in image_paths:
            img = Image.open(path)
            if img.width > img.height:
                img = img.rotate(-90, expand=True)
            images.append(img.convert("RGB"))
            
        # Stitch images vertically
        total_img_height = sum(img.height for img in images)
        max_img_width = max(img.width for img in images)
        
        from PIL import ImageDraw
        stitched_image = Image.new("RGB", (max_img_width, total_img_height), "white")
        current_y = 0
        for i, img in enumerate(images):
            stitched_image.paste(img, (0, current_y))
            current_y += img.height
            
            # Draw a dashed folding line at the boundary (if not the last image)
            if i < len(images) - 1:
                draw = ImageDraw.Draw(stitched_image)
                dash_length = 15
                gap_length = 15
                for x in range(0, max_img_width, dash_length + gap_length):
                    draw.line([(x, current_y), (x + dash_length, current_y)], fill="black", width=2)
                    
        image = stitched_image
        
        # Calculate total paper length (content + scissors margin at tail)
        content_length_mm = segment_length_mm * len(images)
        total_length_mm = content_length_mm + max(0.0, cutting_margin_mm)
        
        # 1. 프린터 핸들 및 기본 설정 획득
        phandle = win32print.OpenPrinter(printer_name)
        pinfo = win32print.GetPrinter(phandle, 2)
        devmode = pinfo['pDevMode']
        
        # 2. 강제 커스텀 용지 설정 (핵심!)
        # 프린터의 물리적 롤러(헤드) 너비를 108mm로 가정합니다.
        # 108mm 롤 한가운데에 리본(width_mm)이 위치하려면 좌우 여백은 (108 - width_mm) / 2 가 됩니다.
        printer_physical_width_mm = 108.0
        
        # 기본 중앙 정렬 여백 (예: 38mm 리본의 경우 (108-38)/2 = 35mm)
        auto_center_margin_mm = (printer_physical_width_mm - width_mm) / 2.0
        
        # 사용자가 UI에서 추가로 미세조정한 값(offset_x_mm)을 더합니다.
        true_margin_mm = auto_center_margin_mm + offset_x_mm
        if true_margin_mm < 0: true_margin_mm = 0
        
        # 총 프린터 용지 너비는 108mm로 고정하여 드라이버가 전체 헤드를 인식하도록 합니다.
        total_width_mm = printer_physical_width_mm
        
        # 0.1mm 단위로 설정 (win32print 특성)
        devmode.PaperSize = 256  # win32con.DMPAPER_USER (256) - 사용자 정의 용지
        devmode.PaperWidth = int(total_width_mm * 10)
        devmode.PaperLength = int(total_length_mm * 10)
        
        # 고급(저속) 품질로 강제 설정
        devmode.PrintQuality = -4 # win32con.DMRES_HIGH
        
        # 드라이버에게 우리가 가로/세로/사이즈/품질을 직접 정의했음을 알림
        devmode.Fields |= win32con.DM_PAPERSIZE | win32con.DM_PAPERWIDTH | win32con.DM_PAPERLENGTH | win32con.DM_PRINTQUALITY
        
        # 드라이버에 DEVMODE 변경사항 병합 (엡손 드라이버에서 커스텀 크기를 완전히 인식하도록 강제함)
        try:
            win32print.DocumentProperties(0, phandle, printer_name, devmode, devmode, win32con.DM_IN_BUFFER | win32con.DM_OUT_BUFFER)
        except Exception as e:
            logger.warning(f"DocumentProperties 병합 실패 (무시됨): {e}")

        # 3. DC 생성 (수정된 devmode를 전달하여 드라이버 제약 우회)
        hdc_handle = win32gui.CreateDC("WINSPOOL", printer_name, devmode)
        hdc = win32ui.CreateDCFromHandle(hdc_handle)
        
        # 4. 해상도 및 물리적 픽셀 계산
        printer_dpi_x = hdc.GetDeviceCaps(88) # LOGPIXELSX
        printer_dpi_y = hdc.GetDeviceCaps(90) # LOGPIXELSY
        
        phys_margin = int(true_margin_mm * printer_dpi_x / 25.4)
        phys_width = int(width_mm * printer_dpi_x / 25.4)
        phys_content_length = int(content_length_mm * printer_dpi_y / 25.4)
        phys_length = int(total_length_mm * printer_dpi_y / 25.4)
        
        # Get offsets to adjust for unprintable areas
        offset_x = hdc.GetDeviceCaps(112) # PHYSICALOFFSETX
        offset_y = hdc.GetDeviceCaps(113) # PHYSICALOFFSETY
        
        logger.info(f"프린터: {printer_name}")
        logger.info(f"규격: {width_mm}mm x {total_length_mm}mm (콘텐츠 {content_length_mm}mm + 여백 {cutting_margin_mm}mm, Margin: {margin_mm}mm, True Margin: {true_margin_mm}mm)")
        logger.info(f"이미지 분할 수: {len(images)}")
        
        # 5. 인쇄 작업 시작
        job_name = f"RibbonPrint_{int(total_width_mm)}x{int(total_length_mm)}mm"
        hdc.StartDoc(job_name)
        hdc.StartPage()
        
        # 6. 이미지 그리기 (물리적 영역에 스케일링하여 투사)
        dib = ImageWin.Dib(image)
        
        # Calculate physical offset user requested
        user_offset_x_px = int(offset_x_mm * printer_dpi_x / 25.4)
        
        # 마진을 적용하여 이미지가 실제 리본 너비(width_mm)에만 투사되도록 제한합니다.
        draw_left = phys_margin + user_offset_x_px - offset_x
        draw_top = -offset_y
        draw_right = phys_margin + user_offset_x_px + phys_width - offset_x
        draw_bottom = phys_content_length - offset_y
        
        dib.draw(hdc.GetHandleOutput(), (draw_left, draw_top, draw_right, draw_bottom))
        
        hdc.EndPage()
        hdc.EndDoc()
        hdc.DeleteDC()
        win32print.ClosePrinter(phandle)
        
        logger.info(f"Expert Print SUCCESS: {total_width_mm}x{total_length_mm}mm on {printer_name}")
        return True
        
    except Exception as e:
        logger.error(f"이미지 GDI 출력 오류: {e}")
        if hdc_handle:
            try:
                hdc = win32ui.CreateDCFromHandle(hdc_handle)
                hdc.DeleteDC()
            except:
                pass
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="GDI Print CLI Engine")
    parser.add_argument("--printer", required=True, help="Printer Name")
    parser.add_argument("--width", type=float, required=True, help="Ribbon width in mm (excluding margin)")
    parser.add_argument("--length", type=float, required=True, help="Length in mm")
    parser.add_argument("--margin", type=float, default=0.0, help="Margin offset in mm")
    parser.add_argument("--offset-x", type=float, default=0, help="가로 이동 오프셋 (mm)")
    parser.add_argument("--cut-margin", type=float, default=0.0, help="Tail feed after print (mm) for scissors margin")
    parser.add_argument("--image", nargs='+', required=True, help="인쇄할 이미지 파일 경로 목록 (위에서 아래로 연결됨)")
    
    args = parser.parse_args()
    
    success = print_image_via_gdi(
        args.printer,
        args.image,
        args.width,
        args.length,
        args.margin,
        args.offset_x,
        args.cut_margin,
    )
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
