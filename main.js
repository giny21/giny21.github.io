'use strict';
var hash;
var token;

const mediaStreamConstraints = {
  audio: true,
};

const remoteAudio = document.querySelector('audio#remote');

const connect = document.querySelector('button#connect');
connect.onclick = function()
{
    let login = document.querySelector('input#login');
    let password = document.querySelector('input#password');

    let xhr = new XMLHttpRequest();
    xhr.open("POST", "https://dev-api.okayplan.com/api/user/login", true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({
        grant_type: "password",
	    client_id: "1_5zwulktz5qsc44sgc8wskgc0c884w04sco84o8c8004wko0g4o",
	    client_secret: "57xv3qels8gsg0kw80ccg4cwk08k848cc0swsgsk44owo0kw00",
	    username: login.value,
	    password: password.value
    }));
    xhr.onreadystatechange = function() {
        if(this.status == 200 && this.readyState == 4){
            let resp = JSON.parse(this.responseText);
            hash = resp.auth.userHash;
            token = resp.auth.accessToken;
            document.querySelector('div.login-form').style.display = 'none';
            document.querySelector('div.audio-controllers').style.display = 'block';
        }
    }
}

const start = document.querySelector('button#start');
start.onclick = function()
{
    var ws = new WebSocket("wss://dev-api.okayplan.com/ws/"+hash);

    var configuration = {'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }]};;
    var connection = new RTCPeerConnection(configuration);
    
    ws.onopen = function()
    {
        ws.send('{"type":"AUTHORIZATION","token":"'+token+'"}');
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
                        });
                    })
                });
            }
            else if(offer.type == "answer")
                connection.setRemoteDescription(desc);
        }
        else if(data.hasOwnProperty('authorized') && data.authorized){
            connection.createOffer().then(desc => {
                connection.setLocalDescription(desc).then(() => {
                    ws.send('{"type":"VOICE_CONNECT", "channel":"1", "msg": '+JSON.stringify(desc)+'}');
                });
            });
        }
    }

    connection.ontrack = (event) => {
        console.log(event);
        remoteAudio.srcObject = event.streams[0];
    };

    navigator.mediaDevices.getUserMedia(mediaStreamConstraints)
        .then(mediaStream => {
            mediaStream.getTracks().forEach((track) => connection.addTrack(track, mediaStream));
        });
    let myEvent = window.attachEvent || window.addEventListener;
    let chkevent = window.attachEvent ? 'onbeforeunload' : 'beforeunload'; /// make IE7, IE8 compitable
    
    myEvent(chkevent, function(e) { // For >=IE7, Chrome, Firefox
        ws.send('{"type":"VOICE_DISCONNECT", "channel":"1", "emmiter": "'+hash+'"}');
        ws.close();
        var confirmationMessage = 'Are you sure to leave the page?';
        (e || window.event).returnValue = confirmationMessage;
        return confirmationMessage;
    });
}
