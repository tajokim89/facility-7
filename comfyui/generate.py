"""
generate.py - 통합 이미지 생성 CLI

사용 예:
  python comfyui/generate.py refs                          # 전체 REF 생성
  python comfyui/generate.py refs --ids REF_HAN_SEJIN      # 특정 REF만
  python comfyui/generate.py scenes --ids S01 S03          # 특정 씬
  python comfyui/generate.py scenes --type environment     # scene_type 필터
  python comfyui/generate.py batch --variants 3            # 전체 배치 (3 variants)
  python comfyui/generate.py review --pending              # 미검수 목록
  python comfyui/generate.py review --scene S03 --accept 2 # variant 2 승인
  python comfyui/generate.py review --scene S03 --reject-all
"""

import argparse
import copy
import os
import random
import sys

# 프로젝트 루트를 경로에 추가 (어디서든 실행 가능하도록)
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from comfyui.lib.config import (
    TEMP_DIR, COMP_DIR, REF_DIR, PROMPT_DIR,
    DEFAULT_OUT_DIR, WORKFLOW_MAP,
)
from comfyui.lib.schema import (
    load_all_scenes, load_all_refs,
    infer_scene_type, normalize_weights,
)
from comfyui.lib.comfyui_client import ComfyUIClient
from comfyui.lib.ref_manager import prepare_ref_image, copy_output_as_ref, collect_output
from comfyui.lib.workflow_loader import load_workflow, inject_params
from comfyui.lib.batch_runner import resolve_execution_order
from comfyui.lib.manifest import (
    record_generation, accept_variant, reject_all, get_pending, get_status,
)
from comfyui.lib.quality import validate_image, print_report


# -- 공통 유틸 ----------------------------------------------------------------

def _make_client(args) -> ComfyUIClient:
    client = ComfyUIClient()
    connected = client.connect()
    if not connected:
        print("  WebSocket 연결 실패. 폴링 모드로 fallback.")
    return client


def _run_scene(scene: dict, client: ComfyUIClient, seed: int,
               out_dir: str, dest_dir: str, variant_idx: int = 0,
               chain_output: str | None = None) -> str | None:
    """씬 하나를 생성하고 로컬 경로 반환."""
    scene_id = scene["id"]
    scene_type = scene.get("scene_type") or infer_scene_type(scene)
    source = scene.get("_source", "unknown")
    style_w, comp_w = normalize_weights(scene, scene_type)
    prefix = f"{out_dir}/{source}_{scene_id}_{seed}"

    wf = copy.deepcopy(load_workflow(scene_type))

    # 레퍼런스 결정
    if chain_output and (scene.get("use_prev_output") or scene.get("chain_from")):
        alias = f"_chain_{scene_id}_v{variant_idx}.png"
        ref_file = copy_output_as_ref(chain_output, alias)
    else:
        ref_path = scene.get("style_ref", "")
        ref_file = prepare_ref_image(ref_path) if ref_path else None

    wf = inject_params(wf, scene, seed=seed, style_weight=style_w,
                       comp_weight=comp_w, ref_file=ref_file, prefix=prefix)

    try:
        resp = client.queue_prompt(wf)
        prompt_id = resp.get("prompt_id", "")
        print(f"  queued prompt_id={prompt_id}")
        if prompt_id:
            client.wait_for_prompt(prompt_id)
        local_path = collect_output(prefix, scene_id, dest_dir)
        if local_path:
            record_generation(scene_id, seed=seed, path=local_path,
                              workflow=scene_type, variant_idx=variant_idx)
            # 품질 자동 체크
            issues = validate_image(local_path)
            if issues:
                print(f"  [품질 경고] {scene_id}:")
                for issue in issues:
                    print(f"    - {issue}")
        return local_path
    except Exception as e:
        print(f"  실패 [{scene_id}]: {e}")
        return None


# -- refs 서브커맨드 ----------------------------------------------------------

