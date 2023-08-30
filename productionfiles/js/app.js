//webkitURL is deprecated but nevertheless
URL = window.URL || window.webkitURL;

var gumStream; 						//stream from getUserMedia()
var rec; 							//Recorder.js object
var input; 							//MediaStreamAudioSourceNode we'll be recording

// shim for AudioContext when it's not avb. 
var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioContext //audio context to help us record

let meterRefresh = null;
let durationRefresh = null;

let startTime, endTime;

function millisToMinutesAndSeconds(millis) {
	var minutes = Math.floor(millis / 60000);
	var seconds = ((millis % 60000) / 1000).toFixed(0);
	return (minutes < 10 ? '0' : '') + minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

function handleMeter(stream) {
	const soundMeter = window.soundMeter = new SoundMeter(window.audioContext);
	soundMeter.connectToSource(stream, function (e) {
		if (e) {
			alert(e);
			return;
		}
		meterRefresh = setInterval(() => {
			const percent = soundMeter.instant * 50 + 35 + '%';
			circle_outline.style.width = percent;
			circle_outline.style.height = percent;
		}, 50);
		durationRefresh = setInterval(() => {
			endTime = new Date().getTime();
			duration.innerHTML = millisToMinutesAndSeconds(endTime - startTime);
		}, 1000);
	});
}

function getUserMedia() {
	var constraints = { audio: true, video: false }

	navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
		window.stream = stream;
	}).catch(e => {
		duration.innerHTML = "Please enable your microphone";
	})
}
getUserMedia();

function startRecording() {
	if (window.stream) {
		window.recording_started = true;
		duration.innerHTML = "00:00";
		startTime = new Date().getTime();

		audioContext = new AudioContext();

		handleMeter(stream);
		gumStream = stream;

		/* use the stream */
		input = audioContext.createMediaStreamSource(stream);


		/* 
			Create the Recorder object and configure to record mono sound (1 channel)
			Recording 2 channels  will double the file size
		*/
		rec = new Recorder(input, { numChannels: 1 })

		//start the recording process
		rec.record()

		console.log("Recording started");
	}
}

function stopRecording() {
	if (window.stream && window.recording_started) {
		window.recording_started = false;
		clearInterval(durationRefresh);
		clearInterval(meterRefresh);

		circle_outline.style.width = '29%';
		circle_outline.style.height = '29%';
		rec.stop();

		//stop microphone access
		// gumStream.getAudioTracks()[0].stop();

		//create the wav blob and pass it on to createDownloadLink
		rec.exportWAV(downloadWav);
	}
}

function downloadWav(blob) {
	console.log(blob);
	var d = new Date(startTime);
	var file_name = `Recording__${d.getFullYear()}_${d.getMonth() + 1}_${d.getDate()}__${d.getHours()}_${d.getMinutes()}_${d.getSeconds()}.wav`;

	const formData = new FormData();
	formData.append('audio', blob, file_name);
	formData.append('csrfmiddlewaretoken', csrfToken);

	$.ajax({
		url: '/upload_audio/',  
		method: 'POST',
		data: formData,
		processData: false,
		contentType: false,
		success: function(data) {
		  console.log('Audio uploaded:', data);
		},
		error: function(error) {
		  console.error('Error uploading audio:', error);
		}
	  });
}

circle.onmousedown = startRecording;
document.body.onmouseup = circle.onmouseup = stopRecording;