"""
quality.py — 이미지 품질 자동 검증 (heuristic)

PIL/Pillow가 설치되어 있을 때만 동작. 없으면 검증 스킵.
"""
import os

try:
    from PIL import Image, ImageStat
    _PIL_AVAILABLE = True
except ImportError:
    _PIL_AVAILABLE = False


# 검증 임계값
BORDER_THRESH     = 15    # 테두리 픽셀 평균 밝기 (이 이하면 검은 테두리 의심)
BRIGHTNESS_MIN    = 30    # 전체 평균 밝기 하한
BRIGHTNESS_MAX    = 240   # 전체 평균 밝기 상한
MIN_FILE_SIZE_KB  = 100   # 파일 최소 크기 (KB)


def validate_image(path: str, expected_resolution: tuple | None = None) -> list:
    """
    이미지 품질 자동 체크. 문제 목록(str) 반환. 빈 리스트면 이상 없음.
    expected_resolution: (width, height) 또는 None.
    """
    issues = []

    if not os.path.isfile(path):
        return [f"File not found: {path}"]

    # 파일 크기 체크
    size_kb = os.path.getsize(path) / 1024
    if size_kb < MIN_FILE_SIZE_KB:
        issues.append(f"File too small ({size_kb:.1f} KB < {MIN_FILE_SIZE_KB} KB) — possible generation failure")

    if not _PIL_AVAILABLE:
        return issues  # PIL 없으면 여기서 종료

    try:
        img = Image.open(path).convert("RGB")
    except Exception as e:
        return issues + [f"Cannot open image: {e}"]

    w, h = img.size

    # 해상도 체크
    if expected_resolution and (w, h) != expected_resolution:
        issues.append(f"Resolution mismatch: got {w}x{h}, expected {expected_resolution[0]}x{expected_resolution[1]}")

    # 전체 밝기 체크
    stat = ImageStat.Stat(img)
    avg_brightness = sum(stat.mean) / 3
    if avg_brightness < BRIGHTNESS_MIN:
        issues.append(f"Image too dark (avg brightness {avg_brightness:.1f} < {BRIGHTNESS_MIN})")
    elif avg_brightness > BRIGHTNESS_MAX:
        issues.append(f"Image too bright (avg brightness {avg_brightness:.1f} > {BRIGHTNESS_MAX})")

    # 검은/흰 테두리 감지 (outpaint 아티팩트)
    border_px = max(1, min(w, h) // 40)  # 2.5% 테두리
    regions = [
        img.crop((0, 0, w, border_px)),            # top
        img.crop((0, h - border_px, w, h)),        # bottom
        img.crop((0, 0, border_px, h)),            # left
        img.crop((w - border_px, 0, w, h)),        # right
    ]
    for i, region in enumerate(regions):
        region_stat = ImageStat.Stat(region)
        region_avg = sum(region_stat.mean) / 3
        if region_avg < BORDER_THRESH:
            side = ["top", "bottom", "left", "right"][i]
            issues.append(f"Dark border detected on {side} (avg {region_avg:.1f}) — possible outpaint artifact")

    return issues


def validate_batch(paths: list, expected_resolution: tuple | None = None) -> dict:
    """여러 이미지 일괄 검증. {path: [issues]} 반환."""
    return {p: validate_image(p, expected_resolution) for p in paths}


def print_report(results: dict) -> None:
    """validate_batch 결과를 출력."""
    ok = [p for p, issues in results.items() if not issues]
    bad = {p: issues for p, issues in results.items() if issues}
    print(f"Quality check: {len(ok)} OK, {len(bad)} with issues")
    for path, issues in bad.items():
        print(f"  [WARN] {os.path.basename(path)}")
        for issue in issues:
            print(f"    - {issue}")
