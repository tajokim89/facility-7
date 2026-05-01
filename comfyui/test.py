from google import genai

# 1. 아까 복사한 키를 여기에 넣으세요
client = genai.Client(api_key="AIzaSyDUfCjcbgnyGTzp1wf49qBWfaOpeUVe1K4")

def make_image(prompt_text):
    print("이미지 생성 시작...")
    # 나노 바나나 2 (Gemini 3.1 Flash Image) 호출
    response = client.models.generate_content(
        model="gemini-3.1-flash-image-preview",
        contents=[prompt_text]
    )

    # 결과 저장
    for part in response.candidates[0].content.parts:
        if part.inline_data:
            with open("test_result.png", "wb") as f:
                f.write(part.inline_data.data)
            print("성공! 'test_result.png' 파일이 생성되었습니다.")

# 테스트 실행
make_image("A cute parrot wearing a tiny hoodie, digital art style")