def cmd_refs(args):
    refs = load_all_refs(PROMPT_DIR)
    if args.ids:
        refs = [r for r in refs if r.get("id") in args.ids]
    if not refs:
        print("REF 항목이 없습니다.")
        return

    os.makedirs(REF_DIR, exist_ok=True)
    client = _make_client(args)

    print(f"=== REF 생성 | {len(refs)}개 ===\n")
    for i, ref in enumerate(refs):
        ref_id = ref["id"]
        seed = random.randint(1, 1125899906842624)
        prefix = f"REF_GEN_{ref_id}"
        print(f"[{i+1}/{len(refs)}] {ref_id}")

        wf = copy.deepcopy(load_workflow("reference"))
        wf = inject_params(wf, ref, seed=seed, style_weight=0.0,
                           comp_weight=0.0, ref_file=None, prefix=prefix)
        try:
            resp = client.queue_prompt(wf)
            prompt_id = resp.get("prompt_id", "")
            if prompt_id:
                client.wait_for_prompt(prompt_id)
            local = collect_output(prefix, ref_id, REF_DIR)
            if local:
                # REF는 {ref_id}.png 고정명으로 저장 (씬에서 참조 시 일치)
                import shutil
                fixed_path = os.path.join(REF_DIR, f"{ref_id}.png")
                shutil.copy2(local, fixed_path)
                if local != fixed_path:
                    os.remove(local)
                print(f"  -> {fixed_path}")
                issues = validate_image(fixed_path)
                if issues:
                    print(f"  [품질 경고]:")
                    for issue in issues:
                        print(f"    - {issue}")
        except Exception as e:
            print(f"  실패: {e}")

    print(f"\n완료: {len(refs)}개 REF 큐잉.")


# -- scenes 서브커맨드 --------------------------------------------------------

def cmd_scenes(args):
    scenes = load_all_scenes(PROMPT_DIR, filter_ids=args.ids, exclude_chain=False)
    # is_reference 제외
    scenes = [s for s in scenes if s.get("scene_type") != "reference"]
    if args.type:
        scenes = [s for s in scenes if s.get("scene_type") == args.type]
    if not scenes:
        print("씬이 없습니다.")
        return

    os.makedirs(TEMP_DIR, exist_ok=True)
    client = _make_client(args)

    print(f"=== 씬 생성 | {len(scenes)}개 | fixed={args.fixed} ===\n")
    results = {}
    for i, scene in enumerate(scenes):
        scene_id = scene["id"]
        seed = scene.get("seed", 0) if args.fixed else random.randint(1, 1125899906842624)
        parent_id = scene.get("depends_on") or scene.get("chain_from")
        chain_out = results.get(parent_id) if parent_id else None
        print(f"[{i+1}/{len(scenes)}] {scene_id} ({scene.get('scene_type')})")
        local = _run_scene(scene, client, seed, args.out_dir, TEMP_DIR,
                           chain_output=chain_out)
        if local:
            results[scene_id] = local
            print(f"  -> {local}")

    print(f"\n완료: {len(results)}/{len(scenes)}개 생성.")


# -- batch 서브커맨드 ---------------------------------------------------------

def cmd_batch(args):
    scenes = load_all_scenes(PROMPT_DIR, exclude_chain=False)
    scenes = [s for s in scenes if s.get("scene_type") != "reference"]

    # --chapter 필터 (파일명 기반: chapter_01 → _source에 '01' 포함)
    if args.chapter:
        ch_str = str(args.chapter).zfill(2)
        scenes = [s for s in scenes if ch_str in s.get("_source", "")]

    if not scenes:
        print("씬이 없습니다.")
        return

    try:
        ordered = resolve_execution_order(scenes)
    except ValueError as e:
        print(f"의존성 오류: {e}")
        return

    os.makedirs(TEMP_DIR, exist_ok=True)
    client = _make_client(args)

    total = len(ordered) * args.variants
    print(f"=== 배치 생성 | {len(ordered)}씬 × {args.variants}variant = {total}회 ===")
    type_counts = {}
    for s in ordered:
        t = s.get("scene_type", "?")
        type_counts[t] = type_counts.get(t, 0) + 1
    for t, n in sorted(type_counts.items()):
        print(f"  {t}: {n}개")
    print()

    outputs = {}  # scene_id → 마지막 생성 경로 (체이닝용)
    done = 0
    for scene in ordered:
        scene_id = scene["id"]
        parent_id = scene.get("depends_on") or scene.get("chain_from")
        chain_out = outputs.get(parent_id) if parent_id else None

        for v in range(args.variants):
            seed = scene.get("seed", 0) if args.fixed else random.randint(1, 1125899906842624)
            print(f"[{done+1}/{total}] {scene_id} v{v+1}/{args.variants} ({scene.get('scene_type')})")
            local = _run_scene(scene, client, seed, args.out_dir, TEMP_DIR,
                               variant_idx=v, chain_output=chain_out)
            if local:
                outputs[scene_id] = local
                print(f"  -> {local}")
            done += 1

    print(f"\n완료: {len(outputs)}/{len(ordered)}씬 생성.")


