from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import speech_recognition as sr
import os
from transformers import AutoProcessor, MusicgenForConditionalGeneration
import scipy

@csrf_exempt
def UploadAudio(request):
    if request.method == 'POST':
        uploaded_file = request.FILES.get('audio')  # 'audio' matches the key in FormData
        
        if uploaded_file:
            # Ensure the directory exists
            save_directory = './Audio/' + uploaded_file.name.split('.')[0]
            os.makedirs(save_directory, exist_ok=True)

            # Process the uploaded file
            with open(os.path.join(save_directory, uploaded_file.name), 'wb') as destination:
                for chunk in uploaded_file.chunks():
                    destination.write(chunk)
            
            AudioToText(save_directory, uploaded_file.name)
            Generate(save_directory)
            
            return JsonResponse({'message': 'File uploaded successfully'})
        else:
            return JsonResponse({'error': 'No file uploaded'}, status=400)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    


def AudioToText(save_directory, filename):
    r = sr.Recognizer()
    with sr.AudioFile(save_directory+ "/" + filename) as source:
        # listen for the data (load audio to memory)
        audio_data = r.record(source)
        # recognize (convert from speech to text)
        text = r.recognize_google(audio_data)
        f = open(os.path.join(save_directory, "result.txt"), "a")
        f.write(text)
        f.close()

def Generate(save_directory):
    processor = AutoProcessor.from_pretrained("facebook/musicgen-small")
    model = MusicgenForConditionalGeneration.from_pretrained("facebook/musicgen-small")
    f = open(os.path.join(save_directory, "result.txt"), "r")
    text = f.read()
    inputs = processor(
        text=[text],
        padding=True,
        return_tensors="pt",
    )
    audio_values = model.generate(**inputs, do_sample=True, guidance_scale=3, max_new_tokens=256)


    sampling_rate = model.config.audio_encoder.sampling_rate
    scipy.io.wavfile.write(os.path.join(save_directory,"musicgen_out.wav"), rate=sampling_rate, data=audio_values[0, 0].numpy())