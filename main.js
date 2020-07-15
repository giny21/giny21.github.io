'use strict';

const ws = new WebSocket("ws://localhost:8082/a3f390d88e"); //e179525539
const configuration = {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]};;
const connection = new RTCPeerConnection(configuration);

ws.onopen = function()
{
    ws.send('{"type":"AUTHORIZATION","token":"YWM1MjI1YmY4M2E5YWVkY2IwZjNiN2Y4N2Y1MzU0YzViY2NhZjkwNzU4OWQyMzM3OGM0MTYyOTBhZjUzNjlhNw"}');
}

const connect = document.querySelector('button');
connect.onclick = function()
{
    connection.createOffer().then(desc => {
        connection.setLocalDescription(desc).then(() => {
            ws.send('{"type":"VOICE_CONNECT", "channel":"1", "msg": '+JSON.stringify(desc)+'}');
        });
    });
}

ws.onmessage = function(messageEvent)
{
    let data = JSON.parse(messageEvent.data);
    if(data.type == "VOICE_CONNECT"){
        let offer = data.object.msg;
        let desc = new RTCSessionDescription(offer);
        if(offer.type == "offer"){
            connection.setRemoteDescription(desc).then(() => {
                connection.createAnswer().then(aws => {
                    connection.setLocalDescription(aws).then(() => {
                        ws.send('{"type":"VOICE_CONNECT", "channel":"1", "msg": '+JSON.stringify(aws)+'}');
                        console.log(connection);
                    });
                })
            });
        }
        else if(offer.type == "answer"){
            connection.setRemoteDescription(desc);
            console.log(connection);
        }
    }
}

// On this codelab, you will be streaming only video (video: true).
const mediaStreamConstraints = {
  audio: true,
};

// Video element where stream will be placed.
const localAudio = document.querySelector('audio#local');
const remoteAudio = document.querySelector('audio#remote');

// Handles success by adding the MediaStream to the video element.
function gotLocalMediaStream(mediaStream) {
  localAudio.srcObject = mediaStream;
  mediaStream.getTracks().forEach((track) => connection.addTrack(track, mediaStream));
}

// Initializes media stream.
navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
  .then(gotLocalMediaStream);

// once remote track media arrives, show it in remote video element
connection.ontrack = (event) => {
    console.log(event);
    remoteAudio.srcObject = event.streams[0];
};