# -- review 서브커맨드 --------------------------------------------------------

def cmd_review(args):
    if args.pending:
        pending = get_pending()
        if not pending:
            print("미검수 항목 없음.")
            return
        print(f"=== 미검수 목록 ({len(pending)}개) ===")
        for p in pending:
            print(f"  [{p['scene_id']}] variant {p['idx']} | seed={p['seed']} | {p['path']}")
        return

    if args.scene:
        if args.accept is not None:
            dest = accept_variant(args.scene, args.accept)
            if dest:
                print(f"승인 완료: {dest}")
                issues = validate_image(dest)
                if issues:
                    print("품질 경고:")
                    for issue in issues:
                        print(f"  - {issue}")
        elif args.reject_all:
            reject_all(args.scene)
        else:
            # 상태 조회
            variants = get_status(args.scene)
            if not variants:
                print(f"{args.scene}: 기록 없음")
            else:
                print(f"=== {args.scene} variants ===")
                for v in variants:
                    print(f"  idx={v['idx']} | status={v['status']} | seed={v['seed']}")
                    print(f"    path: {v.get('path','')}")
        return

    print("옵션을 지정하세요: --pending | --scene SCENE_ID [--accept N | --reject-all]")


# -- 메인 ----------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="ComfyUI 통합 이미지 생성 CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--out_dir", default=DEFAULT_OUT_DIR,
                        help="ComfyUI output 하위 폴더명 (기본: facility-7)")
    parser.add_argument("--fixed", action="store_true", help="JSON seed 고정 사용")

    sub = parser.add_subparsers(dest="command", required=True)

    # refs
    p_refs = sub.add_parser("refs", help="레퍼런스 이미지 생성")
    p_refs.add_argument("--ids", nargs="+", help="생성할 REF ID 목록")

    # scenes
    p_scenes = sub.add_parser("scenes", help="개별 씬 생성")
    p_scenes.add_argument("--ids", nargs="+", help="생성할 씬 ID 목록")
    p_scenes.add_argument("--type", dest="type",
                          choices=list(WORKFLOW_MAP.keys()),
                          help="scene_type 필터")

    # batch
    p_batch = sub.add_parser("batch", help="전체 배치 생성 (우선순위+의존성 순서)")
    p_batch.add_argument("--chapter", type=int, help="챕터 번호 필터 (예: 1)")
    p_batch.add_argument("--variants", type=int, default=1,
                         help="씬당 생성 variant 수 (기본: 1)")
    p_batch.add_argument("--parallel", type=int, default=1,
                         help="병렬 실행 수 (현재 예약, 기본: 1)")

    # review
    p_review = sub.add_parser("review", help="생성 결과 검수")
    p_review.add_argument("--pending", action="store_true", help="미검수 목록 출력")
    p_review.add_argument("--scene", help="검수할 씬 ID")
    p_review.add_argument("--accept", type=int, metavar="N", help="variant N 승인")
    p_review.add_argument("--reject-all", dest="reject_all", action="store_true",
                          help="모든 variant 거부")

    args = parser.parse_args()

    dispatch = {
        "refs":   cmd_refs,
        "scenes": cmd_scenes,
        "batch":  cmd_batch,
        "review": cmd_review,
    }
    dispatch[args.command](args)


if __name__ == "__main__":
    main()
